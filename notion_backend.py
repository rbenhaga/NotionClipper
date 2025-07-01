#!/usr/bin/env python3
"""
Backend API pour Notion Clipper Pro - Version améliorée
Avec vraie progression, webhook et optimisations
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
import queue
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Callable
from dataclasses import dataclass, asdict

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from notion_client import Client, AsyncClient
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
CACHE_DURATION = 300  # 5 minutes
MAX_CLIPBOARD_LENGTH = 2000
MAX_PAGES_PER_REQUEST = 50  # Augmenté pour moins de batches
RATE_LIMIT_DELAY = 0.1  # 100ms entre les requêtes
MAX_CONCURRENT_REQUESTS = 3  # Requêtes parallèles max

# Variables globales
notion = None
notion_async = None
notion_token = None
imgbb_key = None
last_api_call = 0
request_count = 0
max_requests_per_minute = 30  # Augmenté
update_queue = queue.Queue()
realtime_clients = []

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
    global notion, notion_async, notion_token, imgbb_key
    
    print("🔧 Chargement de la configuration...")
    
    # Essayer de charger depuis le fichier de config
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                print(f"  ✓ Fichier de config trouvé: {CONFIG_FILE}")
        except Exception as e:
            print(f"  ⚠️ Erreur lecture config: {e}")
    
    # Fallback vers les variables d'environnement
    notion_token = config.get('notionToken') or os.getenv("NOTION_TOKEN")
    imgbb_key = config.get('imgbbKey') or os.getenv("IMGBB_API_KEY")
    
    if notion_token:
        try:
            notion = Client(auth=notion_token)
            notion_async = AsyncClient(auth=notion_token)
            print(f"✅ Client Notion configuré avec succès")
            print(f"  Token: {notion_token[:10]}...")
            
            # Test de connexion
            test_response = notion.users.me()  # type: ignore
            print(f"  ✓ Connexion Notion OK - User: {test_response.get('name', 'Unknown')}")  # type: ignore
        except Exception as e:
            print(f"❌ Erreur configuration Notion: {e}")
            notion = None
            notion_async = None
    else:
        print("⚠️  Aucun token Notion configuré - L'app ne fonctionnera pas")
    
    print(f"  ImgBB: {'Configuré' if imgbb_key else 'Non configuré'}")

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
        self.page_titles = {}  # Cache des titres de pages
        self.lock = threading.Lock()
        
    def _load_cache(self) -> Dict:
        """Charge le cache depuis le fichier."""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Construire le cache des titres
                    if "pages" in data:
                        self.page_titles = {p["id"]: p["title"] for p in data["pages"]}
                    return data
            except:
                return {"pages": [], "timestamp": 0, "latest_edit_time": "", "page_count": 0}
        return {"pages": [], "timestamp": 0, "latest_edit_time": "", "page_count": 0}
    
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
        with self.lock:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
    
    def save_preferences(self):
        """Sauvegarde les préférences."""
        with self.lock:
            with open(self.preferences_file, 'w', encoding='utf-8') as f:
                json.dump(self.preferences, f, ensure_ascii=False, indent=2)
    
    def is_cache_valid(self) -> bool:
        """Vérifie si le cache est valide."""
        return (time.time() - self.cache.get("timestamp", 0)) < CACHE_DURATION
    
    def update_cache(self, pages: List[NotionPage], latest_edit_time: str = "", total_pages: int = 0):
        """Met à jour le cache avec de nouvelles pages."""
        with self.lock:
            self.cache = {
                "pages": [page.to_dict() for page in pages],
                "timestamp": time.time(),
                "latest_edit_time": latest_edit_time,
                "page_count": total_pages or len(pages)
            }
            # Mettre à jour le cache des titres
            self.page_titles = {page.id: page.title for page in pages}
        self.save_cache()
    
    def get_page_title(self, page_id: str) -> Optional[str]:
        """Récupère le titre d'une page depuis le cache."""
        return self.page_titles.get(page_id)
    
    def update_page_title(self, page_id: str, title: str):
        """Met à jour le titre d'une page dans le cache."""
        with self.lock:
            self.page_titles[page_id] = title
            # Mettre à jour dans les pages du cache
            for page in self.cache.get("pages", []):
                if page["id"] == page_id:
                    page["title"] = title
                    break
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
    """Récupère le titre du parent avec gestion d'erreur améliorée et cache."""
    try:
        if not parent_data or not notion:
            return None
        
        # Vérifier d'abord le cache
        parent_id = parent_data.get("page_id") or parent_data.get("database_id")
        if parent_id:
            cached_title = cache.get_page_title(parent_id)
            if cached_title:
                return cached_title
        
        rate_limit_check()  # Appliquer rate limiting
        
        if parent_data["type"] == "page_id":
            parent_page = notion.pages.retrieve(parent_data["page_id"])
            title = extract_title_advanced(parent_page)
            if title and parent_id:
                cache.update_page_title(parent_id, title)
            return title
        elif parent_data["type"] == "database_id":
            parent_db = notion.databases.retrieve(parent_data["database_id"])
            title = extract_title_advanced(parent_db)
            if title and parent_id:
                cache.update_page_title(parent_id, title)
            return title
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

async def fetch_pages_batch_async(start_cursor: Optional[str] = None) -> Dict:
    """Récupère un batch de pages de manière asynchrone."""
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
    
    if not notion_async:
        print("Client Notion async non configuré")
        return {}
    return await notion_async.search(**search_params)  # type: ignore

def fetch_pages_from_notion_advanced(progress_callback: Optional[Callable] = None) -> List[NotionPage]:
    """Récupère toutes les pages depuis Notion avec vraie progression."""
    if not notion:
        print("❌ Client Notion non configuré")
        return []
    
    pages = []
    try:
        print("🔍 Début de la récupération des pages...")
        
        # Première requête pour obtenir des infos
        rate_limit_check()
        
        if progress_callback:
            progress_callback(5, 100, "Connexion à Notion...")
        
        # Récupération progressive des pages
        has_more = True
        start_cursor = None
        page_count = 0
        batch_count = 0
        latest_edit_time = ""
        max_batches = 20  # Limite de sécurité
        
        while has_more and batch_count < max_batches:
            try:
                rate_limit_check()
                
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
                
                print(f"  Batch {batch_count + 1}: Récupération de {MAX_PAGES_PER_REQUEST} pages max...")
                response = notion.search(**search_params)
                
                batch_pages = 0
                for page_data in response["results"]:  # type: ignore
                    try:
                        # Extraction basique sans parent pour éviter les timeouts
                        title = extract_title_advanced(page_data)
                        icon = extract_icon_advanced(page_data)
                        
                        # Récupérer le latest_edit_time du premier élément
                        if page_count == 0:
                            latest_edit_time = page_data.get("last_edited_time", "")
                        
                        page = NotionPage(
                            id=page_data["id"],
                            title=title,
                            icon=icon,
                            parent_type=page_data.get("parent", {}).get("type", "page"),
                            parent_title=None,  # Skip pour éviter les timeouts
                            url=page_data.get("url"),
                            last_edited=page_data.get("last_edited_time"),
                            created_time=page_data.get("created_time")
                        )
                        pages.append(page)
                        page_count += 1
                        batch_pages += 1
                        
                        # Mettre à jour le cache des titres
                        cache.update_page_title(page_data["id"], title)
                        
                    except Exception as e:
                        print(f"    ⚠️ Erreur traitement page: {e}")
                
                print(f"  ✓ Batch {batch_count + 1}: {batch_pages} pages traitées")
                
                # Calcul du progrès
                progress = min(90, 10 + (batch_count * 80 / max_batches))
                if progress_callback:
                    progress_callback(
                        int(progress), 
                        100, 
                        f"{page_count} pages trouvées..."
                    )
                
                has_more = response.get("has_more", False)  # type: ignore
                start_cursor = response.get("next_cursor")  # type: ignore
                batch_count += 1
                
                # Limiter si trop de pages
                if page_count > 300:
                    print(f"  ⚠️ Limite atteinte: {page_count} pages")
                    break
                    
            except Exception as e:
                print(f"  ❌ Erreur batch {batch_count}: {e}")
                break
        
        if progress_callback:
            progress_callback(100, 100, f"Terminé - {page_count} pages")
        
        print(f"✅ Total: {page_count} pages récupérées en {batch_count} batches")
        
        # Mettre à jour le cache
        cache.update_cache(pages, latest_edit_time, page_count)
        
        # Notifier les changements
        notify_update({
            "type": "pages_updated",
            "count": page_count,
            "latest_edit": latest_edit_time
        })
        
    except Exception as e:
        print(f"❌ Erreur fatale récupération pages: {e}")
        import traceback
        traceback.print_exc()
    
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
                # Si c'est une image PIL.Image
                elif 'Image' in globals() and isinstance(image, Image.Image):
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

def notify_update(data: Dict):
    """Notifie les clients des mises à jour."""
    update_queue.put(data)

# Worker thread pour les notifications
def notification_worker():
    """Thread qui gère les notifications aux clients."""
    while True:
        try:
            update = update_queue.get(timeout=1)
            # Ici on pourrait implémenter WebSockets ou SSE
            print(f"📢 Notification: {update}")
        except:
            pass

# Démarrer le worker de notifications
notification_thread = threading.Thread(target=notification_worker, daemon=True)
notification_thread.start()

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
        "pages_count": len(cache.cache.get("pages", [])),
        "total_pages": cache.cache.get("page_count", 0)
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
            print("🔄 Récupération des pages depuis Notion...")
            # Récupération avec callback de progression
            def progress_callback(current, total, message):
                print(f"  Progress: {current}/{total} - {message}")
            
            pages = fetch_pages_from_notion_advanced(progress_callback)
            pages_data = [page.to_dict() for page in pages]
            print(f"✅ {len(pages_data)} pages récupérées depuis Notion")
        
        return jsonify({
            "pages": pages_data,
            "cached": not force_refresh and cache.is_cache_valid(),
            "timestamp": cache.cache.get("timestamp"),
            "count": len(pages_data),
            "total_pages": cache.cache.get("page_count", len(pages_data)),
            "latest_edit_time": cache.cache.get("latest_edit_time", "")
        })
        
    except Exception as e:
        print(f"❌ Erreur get_pages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "details": traceback.format_exc()}), 500

@app.route('/api/pages/progress')
def get_pages_with_progress():
    """Récupère les pages avec progression en temps réel via Server-Sent Events."""
    def generate():
        try:
            # Buffer pour stocker les messages
            progress_messages = []
            pages_result = []
            
            def progress_callback(current, total, message):
                nonlocal progress_messages
                progress_data = {
                    'progress': current,
                    'total': total,
                    'message': message
                }
                progress_messages.append(f"data: {json.dumps(progress_data)}\n\n")
            
            # Lancer la récupération dans un thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(fetch_pages_from_notion_advanced, progress_callback)
                
                # Envoyer les messages de progression
                while not future.done():
                    if progress_messages:
                        message = progress_messages.pop(0)
                        yield message
                    else:
                        time.sleep(0.1)
                
                # Récupérer le résultat
                pages = future.result()
                pages_data = [page.to_dict() for page in pages]
                
                # Envoyer les derniers messages de progression
                while progress_messages:
                    yield progress_messages.pop(0)
                
                # Envoyer le résultat final
                final_data = {
                    'progress': 100,
                    'pages': pages_data,
                    'complete': True,
                    'count': len(pages_data)
                }
                yield f"data: {json.dumps(final_data)}\n\n"
                
        except Exception as e:
            error_data = {'error': str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return Response(stream_with_context(generate()), mimetype='text/event-stream')

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
        
        rate_limit_check()
        
        # Préparer le contenu pour Notion
        if is_image and content_type == 'image':
            # Uploader l'image vers imgBB
            image_url = upload_image_to_imgbb_improved(content)
            
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
        
        # Notifier le changement
        notify_update({
            "type": "content_sent",
            "page_id": page_id,
            "content_type": content_type
        })
        
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
                rate_limit_check()
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
        
        # Notifier le changement
        notify_update({
            "type": "content_sent_multiple",
            "page_ids": page_ids,
            "success_count": success_count
        })
        
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
        
        rate_limit_check()
        
        # Récupérer seulement la première page pour vérifier les changements
        response = notion.search(
            filter={"property": "object", "value": "page"},
            page_size=1,
            sort={"timestamp": "last_edited_time", "direction": "descending"}
        )
        
        if response["results"]:  # type: ignore
            latest_page = response["results"][0]  # type: ignore
            latest_edit_time = latest_page.get("last_edited_time", "")
            # Comparer avec le cache
            cached_latest = cache.cache.get("latest_edit_time", "")
            has_updates = latest_edit_time != cached_latest
            
            # Si mise à jour, vérifier le titre aussi
            if has_updates:
                new_title = extract_title_advanced(latest_page)
                cache.update_page_title(latest_page["id"], new_title)
            
            return jsonify({
                "has_updates": has_updates,
                "latest_edit_time": latest_edit_time,
                "cached_time": cached_latest,
                "updated_page": {
                    "id": latest_page["id"],
                    "title": extract_title_advanced(latest_page)
                } if has_updates else None
            })
        
        return jsonify({"has_updates": False})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Webhook pour les modifications Notion
@app.route('/api/webhook/notion', methods=['POST'])
def notion_webhook():
    """Webhook pour recevoir les notifications de modifications Notion."""
    try:
        data = request.get_json()
        
        # Traiter la notification
        if data.get("type") == "page_updated":
            page_id = data.get("page_id")
            if page_id:
                # Mettre à jour le titre dans le cache
                rate_limit_check()
                if notion:
                    page = notion.pages.retrieve(page_id)
                else:
                    page = None
                new_title = extract_title_advanced(page)
                cache.update_page_title(page_id, new_title)
                
                # Notifier les clients
                notify_update({
                    "type": "page_title_updated",
                    "page_id": page_id,
                    "new_title": new_title
                })
        
        # Invalider le cache
        cache.cache["timestamp"] = 0
        
        return jsonify({
            "success": True,
            "message": "Webhook traité"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/subscribe')
def subscribe_to_updates():
    """Endpoint SSE pour s'abonner aux mises à jour en temps réel."""
    def generate():
        # Envoyer un message initial
        yield f"data: {json.dumps({'type': 'connected', 'timestamp': time.time()})}\n\n"
        
        # Boucle pour envoyer les mises à jour
        last_check = time.time()
        while True:
            try:
                # Vérifier les mises à jour toutes les 10 secondes
                if time.time() - last_check > 10:
                    # Vérifier s'il y a des changements
                    try:
                        response = check_pages_updates()
                        # Gérer le cas où la réponse est un tuple (Response, code)
                        if isinstance(response, tuple):
                            resp_obj = response[0]
                        else:
                            resp_obj = response
                        data = resp_obj.get_json()
                        if data.get("has_updates"):
                            yield f"data: {json.dumps({'type': 'pages_updated', 'data': data})}\n\n"
                    except:
                        pass
                    last_check = time.time()
                
                # Envoyer les notifications en attente
                try:
                    update = update_queue.get(timeout=1)
                    yield f"data: {json.dumps(update)}\n\n"
                except:
                    pass
                    
            except GeneratorExit:
                break
            except Exception as e:
                print(f"SSE error: {e}")
                break
    
    return Response(stream_with_context(generate()), mimetype='text/event-stream')

if __name__ == '__main__':
    print("🚀 Démarrage de Notion Clipper Pro Backend Enhanced v2...")
    # Charger la configuration
    load_configuration()
    print("API disponible sur http://localhost:5000")
    print(f"Token Notion: {'Configuré' if notion_token else 'Manquant'}")
    print(f"ImgBB: {'Configuré' if imgbb_key else 'Non configuré (images = texte)'}")
    print(f"Limite clipboard: {MAX_CLIPBOARD_LENGTH:,} caractères")
    print(f"Cache duration: {CACHE_DURATION//60} minutes")
    print(f"Rate limit: {max_requests_per_minute} req/min avec délai {RATE_LIMIT_DELAY}s")
    print("\n✨ Nouvelles fonctionnalités:")
    print("  - Progression en temps réel via SSE")
    print("  - Cache des titres de pages")
    print("  - Notifications de mises à jour")
    print("  - Support webhook (en attente)")
    print("  - Optimisations de performance")
    print("\nEndpoints disponibles:")
    print("  GET  /api/health - Vérification santé")
    print("  GET  /api/pages - Liste des pages")
    print("  GET  /api/pages/progress - Pages avec progression SSE")
    print("  GET  /api/clipboard - Contenu clipboard")
    print("  POST /api/config - Configuration")
    print("  POST /api/send - Envoi simple")
    print("  POST /api/send_multiple - Envoi multiple")
    print("  POST /api/refresh - Rafraîchir cache")
    print("  GET  /api/pages/check_updates - Vérifier les changements")
    print("  GET  /api/subscribe - S'abonner aux mises à jour SSE")
    print("  POST /api/webhook/notion - Webhook Notion")
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)