#!/usr/bin/env python3
"""
Backend API pour Notion Clipper Pro - Version corrigée
Corrections des problèmes de chargement et d'API
"""

import os
import json
import time
import base64
import tempfile
import threading
import io
import re
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict

from flask import Flask, request, jsonify
from flask_cors import CORS
from notion_client import Client
from dotenv import load_dotenv
import requests
from PIL import Image
import pyperclip

# Configuration
load_dotenv()
app = Flask(__name__)
CORS(app)

# Constants
CACHE_FILE = "notion_cache.json"
PREFERENCES_FILE = "notion_preferences.json"
CONFIG_FILE = "notion_config.json"
CACHE_DURATION = 300  # 5 minutes au lieu de 30
MAX_CLIPBOARD_LENGTH = 2000
MAX_PAGES_PER_REQUEST = 20  # Limiter pour éviter la surcharge
RATE_LIMIT_DELAY = 0.2  # 200ms entre les requêtes

# Variables globales
notion = None
notion_token = None
imgbb_key = None
last_api_call = 0
request_count = 0
max_requests_per_minute = 20

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def rate_limit_check():
    """Vérifie et applique la limitation de débit pour l'API Notion."""
    global last_api_call, request_count
    current_time = time.time()
    
    # Reset du compteur chaque minute
    if current_time - last_api_call > 60:
        request_count = 0
    
    # Vérifier si on dépasse la limite
    if request_count >= max_requests_per_minute:
        sleep_time = 60 - (current_time - last_api_call)
        if sleep_time > 0:
            print(f"⏱️  Rate limit atteint, pause de {sleep_time:.1f}s")
            time.sleep(sleep_time)
        request_count = 0
    
    # Appliquer le délai minimum entre requêtes
    if current_time - last_api_call < RATE_LIMIT_DELAY:
        time.sleep(RATE_LIMIT_DELAY - (current_time - last_api_call))
    
    last_api_call = time.time()
    request_count += 1

def load_configuration():
    """Charge la configuration depuis le fichier ou les variables d'environnement."""
    global notion, notion_token, imgbb_key
    
    # Essayer de charger depuis le fichier de config
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except:
            pass
    
    # Fallback vers les variables d'environnement
    notion_token = config.get('notionToken') or os.getenv("NOTION_TOKEN")
    imgbb_key = config.get('imgbbKey') or os.getenv("IMGBB_API_KEY")
    
    if notion_token:
        notion = Client(auth=notion_token)
        print(f"✅ Configuration chargée - Token Notion: {'Oui' if notion_token else 'Non'}, ImgBB: {'Oui' if imgbb_key else 'Non'}")
    else:
        print("⚠️  Aucun token Notion configuré")

@dataclass
class NotionPage:
    """Représente une page Notion avec toutes ses propriétés."""
    id: str
    title: str
    icon: Optional[Any] = None
    parent_type: str = "page"
    parent_title: Optional[str] = None
    url: Optional[str] = None
    last_edited: Optional[str] = None
    created_time: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)

class NotionCache:
    """Gère le cache des pages Notion avec amélioration."""
    
    def __init__(self):
        self.cache_file = CACHE_FILE
        self.preferences_file = PREFERENCES_FILE
        self.cache = self._load_cache()
        self.preferences = self._load_preferences()
        
    def _load_cache(self) -> Dict:
        """Charge le cache depuis le fichier."""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {"pages": [], "timestamp": 0, "latest_edit_time": ""}
        return {"pages": [], "timestamp": 0, "latest_edit_time": ""}
    
    def _load_preferences(self) -> Dict:
        """Charge les préférences utilisateur."""
        if os.path.exists(self.preferences_file):
            try:
                with open(self.preferences_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return self._default_preferences()
        return self._default_preferences()
    
    def _default_preferences(self) -> Dict:
        """Préférences par défaut."""
        return {
            "last_used_page": None,
            "favorites": [],
            "usage_count": {},
            "recent_pages": []
        }
    
    def save_cache(self):
        """Sauvegarde le cache."""
        with open(self.cache_file, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=2)
    
    def save_preferences(self):
        """Sauvegarde les préférences."""
        with open(self.preferences_file, 'w', encoding='utf-8') as f:
            json.dump(self.preferences, f, ensure_ascii=False, indent=2)
    
    def is_cache_valid(self) -> bool:
        """Vérifie si le cache est valide."""
        return (time.time() - self.cache.get("timestamp", 0)) < CACHE_DURATION
    
    def update_cache(self, pages: List[NotionPage], latest_edit_time: str = ""):
        """Met à jour le cache avec de nouvelles pages."""
        self.cache = {
            "pages": [page.to_dict() for page in pages],
            "timestamp": time.time(),
            "latest_edit_time": latest_edit_time
        }
        self.save_cache()

# Instance globale du cache
cache = NotionCache()

def extract_icon_advanced(page_data) -> Optional[Any]:
    """Extrait l'icône d'une page Notion avec gestion avancée."""
    try:
        icon = page_data.get("icon")
        if not icon:
            return None
            
        # Retourner l'objet icon complet pour une meilleure gestion côté frontend
        if icon["type"] == "emoji":
            return {
                "type": "emoji",
                "emoji": icon["emoji"]
            }
        elif icon["type"] == "external":
            return {
                "type": "external",
                "external": {"url": icon["external"]["url"]}
            }
        elif icon["type"] == "file":
            return {
                "type": "file", 
                "file": {"url": icon["file"]["url"]}
            }
    except Exception as e:
        print(f"Erreur extraction icône: {e}")
        
    return None

def get_parent_title_improved(parent_data) -> Optional[str]:
    """Récupère le titre du parent avec gestion d'erreur améliorée."""
    try:
        if not parent_data or not notion:
            return None
        
        rate_limit_check()  # Appliquer rate limiting
        
        if parent_data["type"] == "page_id":
            parent_page = notion.pages.retrieve(parent_data["page_id"])
            return extract_title_advanced(parent_page)
        elif parent_data["type"] == "database_id":
            parent_db = notion.databases.retrieve(parent_data["database_id"])
            return extract_title_advanced(parent_db)
        elif parent_data["type"] == "workspace":
            return "Workspace"
    except Exception as e:
        print(f"Erreur recuperation parent: {e}")
    return None

def extract_title_advanced(page_or_db) -> str:
    """Extrait le titre d'une page ou database avec gestion avancée."""
    try:
        # Pour les pages - recherche de propriété title de type "title"
        if "properties" in page_or_db:
            for prop_name, prop_data in page_or_db["properties"].items():
                if prop_data.get("type") == "title":
                    # Vérifier que la propriété title contient des données
                    if prop_data.get("title") and len(prop_data["title"]) > 0:
                        title_text = "".join([
                            text_obj.get("plain_text", "") 
                            for text_obj in prop_data["title"]
                        ]).strip()
                        if title_text:
                            return title_text
        
        # Pour les databases
        if "title" in page_or_db and page_or_db["title"]:
            title_text = "".join([
                text_obj.get("plain_text", "") 
                for text_obj in page_or_db["title"]
            ]).strip()
            if title_text:
                return title_text
                
        # Fallback - chercher dans les propriétés "Name" ou similaires
        if "properties" in page_or_db:
            for prop_name, prop_data in page_or_db["properties"].items():
                if prop_name.lower() in ["name", "nom", "titre", "title"] and prop_data.get("type") == "rich_text":
                    if prop_data.get("rich_text") and len(prop_data["rich_text"]) > 0:
                        title_text = "".join([
                            text_obj.get("plain_text", "") 
                            for text_obj in prop_data["rich_text"]
                        ]).strip()
                        if title_text:
                            return title_text
                            
    except Exception as e:
        print(f"Erreur extraction titre: {e}")
    
    return "Page sans titre"

def fetch_pages_from_notion_advanced(progress_callback=None) -> List[NotionPage]:
    """Récupère toutes les pages depuis Notion avec gestion avancée et vraie progression."""
    if not notion:
        print("Client Notion non configure")
        return []
    
    pages = []
    try:
        print("Récupération des pages depuis Notion...")
        
        # Première requête pour obtenir le nombre total approximatif
        rate_limit_check()
        initial_response = notion.search(
            filter={"property": "object", "value": "page"},
            page_size=1
        )
        
        if progress_callback:
            progress_callback(5, 100, "Initialisation...")
        
        # Récupération progressive des pages
        has_more = True
        start_cursor = None
        page_count = 0
        batch_count = 0
        max_batches = 15  # Limiter pour éviter la surcharge
        latest_edit_time = ""
        
        while has_more and batch_count < max_batches:
            try:
                rate_limit_check()  # Appliquer rate limiting
                
                search_params = {
                    "filter": {"property": "object", "value": "page"},
                    "page_size": MAX_PAGES_PER_REQUEST,
                    "sort": {
                        "timestamp": "last_edited_time",
                        "direction": "descending"
                    }
                }
                if start_cursor:
                    search_params["start_cursor"] = start_cursor
                
                response = notion.search(**search_params)
                
                # Calcul du progrès réel
                progress = min(10 + (batch_count * 80 / max_batches), 90)
                if progress_callback:
                    progress_callback(progress, 100, f"Batch {batch_count + 1}/{max_batches}")
                
                for page_data in response["results"]: # type: ignore
                    try:
                        # Extraction améliorée
                        title = extract_title_advanced(page_data)
                        icon = extract_icon_advanced(page_data)
                        parent_title = None  # Désactivé temporairement pour éviter trop d'appels API
                        
                        # Récupérer le latest_edit_time
                        if page_count == 0:  # Premier élément = plus récent
                            latest_edit_time = page_data.get("last_edited_time", "")
                        
                        page = NotionPage(
                            id=page_data["id"],
                            title=title,
                            icon=icon,
                            parent_type=page_data.get("parent", {}).get("type", "page"),
                            parent_title=parent_title,
                            url=page_data.get("url"),
                            last_edited=page_data.get("last_edited_time"),
                            created_time=page_data.get("created_time")
                        )
                        pages.append(page)
                        page_count += 1
                        
                    except Exception as e:
                        print(f"Erreur traitement page {page_data.get('id', 'unknown')}: {e}")
                
                has_more = response.get("has_more", False) # type: ignore
                start_cursor = response.get("next_cursor") # type: ignore
                batch_count += 1
                
            except Exception as e:
                print(f"Erreur batch {batch_count}: {e}")
                break
        
        if progress_callback:
            progress_callback(100, 100, f"Terminé - {page_count} pages")
        
        print(f"{page_count} pages récupérées en {batch_count} batches")
        
        # Mettre à jour le cache avec le latest_edit_time
        cache.update_cache(pages, latest_edit_time)
        
    except Exception as e:
        print(f"Erreur récupération pages: {e}")
    
    return pages

def upload_image_to_imgbb_improved(image_data: str) -> Optional[str]:
    """Upload une image vers imgBB avec gestion d'erreur améliorée."""
    if not imgbb_key:
        print("⚠️  Clé ImgBB non configurée")
        return None
        
    try:
        # Supprimer le préfixe data:image si présent
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
                print(f"✅ Image uploadée: {result['data']['url']}")
                return result["data"]["url"]
        else:
            print(f"❌ Erreur upload ImgBB: {response.status_code}")
                
    except Exception as e:
        print(f"❌ Erreur upload imgBB: {e}")
        
    return None

def get_clipboard_content_limited():
    """Récupère le contenu du presse-papiers avec limitation de taille."""
    try:
        # Essayer de récupérer une image
        try:
            from PIL import ImageGrab, Image
            image = ImageGrab.grabclipboard()
            if image:
                # Si c'est une liste de chemins (ex: fichiers images)
                if isinstance(image, list) and len(image) > 0:
                    first_path = image[0]
                    try:
                        with Image.open(first_path) as img:
                            buffer = io.BytesIO()
                            # Redimensionner si trop grande
                            if img.size[0] > 2048 or img.size[1] > 2048:
                                img.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
                            img.save(buffer, format='PNG', optimize=True)
                            image_data = base64.b64encode(buffer.getvalue()).decode()
                            return {
                                "type": "image",
                                "content": image_data,
                                "size": len(image_data),
                                "timestamp": time.time()
                            }
                    except Exception as e:
                        print(f"Erreur ouverture image clipboard: {e}")
                # Si c'est une image PIL.Image (et pas une liste)
                elif not isinstance(image, list) and hasattr(image, 'save'):
                    buffer = io.BytesIO()
                    # Redimensionner si trop grande
                    if image.size[0] > 2048 or image.size[1] > 2048:
                        image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
                    image.save(buffer, format='PNG', optimize=True)
                    image_data = base64.b64encode(buffer.getvalue()).decode()
                    return {
                        "type": "image",
                        "content": image_data,
                        "size": len(image_data),
                        "timestamp": time.time()
                    }
        except ImportError:
            pass  # ImageGrab pas disponible sur cette plateforme
        except Exception as e:
            print(f"Erreur image clipboard: {e}")
        
        # Essayer de récupérer du texte
        text = pyperclip.paste()
        if text and text.strip():
            text = text.strip()
            original_length = len(text)
            # Limiter la taille
            if len(text) > MAX_CLIPBOARD_LENGTH:
                text = text[:MAX_CLIPBOARD_LENGTH]
                return {
                    "type": "text",
                    "content": text,
                    "size": len(text),
                    "truncated": True,
                    "original_length": original_length,
                    "timestamp": time.time()
                }
            else:
                return {
                    "type": "text",
                    "content": text,
                    "size": len(text),
                    "truncated": False,
                    "original_length": original_length,
                    "timestamp": time.time()
                }
    except Exception as e:
        print(f"Erreur clipboard: {e}")
    return None

# Routes API

@app.route('/api/health')
def health_check():
    """Endpoint de santé pour vérifier la connectivité."""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "notion_connected": notion is not None,
        "imgbb_configured": imgbb_key is not None,
        "cache_valid": cache.is_cache_valid(),
        "pages_count": len(cache.cache.get("pages", []))
    })

@app.route('/api/config', methods=['POST'])
def update_config():
    """Met à jour la configuration."""
    try:
        data = request.get_json()
        
        # Sauvegarder la config
        config = {
            "notionToken": data.get("notionToken", ""),
            "imgbbKey": data.get("imgbbKey", "")
        }
        
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        
        # Recharger la configuration
        load_configuration()
        
        # Invalider le cache pour forcer le rechargement
        cache.cache["timestamp"] = 0
        
        return jsonify({
            "success": True,
            "message": "Configuration mise à jour"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages')
def get_pages():
    """Récupère la liste des pages avec force refresh optionnel."""
    try:
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        # Vérifier le cache
        if not force_refresh and cache.is_cache_valid() and cache.cache.get("pages"):
            pages_data = cache.cache["pages"]
            print(f"📋 {len(pages_data)} pages depuis le cache")
        else:
            # Récupération avec callback de progression
            def progress_callback(current, total, message):
                # On pourrait ici utiliser WebSockets pour envoyer la progression en temps réel
                pass
            
            pages = fetch_pages_from_notion_advanced(progress_callback)
            pages_data = [page.to_dict() for page in pages]
            print(f"🔄 {len(pages_data)} pages depuis Notion")
        
        return jsonify({
            "pages": pages_data,
            "cached": not force_refresh and cache.is_cache_valid(),
            "timestamp": cache.cache.get("timestamp"),
            "count": len(pages_data),
            "latest_edit_time": cache.cache.get("latest_edit_time", "")
        })
        
    except Exception as e:
        print(f"❌ Erreur get_pages: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/progress')
def get_pages_with_progress():
    """Récupère les pages avec progression en temps réel."""
    try:
        # Pour une vraie progression, on pourrait utiliser Server-Sent Events
        # ou WebSockets. Pour l'instant, on simule avec des étapes
        
        def generate():
            pages = []
            yield f"data: {json.dumps({'progress': 0, 'message': 'Initialisation...'})}\n\n"
            
            try:
                # Simuler la progression
                for i in range(1, 11):
                    time.sleep(0.1)
                    progress = i * 10
                    yield f"data: {json.dumps({'progress': progress, 'message': f'Chargement {progress}%...'})}\n\n"
                
                # Vraie récupération
                pages = fetch_pages_from_notion_advanced()
                pages_data = [page.to_dict() for page in pages]
                
                yield f"data: {json.dumps({'progress': 100, 'pages': pages_data, 'complete': True})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return app.response_class(generate(), mimetype='text/plain') # type: ignore
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clipboard')
def get_clipboard():
    """Récupère le contenu du presse-papiers avec limitation."""
    try:
        content = get_clipboard_content_limited()
        return jsonify(content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/send', methods=['POST'])
def send_to_notion():
    """Envoie le contenu vers une page Notion."""
    try:
        data = request.get_json()
        page_id = data.get('page_id')
        content = data.get('content')
        content_type = data.get('content_type', 'text')
        is_image = data.get('is_image', False)
        truncated = data.get('truncated', False)
        original_length = data.get('original_length', 0)
        
        if not page_id or not content:
            return jsonify({"error": "page_id et content requis"}), 400
        
        if not notion:
            return jsonify({"error": "Token Notion non configuré"}), 400
        
        rate_limit_check()  # Appliquer rate limiting
        
        # Préparer le contenu pour Notion
        if is_image and content_type == 'image':
            # Uploader l'image vers imgBB
            image_url = upload_image_to_imgbb_improved(content)
            
            if image_url:
                # Créer un bloc image
                block = {
                    "object": "block",
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": image_url}
                    }
                }
            else:
                # Si l'upload échoue, créer un bloc texte avec info
                block = {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"[Image copiée - {datetime.now().strftime('%d/%m/%Y %H:%M')}]\n(Upload ImgBB échoué - vérifiez la configuration)"}
                        }]
                    }
                }
        else:
            # Créer un bloc texte
            content_text = content
            if truncated and original_length:
                content_text += f"\n\n[Texte tronqué: {original_length} → {len(content)} caractères]"
                
            block = {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": content_text}
                    }]
                }
            }
        
        # Ajouter le bloc à la page
        notion.blocks.children.append(block_id=page_id, children=[block])
        
        # Mettre à jour les statistiques d'usage
        cache.preferences["usage_count"][page_id] = cache.preferences["usage_count"].get(page_id, 0) + 1
        cache.preferences["last_used_page"] = page_id
        
        # Ajouter à l'historique récent
        recent = cache.preferences.get("recent_pages", [])
        if page_id in recent:
            recent.remove(page_id)
        recent.insert(0, page_id)
        cache.preferences["recent_pages"] = recent[:10]
        
        cache.save_preferences()
        
        return jsonify({
            "success": True,
            "message": "Contenu envoyé avec succès",
            "type": "image" if is_image else "text",
            "truncated": truncated
        })
        
    except Exception as e:
        print(f"❌ Erreur envoi: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/send_multiple', methods=['POST'])
def send_to_multiple_pages():
    """Envoie le contenu vers plusieurs pages Notion."""
    try:
        data = request.get_json()
        page_ids = data.get('page_ids', [])
        content = data.get('content')
        content_type = data.get('content_type', 'text')
        is_image = data.get('is_image', False)
        truncated = data.get('truncated', False)
        original_length = data.get('original_length', 0)
        
        if not page_ids or not content:
            return jsonify({"error": "page_ids et content requis"}), 400
        
        if not notion:
            return jsonify({"error": "Token Notion non configuré"}), 400
        
        success_count = 0
        errors = []
        
        # Préparer le contenu une seule fois
        if is_image and content_type == 'image':
            image_url = upload_image_to_imgbb_improved(content)
            
            if image_url:
                block_template = {
                    "object": "block",
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": image_url}
                    }
                }
            else:
                block_template = {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"[Image copiée - {datetime.now().strftime('%d/%m/%Y %H:%M')}]"}
                        }]
                    }
                }
        else:
            content_text = content
            if truncated and original_length:
                content_text += f"\n\n[Texte tronqué: {original_length} → {len(content)} caractères]"
                
            block_template = {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": content_text}
                    }]
                }
            }
        
        # Envoyer vers chaque page avec rate limiting
        for page_id in page_ids:
            try:
                rate_limit_check()  # Appliquer rate limiting pour chaque page
                notion.blocks.children.append(block_id=page_id, children=[block_template])
                success_count += 1
                
                # Mettre à jour les stats
                cache.preferences["usage_count"][page_id] = cache.preferences["usage_count"].get(page_id, 0) + 1
                
            except Exception as e:
                errors.append(f"Page {page_id}: {str(e)}")
        
        # Mettre à jour l'historique récent avec toutes les pages utilisées
        recent = cache.preferences.get("recent_pages", [])
        for page_id in page_ids:
            if page_id in recent:
                recent.remove(page_id)
            recent.insert(0, page_id)
        cache.preferences["recent_pages"] = recent[:20]
        
        cache.save_preferences()
        
        return jsonify({
            "success": True,
            "message": f"Contenu envoyé vers {success_count} page(s)",
            "success_count": success_count,
            "total_count": len(page_ids),
            "errors": errors,
            "type": "image" if is_image else "text",
            "truncated": truncated
        })
        
    except Exception as e:
        print(f"❌ Erreur envoi multiple: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/refresh', methods=['POST'])
def refresh_cache():
    """Force le rafraîchissement du cache."""
    try:
        pages = fetch_pages_from_notion_advanced()
        
        return jsonify({
            "success": True,
            "pages_count": len(pages),
            "timestamp": cache.cache.get("timestamp")
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/check_updates')
def check_pages_updates():
    """Vérifie s'il y a eu des changements dans Notion."""
    try:
        if not notion:
            return jsonify({"error": "Notion non configuré"}), 400
        
        rate_limit_check()  # Appliquer rate limiting
        
        # Récupérer seulement la première page pour vérifier les changements
        response = notion.search(
            filter={"property": "object", "value": "page"},
            page_size=1,
            sort={"timestamp": "last_edited_time", "direction": "descending"}
        )
        
        if response["results"]: # type: ignore
            latest_page = response["results"][0] # type: ignore
            latest_edit_time = latest_page.get("last_edited_time", "")
            # Comparer avec le cache
            cached_latest = cache.cache.get("latest_edit_time", "")
            has_updates = latest_edit_time != cached_latest
            
            return jsonify({
                "has_updates": has_updates,
                "latest_edit_time": latest_edit_time,
                "cached_time": cached_latest
            })
        
        return jsonify({"has_updates": False})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Webhook pour les modifications Notion (fonctionnalité avancée)
@app.route('/api/webhook/notion', methods=['POST'])
def notion_webhook():
    """Webhook pour recevoir les notifications de modifications Notion."""
    try:
        # Cette fonctionnalité nécessiterait une configuration webhook dans Notion
        # Pour l'instant, on invalide simplement le cache
        cache.cache["timestamp"] = 0
        
        return jsonify({
            "success": True,
            "message": "Cache invalidé suite à modification"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Démarrage de Notion Clipper Pro Backend Enhanced...")
    # Charger la configuration
    load_configuration()
    print("API disponible sur http://localhost:5000")
    print(f"Token Notion: {'Configuré' if notion_token else 'Manquant'}")
    print(f"ImgBB: {'Configuré' if imgbb_key else 'Non configuré (images = texte)'}")
    print(f"Limite clipboard: {MAX_CLIPBOARD_LENGTH:,} caractères")
    print(f"Cache duration: {CACHE_DURATION//60} minutes")
    print(f"Rate limit: {max_requests_per_minute} req/min avec délai {RATE_LIMIT_DELAY}s")
    # Endpoints disponibles
    print("\nEndpoints disponibles:")
    print("  GET  /api/health - Vérification santé")
    print("  GET  /api/pages - Liste des pages")
    print("  GET  /api/clipboard - Contenu clipboard")
    print("  POST /api/config - Configuration")
    print("  POST /api/send - Envoi simple")
    print("  POST /api/send_multiple - Envoi multiple")
    print("  POST /api/refresh - Rafraîchir cache")
    print("  GET  /api/pages/check_updates - Vérifier les changements")
    app.run(host='127.0.0.1', port=5000, debug=False)