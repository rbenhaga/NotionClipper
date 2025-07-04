"""
Backend API pour Notion Clipper Pro - Version Optimisée
Architecture modulaire avec gestion intelligente des formats
"""

import os
import sys
import json
import time
import base64
import hashlib
import threading
import mimetypes
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any, List, Union, Tuple, cast
from collections import defaultdict
from functools import lru_cache
import asyncio
import signal
import getpass

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from notion_client import Client
from dotenv import load_dotenv
import requests
from PIL import Image
from backend.config import SecureConfig
from backend.cache import NotionCache
from backend.utils import get_clipboard_content, ClipboardManager
from backend.markdown_parser import validate_notion_blocks
from backend.enhanced_content_parser import EnhancedContentParser, parse_content_for_notion

sys.stdout.reconfigure(encoding="utf-8")  # type: ignore

# Configuration
load_dotenv()
app = Flask(__name__)

# Configuration CORS complète
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001", "*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

def handle_exit(signum, frame):
    print("Arrêt propre du backend (signal reçu)", flush=True)
    try:
        os.remove("notion_backend.pid")
    except Exception:
        pass
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_exit)
signal.signal(signal.SIGINT, handle_exit)

# Écrire le PID pour permettre l'arrêt propre
with open("notion_backend.pid", "w") as f:
    f.write(str(os.getpid()))

def ensure_sync_response(response):
    """S'assure que la réponse est bien synchrone (non async)"""
    if hasattr(response, '__aiter__'):
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(response.__aiter__().__anext__())
        finally:
            loop.close()
    elif hasattr(response, '__await__'):
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(response)
        finally:
            loop.close()
    return response

class NotionClipperBackend:
    def __init__(self):
        self.secure_config = SecureConfig()
        self.app_dir = self.secure_config.config_dir  # Correction ici
        self.load_configuration()
        self.clipboard_manager = ClipboardManager()
        self.cache = NotionCache(self.app_dir)  # type: ignore
        self.polling_manager = NotionPollingManager(self)
        self.image_handler = ImageHandler(self.imgbb_key)
        self.content_parser = EnhancedContentParser(self.imgbb_key)
        self.logs = []
        self.max_logs = 100
        
    def load_configuration(self):
        """Charge la configuration depuis le stockage sécurisé"""
        config = self.secure_config.load_config()
        self.notion_token = config.get("notionToken", "")
        self.imgbb_key = config.get("imgbbKey", "")
        self.preview_page_id = config.get("previewPageId", "")
        
        if self.notion_token:
            try:
                self.notion_client = Client(auth=self.notion_token)
            except Exception as e:
                self.notion_client = None
                self.add_log(f"Erreur init Notion: {str(e)}", "error")
        else:
            self.notion_client = None
            
    def add_log(self, message: str, level: str = "info"):
        """Ajoute un log avec timestamp"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message
        }
        self.logs.append(log_entry)
        if len(self.logs) > self.max_logs:
            self.logs = self.logs[-self.max_logs:]
        print(f"[{level.upper()}] {message}", flush=True)
    
    def detect_content_type(self, content: str) -> str:
        """Détecte le type de contenu"""
        return self.clipboard_manager._detect_text_type(content)
    
    def process_content(self, content: str, content_type: str, parse_markdown: bool = True) -> List[Dict[str, Any]]:
        """Traite le contenu selon son type - VERSION SIMPLIFIÉE"""
        # Utiliser uniquement l'EnhancedContentParser
        return self.content_parser.parse_content(content, content_type)
    
    def create_preview_page(self, parent_id: Optional[str] = None) -> Optional[str]:
        """Crée une page de prévisualisation Notion avec parent configurable"""
        if not self.notion_client:
            return None
            
        try:
            # Utiliser le parent fourni ou créer dans la workspace
            parent = {"type": "workspace"} if not parent_id else {
                "type": "page_id", 
                "page_id": parent_id
            }
            
            page = self.notion_client.pages.create(
                parent=parent,
                properties={
                    "title": {
                        "title": [{
                            "type": "text",
                            "text": {"content": "Notion Clipper Preview"}
                        }]
                    }
                },
                children=[{
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": "Cette page est utilisée pour prévisualiser le contenu avant l'envoi."}
                        }]
                    }
                }]
            )
            
            page = ensure_sync_response(page)
            return page["id"]  # type: ignore
            
        except Exception as e:
            self.add_log(f"Erreur création page preview: {str(e)}", "error")
            return None

class ImageHandler:
    """Gestion des images avec upload ImgBB"""
    def __init__(self, imgbb_api_key: str = ""):
        self.imgbb_api_key = imgbb_api_key
        
    def upload_to_imgbb(self, image_data: bytes) -> Optional[str]:
        if not self.imgbb_api_key:
            return None
            
        try:
            base64_image = base64.b64encode(image_data).decode('utf-8')
            response = requests.post(
                "https://api.imgbb.com/1/upload",
                data={
                    "key": self.imgbb_api_key,
                    "image": base64_image
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()["data"]["url"]
        except Exception as e:
            print(f"Erreur upload ImgBB: {e}")
            
        return None

class NotionPollingManager:
    """Gestionnaire de polling pour la synchronisation Notion"""
    def __init__(self, backend):
        self.backend = backend
        self.polling_thread = None
        self.stop_polling = threading.Event()
        self.last_poll_time = 0
        self.polling_interval = 30
        
    def start_polling(self):
        """Démarre le polling en arrière-plan"""
        if not self.polling_thread or not self.polling_thread.is_alive():
            self.stop_polling.clear()
            self.polling_thread = threading.Thread(target=self._polling_loop)
            self.polling_thread.daemon = True
            self.polling_thread.start()
            
    def stop(self):
        """Arrête le polling"""
        self.stop_polling.set()
        if self.polling_thread:
            self.polling_thread.join(timeout=5)
            
    def _polling_loop(self):
        """Boucle de polling principale"""
        while not self.stop_polling.is_set():
            try:
                if time.time() - self.last_poll_time >= self.polling_interval:
                    self.check_for_changes()
                    self.last_poll_time = time.time()
            except Exception as e:
                print(f"Erreur polling: {e}")
            
            self.stop_polling.wait(1)
            
    def check_for_changes(self):
        """Vérifie les changements dans Notion"""
        if not self.backend.notion_client:
            return
            
        try:
            # Synchronisation incrémentale
            changes = self._incremental_sync()
            if changes:
                self.backend.add_log(f"Changements détectés: {len(changes)} pages", "info")
                # Ici, on pourrait émettre des événements SSE avec les vraies données
                
        except Exception as e:
            self.backend.add_log(f"Erreur vérification changements: {str(e)}", "error")
            
    def _incremental_sync(self):
        """Synchronisation incrémentale optimisée"""
        # Implémentation simplifiée
        return []
    
    def update_single_page(self, page_id: str):
        """Met à jour une seule page dans le cache"""
        if page_id and self.backend.cache:
            try:
                # Mise à jour du cache pour cette page
                self.backend.cache.invalidate_page(page_id)
            except Exception:
                pass

# Instance globale du backend
backend = NotionClipperBackend()

# Routes API

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint de santé pour vérifier l'état du serveur"""
    return jsonify({
        "status": "ok",
        "version": "3.0.0",
        "timestamp": time.time(),
        "notion_connected": backend.notion_client is not None,
        "imgbb_configured": bool(backend.imgbb_key)
    }), 200

@app.route('/api/get_config', methods=['GET'])
def get_config():
    """Récupère la configuration actuelle"""
    config = backend.secure_config.load_config()
    has_notion_token = bool(config.get("notionToken"))
    has_imgbb_key = bool(config.get("imgbbKey"))
    
    first_run = not (has_notion_token and has_imgbb_key)
    onboarding_completed = bool(has_notion_token and has_imgbb_key)
    
    return jsonify({
        "notionToken": "configured" if has_notion_token else "",
        "imgbbKey": "configured" if has_imgbb_key else "",
        "previewPageId": config.get("previewPageId", ""),
        "firstRun": first_run,
        "onboardingCompleted": onboarding_completed
    }), 200

@app.route('/api/config', methods=['POST'])
def update_config():
    """Met à jour la configuration avec gestion améliorée de la page preview"""
    data = request.get_json() or {}
    notion_token = data.get("notionToken", "").strip()
    imgbb_key = data.get("imgbbKey", "").strip()
    preview_parent_id = data.get("previewParentId", "").strip()
    
    # Validation du token Notion
    from notion_client import Client as NotionClient
    try:
        test_client = NotionClient(auth=notion_token)
        test_client.users.me()
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Invalid Notion token: {str(e)}"
        }), 400
    
    # Gérer la page de preview
    preview_page_id = None
    preview_creation_error = None
    
    try:
        existing_config = backend.secure_config.load_config()
        preview_page_id = existing_config.get('previewPageId')
        notion_client = NotionClient(auth=notion_token)
        
        need_create = False
        if preview_page_id:
            try:
                page = notion_client.pages.retrieve(preview_page_id)
                page = ensure_sync_response(page)
                if isinstance(page, dict) and page.get('archived', False):
                    need_create = True
            except Exception:
                need_create = True
        else:
            need_create = True
        
        if need_create:
            temp_backend = NotionClipperBackend()
            temp_backend.notion_client = notion_client
            preview_page_id = temp_backend.create_preview_page(preview_parent_id)
            if not preview_page_id:
                preview_creation_error = (
                    "Impossible de créer la page de prévisualisation. "
                    "Vérifiez que l'intégration a accès à l'espace de travail."
                )
                
    except Exception as e:
        preview_creation_error = f"Erreur: {str(e)}"
    
    # Sauvegarder la configuration
    config_data = {
        "notionToken": notion_token,
        "imgbbKey": imgbb_key,
        "previewPageId": preview_page_id or "",
        "previewParentId": preview_parent_id
    }
    
    backend.secure_config.save_config(config_data)
    backend.load_configuration()
    
    response_data = {
        "success": True,
        "previewPageId": preview_page_id
    }
    
    if preview_creation_error:
        response_data["warning"] = preview_creation_error
    
    return jsonify(response_data), 200

@app.route('/api/clipboard/content', methods=['GET'])
def get_clipboard():
    """Récupère le contenu du presse-papiers"""
    content_data = backend.clipboard_manager.get_content()
    return jsonify(content_data), 200

@app.route('/api/clipboard/preview', methods=['POST'])
def preview_in_notion():
    """Prévisualise le contenu dans Notion"""
    if not backend.notion_client:
        return jsonify({"error": "Notion non configuré"}), 400
        
    data = request.get_json() or {}
    content = data.get('content', '')
    
    if not content or not backend.preview_page_id:
        return jsonify({"error": "Contenu ou page preview manquant"}), 400
    
    try:
        # Parser le contenu
        blocks = parse_content_for_notion(
            content=content,
            content_type=backend.detect_content_type(content),
            imgbb_key=backend.imgbb_key
        )
        
        # Vider et réécrire la page preview
        try:
            existing_blocks = backend.notion_client.blocks.children.list(backend.preview_page_id)
            existing_blocks = ensure_sync_response(existing_blocks)
            
            for block in existing_blocks.get('results', []):  # type: ignore
                try:
                    backend.notion_client.blocks.delete(block['id'])
                except:
                    pass
                    
        except Exception:
            pass
        
        # Ajouter les nouveaux blocs
        if blocks:
            # Ajouter un header
            header_block = {
                'type': 'heading_2',
                'heading_2': {
                    'rich_text': [{
                        'type': 'text',
                        'text': {'content': '📋 Preview du contenu'}
                    }]
                }
            }
            
            backend.notion_client.blocks.children.append(
                backend.preview_page_id,
                children=[header_block] + blocks[:99]
            )
        
        return jsonify({
            "success": True,
            "pageId": backend.preview_page_id,
            "url": f"https://notion.so/{backend.preview_page_id.replace('-', '')}"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/send', methods=['POST'])
def send_content():
    """Envoie du contenu vers Notion avec le parser unifié"""
    try:
        data = request.get_json()
        
        page_id = data.get('pageId')
        content = data.get('content', '')
        content_type = data.get('contentType', 'text')
        
        if not page_id:
            return jsonify({"error": "pageId requis"}), 400
        if not content and content_type != 'clipboard':
            return jsonify({"error": "Contenu vide"}), 400
        
        # Utiliser uniquement l'EnhancedContentParser
        blocks = parse_content_for_notion(
            content=content,
            content_type=content_type if content_type != 'text' else None,
            imgbb_key=backend.imgbb_key
        )
        
        blocks = validate_notion_blocks(blocks)
        
        if not blocks:
            return jsonify({"error": "Aucun bloc valide généré"}), 400
        
        if backend.notion_client:
            response = backend.notion_client.blocks.children.append(
                page_id, 
                children=blocks[:100]
            )
            response = ensure_sync_response(response)
            
            backend.polling_manager.update_single_page(page_id)
            backend.add_log(f"Contenu envoyé: {len(blocks)} blocs", "success")
            
            return jsonify({
                "success": True,
                "blocksCreated": len(blocks),
                "pageId": page_id
            }), 200
        else:
            return jsonify({"error": "Client Notion non initialisé"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Récupère les logs récents"""
    return jsonify({"logs": backend.logs})

@app.route('/api/events/stream')
def event_stream():
    """Server-Sent Events amélioré pour les changements en temps réel"""
    def generate():
        yield f"data: {json.dumps({'type': 'connected', 'timestamp': time.time()})}\n\n"
        
        last_update = time.time()
        while True:
            try:
                current_time = time.time()
                
                # Envoyer des updates périodiques avec des données utiles
                if current_time - last_update > 30:
                    # Ici on pourrait envoyer l'état actuel, les changements détectés, etc.
                    event_data = {
                        'type': 'status_update',
                        'timestamp': current_time,
                        'notion_connected': backend.notion_client is not None,
                        'cache_size': len(backend.cache.cache) if backend.cache else 0  # type: ignore
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"
                    last_update = current_time
                
                time.sleep(1)
                    
            except GeneratorExit:
                break
            except Exception as e:
                print(f"SSE error: {e}")
                break
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/pages', methods=['GET'])
def get_pages():
    """Retourne la liste des pages Notion (mock si besoin)"""
    # TODO: Remplacer par la vraie récupération des pages Notion
    # Pour l'instant, on retourne une liste vide ou un mock
    pages = []
    try:
        if backend.notion_client:
            # Exemple de récupération réelle (à adapter selon ton modèle)
            response = backend.notion_client.search(
                **{"filter": {"property": "object", "value": "page"}}
            )
            response = ensure_sync_response(response)
            if isinstance(response, dict):
                pages = response.get('results', [])
            else:
                # Si la réponse n'est pas un dict, utiliser une liste vide
                pages = []
        else:
            # Mock pour développement
            pages = [
                {
                    "id": "mock-page-1",
                    "title": "Page de test",
                    "last_edited": "2024-01-01T12:00:00Z",
                    "icon": None,
                    "parent_type": "workspace"
                }
            ]
    except Exception as e:
        return jsonify({"error": str(e), "pages": []}), 200
    return jsonify({"pages": pages}), 200

@app.route('/api/clipboard', methods=['GET'])
def clipboard_alias():
    """Alias pour /api/clipboard/content pour compatibilité frontend"""
    return get_clipboard()

@app.route('/api/preview/url', methods=['GET'])
def preview_url():
    """Retourne un mock d'aperçu pour une URL Notion (à adapter selon besoin)"""
    url = request.args.get('url', '')
    # Ici, tu pourrais ajouter une vraie logique d'extraction d'aperçu Notion
    if not url:
        return jsonify({"error": "Paramètre 'url' manquant"}), 400
    # Mock de réponse
    return jsonify({
        "success": True,
        "url": url,
        "title": "Aperçu Notion (mock)",
        "icon": None,
        "description": "Ceci est un aperçu factice pour l'URL fournie.",
        "preview": None
    }), 200

@app.route('/api/check_updates', methods=['GET'])
def check_updates():
    """Vérifie s'il existe une mise à jour (mock)"""
    return jsonify({
        "updateAvailable": False,
        "latestVersion": "3.0.0",
        "currentVersion": "3.0.0",
        "message": "Aucune mise à jour disponible."
    }), 200

if __name__ == "__main__":
    try:
        backend.add_log("Démarrage du serveur backend...", "info")
        backend.polling_manager.start_polling()
        
        # Mode production avec Waitress si disponible
        try:
            from waitress import serve
            backend.add_log("Serveur en mode production (Waitress)", "info")
            serve(app, host='0.0.0.0', port=5000, threads=4)
        except ImportError:
            # Fallback sur Flask dev server
            backend.add_log("Serveur en mode développement (Flask)", "warning")
            app.run(host='0.0.0.0', port=5000, debug=False)
            
    except Exception as e:
        print(f"Erreur démarrage serveur: {e}")
    finally:
        backend.polling_manager.stop()
        try:
            os.remove("notion_backend.pid")
        except:
            pass