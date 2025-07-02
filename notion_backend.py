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
import re
from PIL import ImageGrab
from io import BytesIO
from collections.abc import Mapping
from types import MappingProxyType

from flask import Flask, request, jsonify, Response, current_app
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

# Variables globales pour le suivi des changements
last_check_timestamp = None
pages_snapshot = {}
update_history = []

# Ajout utilitaires cache si non importés (doit être défini AVANT toute utilisation)
def load_cache():
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}
def save_cache(data):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

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
    """Envoie vers plusieurs pages avec propriétés enrichies."""
    try:
        data = request.get_json()
        page_ids = data.get('page_ids', [])
        content = data.get('content', '')
        content_type = data.get('content_type', 'text')
        block_type = data.get('block_type', 'paragraph')
        properties = data.get('properties', {})
        if not page_ids or not content:
            return jsonify({"error": "page_ids et content requis"}), 400
        if not notion:
            return jsonify({"error": "Notion non configuré"}), 400
        success_count = 0
        errors = []
        for page_id in page_ids:
            try:
                blocks = []
                if content_type == 'video':
                    video_url = data.get('video_url', content)
                    blocks.append(create_video_block(video_url))
                elif content_type == 'image':
                    image_data = data.get('image_data', content)
                    blocks.append(create_image_block(image_data))
                elif content_type == 'table':
                    blocks.extend(create_table_block(content))
                elif content_type == 'markdown' or data.get('isMarkdown'):
                    blocks.extend(parse_markdown_to_blocks(content))
                else:
                    block = create_block_content(
                        content, 
                        block_type,
                        properties.get('tags', []),
                        properties.get('source_url')
                    )
                    if properties.get('is_favorite'):
                        block = add_favorite_marker(block)
                    blocks.append(block)
                if any([properties.get('category'), properties.get('due_date'), properties.get('source_url')]):
                    metadata_parts = []
                    if properties.get('category'):
                        metadata_parts.append(f"📁 {properties['category']}")
                    if properties.get('due_date'):
                        metadata_parts.append(f"📅 {properties['due_date']}")
                    if properties.get('source_url'):
                        metadata_parts.append(f"🔗 {properties['source_url']}")
                    if metadata_parts:
                        blocks.append({
                            "object": "block",
                            "type": "callout",
                            "callout": {
                                "rich_text": [{"type": "text", "text": {"content": " • ".join(metadata_parts)}}],
                                "icon": {"emoji": "ℹ️"},
                                "color": "gray_background"
                            }
                        })
                if properties.get('has_reminder'):
                    blocks.append({
                        "object": "block",
                        "type": "to_do",
                        "to_do": {
                            "rich_text": [{"type": "text", "text": {"content": "🔔 Rappel activé pour ce contenu"}}],
                            "checked": False
                        }
                    })
                notion.blocks.children.append(block_id=page_id, children=blocks)
                success_count += 1
                changes_queue.put({
                    "type": "content_sent",
                    "page_id": page_id,
                    "timestamp": time.time()
                })
            except Exception as e:
                print(f"❌ Erreur envoi vers {page_id}: {e}")
                errors.append({"page_id": page_id, "error": str(e)})
        return jsonify({
            "success": True,
            "success_count": success_count,
            "total": len(page_ids),
            "errors": errors,
            "message": f"Contenu envoyé vers {success_count}/{len(page_ids)} pages"
        })
    except Exception as e:
        print(f"❌ Erreur générale: {e}")
        return jsonify({"error": str(e)}), 500

def upload_image_to_imgbb(base64_image):
    """Upload une image vers ImgBB avec gestion d'erreur améliorée."""
    if not imgbb_key:
        print("⚠️ Clé ImgBB non configurée")
        return None
    try:
        if ',' in base64_image:
            base64_image = base64_image.split(',')[1]
        response = requests.post(
            "https://api.imgbb.com/1/upload",
            data={
                'key': imgbb_key,
                'image': base64_image,
                'expiration': 15552000
            },
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                image_url = data['data']['url']
                print(f"✅ Image uploadée: {image_url}")
                cache_data = load_cache() if 'load_cache' in globals() else {}
                if 'uploaded_images' not in cache_data:
                    cache_data['uploaded_images'] = []
                cache_data['uploaded_images'].append({
                    'url': image_url,
                    'timestamp': time.time(),
                    'delete_url': data['data'].get('delete_url')
                })
                if 'save_cache' in globals():
                    save_cache(cache_data)
                return image_url
        print(f"❌ Erreur ImgBB: {response.text}")
        return None
    except Exception as e:
        print(f"❌ Erreur upload image: {e}")
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

@app.route('/api/cleanup_images', methods=['POST'])
def cleanup_uploaded_images():
    """Nettoie les anciennes images uploadées."""
    try:
        cache_data = load_cache() if 'load_cache' in globals() else {}
        images = cache_data.get('uploaded_images', [])
        cutoff_time = time.time() - (30 * 24 * 60 * 60)
        kept_images = []
        deleted_count = 0
        for img in images:
            if img['timestamp'] < cutoff_time and img.get('delete_url'):
                try:
                    requests.get(img['delete_url'])
                    deleted_count += 1
                except:
                    pass
            else:
                kept_images.append(img)
        cache_data['uploaded_images'] = kept_images
        if 'save_cache' in globals():
            save_cache(cache_data)
        return jsonify({
            "success": True,
            "deleted": deleted_count,
            "remaining": len(kept_images)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/<page_id>/database', methods=['GET'])
def check_if_database(page_id):
    """Vérifie si une page est une base de données."""
    try:
        if not notion:
            return jsonify({"is_database": False})
        db = notion.databases.retrieve(database_id=page_id)
        # Force conversion en dict si besoin
        if not isinstance(db, dict):
            db = json.loads(json.dumps(db))
        return jsonify({
            "is_database": True,
            "properties": db.get('properties', {}),
            "title": db.get('title', [{}])[0].get('plain_text', 'Base de données')
        })
    except Exception:
        return jsonify({"is_database": False})

@app.route('/api/database/<db_id>/create_page', methods=['POST'])
def create_database_page(db_id):
    """Crée une nouvelle entrée dans une base de données."""
    try:
        if not notion:
            return jsonify({"error": "Notion non configuré"}), 400
        data = request.get_json()
        properties = {
            "Name": {
                "title": [{
                    "text": {
                        "content": data.get('title', 'Nouveau clip')
                    }
                }]
            }
        }
        if data.get('properties'):
            for prop_name, prop_value in data['properties'].items():
                if prop_name == 'Tags' and isinstance(prop_value, list):
                    properties[prop_name] = {
                        "multi_select": [{"name": tag} for tag in prop_value]
                    }
                elif prop_name == 'URL' and prop_value:
                    properties[prop_name] = {"url": prop_value}  # type: ignore
                elif prop_name == 'Date' and prop_value:
                    properties[prop_name] = {"date": {"start": prop_value}}  # type: ignore
                elif prop_name == 'Category' and prop_value:
                    properties[prop_name] = {"select": {"name": prop_value}}  # type: ignore
        new_page = notion.pages.create(
            parent={"database_id": db_id},
            properties=properties,
            children=data.get('blocks', [])
        )
        # Force conversion en dict si besoin
        if not isinstance(new_page, dict):
            new_page = json.loads(json.dumps(new_page))
        page_id = new_page.get('id')
        url = new_page.get('url')
        return jsonify({
            "success": True,
            "page_id": page_id,
            "url": url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_clipboard_content():
    """Récupère et analyse le contenu du presse-papiers avec détection améliorée."""
    try:
        # Tentative de récupération d'image
        image_clip = ImageGrab.grabclipboard()
        # Sur certains OS, grabclipboard() peut retourner une liste de chemins
        if isinstance(image_clip, list) and image_clip and isinstance(image_clip[0], str):
            for path in image_clip:
                try:
                    with Image.open(path) as image:
                        if hasattr(image, 'save'):
                            buffered = BytesIO()
                            image.save(buffered, format="PNG")
                            img_str = base64.b64encode(buffered.getvalue()).decode()
                            return {
                                "type": "image",
                                "content": f"data:image/png;base64,{img_str}",
                                "imageData": f"data:image/png;base64,{img_str}",
                                "originalFormat": "png",
                                "size": len(img_str)
                            }
                except Exception:
                    continue
        elif image_clip is not None and hasattr(image_clip, 'save'):
            buffered = BytesIO()
            image_clip.save(buffered, format="PNG")  # type: ignore
            img_str = base64.b64encode(buffered.getvalue()).decode()
            return {
                "type": "image",
                "content": f"data:image/png;base64,{img_str}",
                "imageData": f"data:image/png;base64,{img_str}",
                "originalFormat": "png",
                "size": len(img_str)
            }
        # Si c'est une liste mais pas des chemins d'image, ignorer
    except Exception:
        pass
    
    # Récupération du texte
    text = pyperclip.paste()
    if text:
        # Détection YouTube
        youtube_match = re.search(r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)', text)
        if youtube_match:
            video_id = youtube_match.group(1)
            return {
                "type": "video",
                "content": text,
                "videoUrl": f"https://www.youtube.com/watch?v={video_id}",
                "videoId": video_id,
                "platform": "youtube"
            }
        
        # Détection URL d'image
        if re.match(r'^https?://.*\.(jpg|jpeg|png|gif|webp)', text, re.IGNORECASE):
            return {
                "type": "image",
                "content": text,
                "imageUrl": text,
                "isExternal": True
            }
        
        # Détection Markdown
        markdown_patterns = [
            r'^#{1,6}\s',  # Headers
            r'^\*\s',       # Bullet lists
            r'^\d+\.\s',    # Numbered lists
            r'^```',        # Code blocks
            r'^\>',         # Quotes
            r'\[.+\]\(.+\)' # Links
        ]
        
        is_markdown = any(re.search(pattern, text, re.MULTILINE) for pattern in markdown_patterns)
        
        # Détection tableau
        if '\t' in text and '\n' in text:
            lines = text.strip().split('\n')
            if len(lines) > 1:
                first_row_tabs = lines[0].count('\t')
                if all(line.count('\t') == first_row_tabs for line in lines[1:]):
                    return {
                        "type": "table",
                        "content": text,
                        "rows": len(lines),
                        "columns": first_row_tabs + 1
                    }
        
        # Texte normal ou Markdown
        return {
            "type": "text",
            "content": text[:MAX_CLIPBOARD_LENGTH],
            "truncated": len(text) > MAX_CLIPBOARD_LENGTH,
            "originalLength": len(text),
            "isMarkdown": is_markdown
        }
    
    return None

def create_video_block(url, video_id=None):
    """Crée un bloc vidéo Notion."""
    if 'youtube' in url or 'youtu.be' in url:
        return {
            "object": "block",
            "type": "video",
            "video": {
                "type": "external",
                "external": {"url": url}
            }
        }
    return create_block_content(f"🎥 Vidéo: {url}", "paragraph")

def create_image_block(image_data_or_url):
    """Crée un bloc image Notion."""
    if image_data_or_url.startswith('data:image/'):
        image_url = upload_image_to_imgbb(image_data_or_url) if imgbb_key else None
        if image_url:
            return {
                "object": "block",
                "type": "image",
                "image": {
                    "type": "external",
                    "external": {"url": image_url}
                }
            }
    elif image_data_or_url.startswith('http'):
        return {
            "object": "block",
            "type": "image",
            "image": {
                "type": "external",
                "external": {"url": image_data_or_url}
            }
        }
    return create_block_content("[Image non disponible]", "paragraph")

def parse_markdown_to_blocks(markdown_text):
    """Convertit du Markdown en blocs Notion."""
    blocks = []
    lines = markdown_text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('#'):
            level = len(line.split()[0])
            text = line[level:].strip()
            block_type = f"heading_{min(level, 3)}"
            blocks.append({
                "object": "block",
                "type": block_type,
                block_type: {
                    "rich_text": [{"type": "text", "text": {"content": text}}]
                }
            })
        elif line.startswith('```'):
            code_lines = []
            language = line[3:].strip() or "plain text"
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            blocks.append({
                "object": "block",
                "type": "code",
                "code": {
                    "rich_text": [{"type": "text", "text": {"content": '\n'.join(code_lines)}}],
                    "language": language
                }
            })
        elif line.startswith('* ') or line.startswith('- '):
            blocks.append({
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [{"type": "text", "text": {"content": line[2:]}}]
                }
            })
        elif re.match(r'^\d+\.\s', line):
            text = re.sub(r'^\d+\.\s', '', line)
            blocks.append({
                "object": "block",
                "type": "numbered_list_item",
                "numbered_list_item": {
                    "rich_text": [{"type": "text", "text": {"content": text}}]
                }
            })
        elif line.startswith('>'):
            blocks.append({
                "object": "block",
                "type": "quote",
                "quote": {
                    "rich_text": [{"type": "text", "text": {"content": line[1:].strip()}}]
                }
            })
        elif line:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": line}}]
                }
            })
        i += 1
    return blocks if blocks else [create_block_content(markdown_text, "paragraph")]

def create_table_block(table_content):
    """Crée un bloc table Notion à partir de données tabulaires."""
    rows = table_content.strip().split('\n')
    if not rows:
        return [create_block_content(table_content, "paragraph")]
    blocks = []
    headers = rows[0].split('\t')
    blocks.append({
        "object": "block",
        "type": "callout",
        "callout": {
            "rich_text": [{"type": "text", "text": {"content": " | ".join(headers)}}],
            "icon": {"emoji": "📊"}
        }
    })
    for row in rows[1:]:
        cells = row.split('\t')
        blocks.append({
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {
                "rich_text": [{"type": "text", "text": {"content": " | ".join(cells)}}]
            }
        })
    return blocks

@app.route('/api/pages/check_updates')
def check_updates():
    """Vérifie s'il y a eu des mises à jour de pages Notion depuis la dernière vérification."""
    global last_check_timestamp, pages_snapshot
    try:
        has_updates = False
        updated_pages = []
        new_pages = []
        deleted_pages = []
        # Récupérer l'état actuel depuis le cache
        cache_data = load_cache()
        current_pages = cache_data.get('pages', [])
        # Si c'est la première vérification
        if not pages_snapshot:
            pages_snapshot = {page['id']: {
                'last_edited': page.get('last_edited_time'),
                'title': page.get('title'),
                'hash': _generate_page_hash(page)
            } for page in current_pages}
            last_check_timestamp = time.time()
            return jsonify({
                "has_updates": False,
                "first_check": True,
                "total_pages": len(current_pages)
            })
        # Créer un dictionnaire des pages actuelles pour comparaison rapide
        current_pages_dict = {page['id']: page for page in current_pages}
        # 1. Vérifier les pages modifiées ou nouvelles
        for page in current_pages:
            page_id = page['id']
            current_hash = _generate_page_hash(page)
            if page_id not in pages_snapshot:
                # Nouvelle page
                new_pages.append({
                    'id': page_id,
                    'title': page.get('title', 'Sans titre'),
                    'url': page.get('url'),
                    'icon': page.get('icon')
                })
                has_updates = True
            else:
                # Vérifier si la page a été modifiée
                stored_page = pages_snapshot[page_id]
                # Comparaison par hash pour détecter tout changement
                if current_hash != stored_page['hash']:
                    updated_pages.append({
                        'id': page_id,
                        'title': page.get('title', 'Sans titre'),
                        'url': page.get('url'),
                        'icon': page.get('icon'),
                        'changes': _detect_changes(stored_page, page)
                    })
                    has_updates = True
        # 2. Vérifier les pages supprimées
        for page_id in pages_snapshot:
            if page_id not in current_pages_dict:
                deleted_page = pages_snapshot[page_id]
                deleted_pages.append({
                    'id': page_id,
                    'title': deleted_page.get('title', 'Sans titre')
                })
                has_updates = True
        # 3. Vérifier les changements dans la file d'attente
        changes_in_queue = []
        while not changes_queue.empty():
            try:
                change = changes_queue.get_nowait()
                changes_in_queue.append(change)
                # Marquer comme ayant des updates si c'est récent
                if change.get('timestamp', 0) > (last_check_timestamp or 0):
                    has_updates = True
            except:
                break
        # Remettre les changements dans la queue pour d'autres consommateurs
        for change in changes_in_queue:
            changes_queue.put(change)
        # 4. Mettre à jour le snapshot
        pages_snapshot = {page['id']: {
            'last_edited': page.get('last_edited_time'),
            'title': page.get('title'),
            'hash': _generate_page_hash(page)
        } for page in current_pages}
        # 5. Mettre à jour l'historique
        if has_updates:
            update_entry = {
                'timestamp': time.time(),
                'new_pages': len(new_pages),
                'updated_pages': len(updated_pages),
                'deleted_pages': len(deleted_pages)
            }
            update_history.append(update_entry)
            # Garder seulement les 100 dernières entrées
            if len(update_history) > 100:
                update_history.pop(0)
        # 6. Statistiques supplémentaires
        time_since_last_check = time.time() - (last_check_timestamp or time.time())
        last_check_timestamp = time.time()
        # 7. Notification Push (si configuré)
        socketio_instance = getattr(current_app, 'socketio', None)
        if has_updates and socketio_instance is not None:
            # Émettre un événement WebSocket
            socketio_instance.emit('pages_updated', {
                'new': new_pages,
                'updated': updated_pages,
                'deleted': deleted_pages
            })
        return jsonify({
            "has_updates": has_updates,
            "timestamp": time.time(),
            "time_since_last_check": time_since_last_check,
            "summary": {
                "new_pages": len(new_pages),
                "updated_pages": len(updated_pages),
                "deleted_pages": len(deleted_pages),
                "total_changes": len(new_pages) + len(updated_pages) + len(deleted_pages)
            },
            "details": {
                "new": new_pages[:10],
                "updated": updated_pages[:10],
                "deleted": deleted_pages[:10]
            },
            "stats": {
                "total_pages": len(current_pages),
                "last_update": max([p.get('last_edited_time', '') for p in current_pages]) if current_pages else None,
                "cache_age": cache_data.get('timestamp', 0)
            }
        })
    except Exception as e:
        print(f"❌ Erreur check updates: {e}")
        return jsonify({
            "has_updates": False,
            "error": str(e)
        }), 500

def _generate_page_hash(page):
    """Génère un hash unique pour une page basé sur ses propriétés importantes."""
    # Propriétés à surveiller pour les changements
    relevant_props = {
        'title': page.get('title', ''),
        'last_edited_time': page.get('last_edited_time', ''),
        'icon': str(page.get('icon', '')),
        'cover': str(page.get('cover', '')),
        'parent': str(page.get('parent', '')),
        'archived': page.get('archived', False)
    }
    # Créer une chaîne JSON triée pour un hash cohérent
    content = json.dumps(relevant_props, sort_keys=True)
    # Générer le hash SHA256
    return hashlib.sha256(content.encode()).hexdigest()

def _detect_changes(old_page, new_page):
    """Détecte quels champs ont changé entre deux versions d'une page."""
    changes = []
    # Titre
    if old_page.get('title') != new_page.get('title'):
        changes.append({
            'field': 'title',
            'old': old_page.get('title'),
            'new': new_page.get('title')
        })
    # Dernière modification
    old_time = old_page.get('last_edited')
    new_time = new_page.get('last_edited_time')
    if old_time != new_time:
        changes.append({
            'field': 'last_edited',
            'old': old_time,
            'new': new_time
        })
    # Icône
    if str(old_page.get('icon')) != str(new_page.get('icon')):
        changes.append({'field': 'icon', 'changed': True})
    # Parent (déplacement de page)
    if str(old_page.get('parent')) != str(new_page.get('parent')):
        changes.append({'field': 'parent', 'changed': True})
    return changes

@app.route('/api/pages/force_check', methods=['POST'])
def force_check_updates():
    """Force une vérification immédiate des mises à jour."""
    global pages_snapshot, last_check_timestamp
    try:
        # Réinitialiser le snapshot pour forcer une comparaison complète
        old_snapshot = pages_snapshot.copy()
        pages_snapshot = {}
        # Faire la vérification
        result = check_updates()
        # Récupérer la vraie réponse Flask et le code
        if isinstance(result, tuple):
            response, status = result
        else:
            response = result
            status = 200
        # Extraire le JSON de la réponse
        data = response.get_json(force=True)
        # Si pas de changements, restaurer l'ancien snapshot
        if not data.get('has_updates'):
            pages_snapshot = old_snapshot
        return response, status
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/update_history')
def get_update_history():
    """Retourne l'historique des mises à jour."""
    return jsonify({
        "history": update_history[-20:],
        "total_updates": len(update_history)
    })

def cleanup_update_tracking():
    """Nettoie les données de suivi trop anciennes."""
    global update_history
    # Garder seulement les updates des 24 dernières heures
    cutoff_time = time.time() - (24 * 60 * 60)
    update_history = [u for u in update_history if u['timestamp'] > cutoff_time]

def schedule_cleanup():
    while True:
        time.sleep(3600)  # Toutes les heures
        cleanup_update_tracking()

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