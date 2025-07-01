#!/usr/bin/env python3
"""
Backend API pour Notion Clipper Pro - Version 100% Locale Optimisée
Sans webhooks externes, avec polling intelligent et cache avancé
"""

import os
import sys
import io
import json
import time
import base64
import hashlib
import threading
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Set
from dataclasses import dataclass, asdict
from collections import OrderedDict
import gzip
import pickle
from queue import Queue
from pathlib import Path

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from notion_client import Client
from dotenv import load_dotenv
import requests
from PIL import Image
import pyperclip
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

try:
    from backend.config import SecureConfig, MAX_CLIPBOARD_LENGTH, CACHE_DURATION, SMART_POLL_INTERVAL
    from backend.cache import NotionCache
    from backend.utils import get_clipboard_content, detect_content_type
except ImportError:
    print("⚠️ Modules backend non trouvés, utilisation du code intégré")
    # Inclure le code directement ici temporairement

# Configuration
load_dotenv()
app = Flask(__name__)
CORS(app)

# Constants et variables globales
secure_config = SecureConfig()
APP_DIR = secure_config.app_dir
CACHE_FILE = APP_DIR / "notion_cache.json"
DELTA_FILE = APP_DIR / "notion_delta.json"
PREFERENCES_FILE = APP_DIR / "notion_preferences.json"
CONFIG_FILE = APP_DIR / "notion_config.json"
ONBOARDING_FILE = APP_DIR / "notion_onboarding.json"
MAX_PAGES_PER_REQUEST = 100

notion = None
notion_token = None
imgbb_key = None
last_check_time = 0
changes_queue = Queue()
polling_thread = None

# Stats pour optimisation
stats = {
    "api_calls": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "last_full_sync": None,
    "changes_detected": 0,
    "first_run": True
}

# Utilisation du cache refactorisé
smart_cache = NotionCache(APP_DIR)

class SmartPoller:
    """Polling intelligent qui détecte les changements."""
    
    def __init__(self):
        self.running = False
        self.last_full_sync = 0
        self.quick_check_interval = 30  # 30 secondes pour check rapide
        self.full_sync_interval = 300  # 5 minutes pour sync complète
    
    def start(self):
        """Démarre le polling intelligent."""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._poll_loop, daemon=True)
        self.thread.start()
        print("✅ Smart Polling démarré")
    
    def stop(self):
        """Arrête le polling."""
        self.running = False
    
    def _poll_loop(self):
        """Boucle de polling intelligente."""
        while self.running:
            try:
                current_time = time.time()
                
                # Check rapide : uniquement la première page pour voir s'il y a des changements
                if self._quick_check():
                    # Des changements détectés, faire une sync plus complète
                    self._incremental_sync()
                
                # Sync complète périodique
                if current_time - self.last_full_sync > self.full_sync_interval:
                    self._full_sync()
                    self.last_full_sync = current_time
                
                # Attendre avant le prochain check
                time.sleep(self.quick_check_interval)
                
            except Exception as e:
                print(f"❌ Erreur polling: {e}")
                time.sleep(60)  # Attendre 1 minute en cas d'erreur
    
    def _quick_check(self) -> bool:
        """Check rapide pour détecter s'il y a eu des changements."""
        if not notion:
            return False
        
        try:
            stats["api_calls"] += 1
            
            # Récupérer juste la page la plus récemment modifiée
            response = notion.search(
                filter={"property": "object", "value": "page"},
                page_size=1,
                sort={
                    "timestamp": "last_edited_time",
                    "direction": "descending"
                }
            )
            
            if response.get("results"):  # type: ignore
                latest_page = response["results"][0]  # type: ignore
                latest_time = latest_page.get("last_edited_time", "")  # type: ignore
                
                # Comparer avec le dernier temps connu
                cached_pages = smart_cache.get_all_pages()
                if cached_pages:
                    cached_latest = max(cached_pages, key=lambda p: p.get("last_edited", ""))
                    cached_time = cached_latest.get("last_edited", "")
                    
                    if latest_time != cached_time:
                        stats["changes_detected"] += 1
                        return True
            
            return False
            
        except Exception as e:
            print(f"Erreur quick check: {e}")
            return False
    
    def _incremental_sync(self):
        """Synchronisation incrémentale des changements récents."""
        if not notion:
            return
        
        try:
            print("🔄 Sync incrémentale...")
            changes_count = 0
            
            # Récupérer les 50 dernières pages modifiées
            stats["api_calls"] += 1
            response = notion.search(
                filter={"property": "object", "value": "page"},
                page_size=50,
                sort={
                    "timestamp": "last_edited_time",
                    "direction": "descending"
                }
            )
            
            for page_data in response.get("results", []):  # type: ignore
                processed = process_page_data(page_data)
                if smart_cache.update_page(processed):
                    changes_count += 1
                    # Notifier le changement
                    changes_queue.put({
                        "type": "page_updated",
                        "page": processed,
                        "timestamp": time.time()
                    })
            
            if changes_count > 0:
                smart_cache.save_to_disk()
                print(f"✅ {changes_count} pages mises à jour")
                
        except Exception as e:
            print(f"❌ Erreur sync incrémentale: {e}")
    
    def _full_sync(self):
        """Synchronisation complète de toutes les pages."""
        if not notion:
            return
        
        try:
            print("🔄 Sync complète...")
            all_pages = []
            cursor = None
            has_more = True
            
            while has_more and len(all_pages) < 2000:  # Limite de sécurité
                stats["api_calls"] += 1
                
                params = {
                    "filter": {"property": "object", "value": "page"},
                    "page_size": MAX_PAGES_PER_REQUEST,
                    "sort": {
                        "timestamp": "last_edited_time",
                        "direction": "descending"
                    }
                }
                if cursor:
                    params["start_cursor"] = cursor
                
                response = notion.search(**params)
                
                for page_data in response.get("results", []):  # type: ignore
                    processed = process_page_data(page_data)
                    all_pages.append(processed)
                    smart_cache.update_page(processed)
                
                has_more = response.get("has_more", False)  # type: ignore
                cursor = response.get("next_cursor")  # type: ignore
                
                # Pause pour respecter rate limit
                time.sleep(0.3)
            
            smart_cache.save_to_disk()
            stats["last_full_sync"] = datetime.now().isoformat()
            print(f"✅ Sync complète: {len(all_pages)} pages")
            
        except Exception as e:
            print(f"❌ Erreur sync complète: {e}")

# Instance globale du poller
smart_poller = SmartPoller()

def process_page_data(page_data: Dict) -> Dict:
    """Traite les données d'une page Notion."""
    return {
        "id": page_data["id"],
        "title": extract_title(page_data),
        "icon": extract_icon(page_data),
        "parent_type": page_data.get("parent", {}).get("type", "page"),
        "url": page_data.get("url"),
        "last_edited": page_data.get("last_edited_time"),
        "created_time": page_data.get("created_time")
    }

def extract_title(page_data: Dict) -> str:
    """Extrait le titre d'une page."""
    try:
        if "properties" in page_data:
            for prop_name, prop_data in page_data["properties"].items():
                if prop_data.get("type") == "title" and prop_data.get("title"):
                    return "".join([
                        text_obj.get("plain_text", "") 
                        for text_obj in prop_data["title"]
                    ]).strip() or "Page sans titre"
    except:
        pass
    return "Page sans titre"

def extract_icon(page_data: Dict) -> Optional[Any]:
    """Extrait l'icône d'une page."""
    try:
        icon = page_data.get("icon")
        if not icon:
            return None
            
        if icon["type"] == "emoji":
            return {"type": "emoji", "emoji": icon["emoji"]}
        elif icon["type"] == "external":
            return {"type": "external", "external": {"url": icon["external"]["url"]}}
        elif icon["type"] == "file":
            return {"type": "file", "file": {"url": icon["file"]["url"]}}
    except:
        pass
    return None

def load_configuration():
    """Charge la configuration depuis le stockage sécurisé."""
    global notion, notion_token, imgbb_key
    config = secure_config.load_config()
    notion_token = config.get('notionToken') or os.getenv('NOTION_TOKEN')
    imgbb_key = config.get('imgbbKey') or os.getenv('IMGBB_API_KEY')
    if notion_token:
        notion = Client(auth=notion_token)
        print(f"✅ Client Notion configuré")
        print(f"  Token: {notion_token[:10]}...")
        
        # Démarrer le polling intelligent
        smart_poller.start()

# Routes API

@app.route('/api/health')
def health_check():
    """Health check avec stats."""
    cache_pages = smart_cache.get_all_pages()
    
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "notion_connected": notion is not None,
        "imgbb_configured": imgbb_key is not None,
        "cache_stats": {
            "total_pages": len(cache_pages),
            "api_calls": stats["api_calls"],
            "cache_hits": stats["cache_hits"],
            "cache_misses": stats["cache_misses"],
            "changes_detected": stats["changes_detected"],
            "last_full_sync": stats["last_full_sync"]
        },
        "polling_active": smart_poller.running
    })

@app.route('/api/pages')
def get_pages():
    """Récupère les pages depuis le cache intelligent."""
    try:
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        if force_refresh:
            # Forcer une sync incrémentale
            smart_poller._incremental_sync()
        
        # Toujours servir depuis le cache
        pages = smart_cache.get_all_pages()
        stats["cache_hits"] += 1
        
        # Trier par date de modification
        pages.sort(key=lambda x: x.get("last_edited", ""), reverse=True)
        
        return jsonify({
            "pages": pages,
            "cached": True,
            "timestamp": time.time(),
            "count": len(pages),
            "from_cache": True,
            "stats": {
                "api_calls_saved": stats["cache_hits"],
                "changes_detected": stats["changes_detected"]
            }
        })
        
    except Exception as e:
        print(f"❌ Erreur get_pages: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/changes')
def get_changes():
    """Récupère les changements depuis un timestamp."""
    try:
        since = request.args.get('since', '0')
        timestamp = float(since)
        
        changes = smart_cache.get_changes_since(timestamp)
        
        return jsonify({
            "changes": changes,
            "count": len(changes),
            "timestamp": time.time()
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/events/stream')
def event_stream():
    """Server-Sent Events pour les changements en temps réel."""
    def generate():
        # Envoyer un ping initial
        yield f"data: {json.dumps({'type': 'connected', 'timestamp': time.time()})}\n\n"
        
        while True:
            try:
                # Attendre un changement (timeout de 30s pour garder la connexion alive)
                try:
                    change = changes_queue.get(timeout=30)
                    yield f"data: {json.dumps(change)}\n\n"
                except:
                    # Timeout, envoyer un ping
                    yield f"data: {json.dumps({'type': 'ping', 'timestamp': time.time()})}\n\n"
                    
            except GeneratorExit:
                break
            except Exception as e:
                print(f"SSE error: {e}")
                break
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/config', methods=['POST'])
def update_config():
    """Met à jour la configuration de manière sécurisée."""
    try:
        data = request.get_json()
        secure_config.save_config({
            "notionToken": data.get("notionToken", ""),
            "imgbbKey": data.get("imgbbKey", "")
        })
        load_configuration()
        
        # Vérifier si Notion est bien connecté
        notion_connected = False
        error_message = None
        
        if notion:
            try:
                # Test de connexion avec l'API Notion
                test_response = notion.users.me()
                notion_connected = True
                user_name = getattr(test_response, 'get', lambda x, d=None: None)('name', 'Unknown')
                print(f"Connexion Notion OK - User: {user_name}")
            except Exception as e:
                error_message = str(e)
                print(f"Erreur test Notion: {error_message}")
                notion_connected = False
        else:
            error_message = "Client Notion non initialisé"
        
        if notion_connected:
            # Si connecté, lancer une sync en arrière-plan
            if notion:
                threading.Thread(target=fetch_all_pages, daemon=True).start()
            
            return jsonify({
                "success": True,
                "message": "Configuration mise à jour avec succès",
                "notion_connected": True
            })
        else:
            # Si erreur, retourner les détails
            return jsonify({
                "success": False,
                "message": f"Erreur de connexion Notion: {error_message}",
                "notion_connected": False,
                "error": error_message
            }), 400
        
    except Exception as e:
        print(f"Erreur config: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "message": f"Erreur serveur: {str(e)}"
        }), 500

@app.route('/api/clipboard')
def get_clipboard():
    """Récupère le contenu du presse-papiers avec support étendu."""
    try:
        content = get_clipboard_content()
        return jsonify(content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/send', methods=['POST'])
def send_to_notion():
    """Envoie le contenu vers une page."""
    try:
        data = request.get_json()
        page_id = data.get('page_id')
        content = data.get('content')
        content_type = data.get('content_type', 'text')
        is_image = data.get('is_image', False)
        
        if not page_id or not content:
            return jsonify({"error": "page_id et content requis"}), 400
        
        if not notion:
            return jsonify({"error": "Notion non configuré"}), 400
        
        stats["api_calls"] += 1
        
        # Créer le bloc
        if is_image and content_type == 'image':
            # Upload image si configuré
            image_url = upload_image_to_imgbb(content) if imgbb_key else None
            
            if image_url:
                block = {
                    "object": "block",
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": image_url}
                    }
                }
            else:
                block = {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"[Image - {datetime.now().strftime('%d/%m/%Y %H:%M')}]"}
                        }]
                    }
                }
        else:
            block = {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": content}
                    }]
                }
            }
        
        # Envoyer à Notion
        notion.blocks.children.append(block_id=page_id, children=[block])
        
        # Invalider le cache pour cette page (forcer une mise à jour au prochain check)
        changes_queue.put({
            "type": "content_sent",
            "page_id": page_id,
            "timestamp": time.time()
        })
        
        return jsonify({
            "success": True,
            "message": "Contenu envoyé"
        })
        
    except Exception as e:
        print(f"❌ Erreur envoi: {e}")
        return jsonify({"error": str(e)}), 500

def create_block_content(content, block_type, tags=None, source_url=None):
    """Crée dynamiquement un bloc Notion selon le type et les propriétés."""
    tags = tags or []
    rich_text = [{"type": "text", "text": {"content": content}}]
    if tags:
        rich_text.append({"type": "text", "text": {"content": f"  #" + " #".join(tags)}})
    if source_url:
        rich_text.append({"type": "text", "text": {"content": f"\n🔗 {source_url}"}})
    if block_type == "heading_1":
        return {"object": "block", "type": "heading_1", "heading_1": {"rich_text": rich_text}}
    elif block_type == "heading_2":
        return {"object": "block", "type": "heading_2", "heading_2": {"rich_text": rich_text}}
    elif block_type == "bulleted_list":
        return {"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": rich_text}}
    elif block_type == "numbered_list":
        return {"object": "block", "type": "numbered_list_item", "numbered_list_item": {"rich_text": rich_text}}
    elif block_type == "toggle":
        return {"object": "block", "type": "toggle", "toggle": {"rich_text": rich_text}}
    elif block_type == "quote":
        return {"object": "block", "type": "quote", "quote": {"rich_text": rich_text}}
    elif block_type == "callout":
        return {"object": "block", "type": "callout", "callout": {"rich_text": rich_text, "icon": {"emoji": "💡"}}}
    elif block_type == "code":
        return {"object": "block", "type": "code", "code": {"rich_text": rich_text, "language": "plain text"}}
    else:
        return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": rich_text}}

def add_favorite_marker(block):
    """Ajoute un emoji favori au bloc (ex: ⭐)."""
    if "callout" in block:
        block["callout"]["icon"] = {"emoji": "⭐"}
    elif "paragraph" in block:
        if "rich_text" in block["paragraph"]:
            block["paragraph"]["rich_text"].insert(0, {"type": "text", "text": {"content": "⭐ "}})
    elif "heading_1" in block:
        block["heading_1"]["rich_text"].insert(0, {"type": "text", "text": {"content": "⭐ "}})
    elif "heading_2" in block:
        block["heading_2"]["rich_text"].insert(0, {"type": "text", "text": {"content": "⭐ "}})
    return block

@app.route('/api/send_multiple', methods=['POST'])
def send_to_multiple_pages():
    """Envoie vers plusieurs pages avec propriétés."""
    try:
        data = request.get_json()
        page_ids = data.get('page_ids', [])
        content = data.get('content')
        content_type = data.get('content_type', 'text')
        is_image = data.get('is_image', False)
        truncated = data.get('truncated', False)
        original_length = data.get('original_length', 0)
        block_type = data.get('block_type', 'paragraph')
        tags = data.get('tags', [])
        source_url = data.get('source_url', '')
        is_favorite = data.get('is_favorite', False)

        if not page_ids or not content:
            return jsonify({"error": "page_ids et content requis"}), 400

        if not notion:
            return jsonify({"error": "Notion non configuré"}), 400

        success_count = 0
        errors = []

        # Préparer le bloc une seule fois
        if is_image and content_type == 'image':
            # Vérifier si ImgBB est configuré
            if not imgbb_key:
                return jsonify({
                    "error": "Clé ImgBB non configurée",
                    "message": "Pour envoyer des images, configurez ImgBB dans les paramètres"
                }), 400

            image_url = upload_image_to_imgbb(content)

            if image_url:
                block = {
                    "object": "block",
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": image_url}
                    }
                }
            else:
                return jsonify({
                    "error": "Échec de l'upload de l'image",
                    "message": "Vérifiez votre clé ImgBB"
                }), 500
        else:
            content_text = content
            if truncated and original_length:
                content_text += f"\n\n[Texte tronqué: {original_length} → {len(content)} caractères]"
            block = create_block_content(content_text, block_type, tags=tags, source_url=source_url)
            if is_favorite:
                block = add_favorite_marker(block)

        # Envoyer vers chaque page
        for page_id in page_ids:
            try:
                stats["api_calls"] += 1
                notion.blocks.children.append(block_id=page_id, children=[block])
                success_count += 1

                # Notifier le changement
                changes_queue.put({
                    "type": "content_sent",
                    "page_id": page_id,
                    "timestamp": time.time()
                })
            except Exception as e:
                errors.append(f"Page {page_id}: {str(e)}")

        return jsonify({
            "success": True,
            "success_count": success_count,
            "total_count": len(page_ids),
            "errors": errors,
            "type": "image" if is_image else "text"
        })

    except Exception as e:
        print(f"❌ Erreur envoi multiple: {e}")
        return jsonify({"error": str(e)}), 500

def upload_image_to_imgbb(image_data: str) -> Optional[str]:
    """Upload une image vers ImgBB."""
    if not imgbb_key:
        return None
        
    try:
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
            
        url = "https://api.imgbb.com/1/upload"
        payload = {
            "key": imgbb_key,
            "image": image_data,
            "expiration": 15552000  # 6 mois
        }
        
        response = requests.post(url, data=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                return result["data"]["url"]
                
    except Exception as e:
        print(f"Erreur upload ImgBB: {e}")
        
    return None

def fetch_all_pages():
    try:
        smart_poller._full_sync()
    except Exception as e:
        print(f"Erreur lors de la synchronisation complète: {e}")

def check_first_run():
    """Vérifie si c'est la première utilisation."""
    if os.path.exists(ONBOARDING_FILE):
        try:
            with open(ONBOARDING_FILE, 'r') as f:
                data = json.load(f)
                return data.get("completed", False)
        except:
            pass
    return False

@app.route('/api/onboarding/complete', methods=['POST'])
def complete_onboarding():
    """Marque l'onboarding comme complété."""
    try:
        # Créer le fichier de marqueur
        onboarding_data = {
            "completed": True,
            "timestamp": time.time(),
            "date": datetime.now().isoformat()
        }
        
        # Utiliser le bon chemin selon l'OS
        if hasattr(sys, '_MEIPASS'):
            # App packagée
            base_path = os.path.dirname(sys.executable)
        else:
            # Développement
            base_path = os.path.dirname(os.path.abspath(__file__))
        
        onboarding_file = os.path.join(base_path, ONBOARDING_FILE)
        
        with open(onboarding_file, 'w', encoding='utf-8') as f:
            json.dump(onboarding_data, f, ensure_ascii=False, indent=2)
        
        # Mettre à jour les stats
        stats["first_run"] = False
        
        print("Onboarding marqué comme complété")
        
        return jsonify({
            "success": True,
            "message": "Onboarding complété"
        })
        
    except Exception as e:
        print(f"Erreur onboarding complete: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/clear_cache', methods=['POST'])
def clear_cache():
    """Vide le cache multi-niveaux."""
    try:
        # Vider le cache mémoire
        if 'smart_cache' in globals():
            smart_cache.pages_cache.clear()
            smart_cache.page_hashes.clear()
            smart_cache.last_modified.clear()
        # Supprimer les fichiers cache
        for cache_file in [CACHE_FILE, DELTA_FILE]:
            if os.path.exists(cache_file):
                os.remove(cache_file)
        # Réinitialiser les stats
        stats["cache_hits"] = 0
        stats["cache_misses"] = 0
        stats["last_full_sync"] = None
        return jsonify({
            "success": True,
            "message": "Cache vidé avec succès"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("🚀 Notion Clipper Pro - Version 100% Locale")
    print("==========================================")
    load_configuration()
    
    print("\n✨ Fonctionnalités:")
    print("  ✅ Smart Polling (détection intelligente des changements)")
    print("  ✅ Cache local optimisé (pas d'appels API inutiles)")
    print("  ✅ Server-Sent Events pour mises à jour temps réel")
    print("  ✅ 100% local, aucun service externe requis")
    print("  ✅ Gratuit et open source")
    
    print(f"\n📊 Configuration:")
    print(f"  • Check rapide: toutes les 30 secondes")
    print(f"  • Sync complète: toutes les 5 minutes")
    print(f"  • Cache max: 2000 pages")
    print(f"  • Token Notion: {'✓' if notion_token else '✗'}")
    print(f"  • ImgBB: {'✓' if imgbb_key else '✗ (images en texte)'}")
    
    print("\n🔗 Endpoints:")
    print("  GET  /api/pages - Pages depuis le cache")
    print("  GET  /api/pages/changes - Changements récents")
    print("  GET  /api/events/stream - SSE pour temps réel")
    print("  GET  /api/health - État et statistiques")
    
    print("\n💡 Le système détecte automatiquement les changements")
    print("   sans surcharger l'API Notion !")
    
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)