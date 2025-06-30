#!/usr/bin/env python3
"""
Backend API pour Notion Clipper Pro - Version complète
Gère toutes les nouvelles fonctionnalités demandées
"""

import os
import json
import time
import base64
import tempfile
import threading
import io
import re
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
CACHE_DURATION = 1800  # 30 minutes
MAX_CLIPBOARD_LENGTH = 2000

# Variables globales
notion = None
notion_token = None
imgbb_key = None

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


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
                return {"pages": [], "timestamp": 0}
        return {"pages": [], "timestamp": 0}
    
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
    
    def update_cache(self, pages: List[NotionPage]):
        """Met à jour le cache avec de nouvelles pages."""
        self.cache = {
            "pages": [page.to_dict() for page in pages],
            "timestamp": time.time()
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
                    # Si la propriété title est vide, continuer à chercher
                    elif prop_data.get("type") == "title":
                        # C'est la propriété title mais elle est vide
                        return "Sans titre"
        # Pour les databases
        if "title" in page_or_db and page_or_db["title"]:
            title_text = "".join([
                text_obj.get("plain_text", "") 
                for text_obj in page_or_db["title"]
            ]).strip()
            if title_text:
                return title_text
    except Exception as e:
        print(f"Erreur extraction titre: {e}")
    return "Sans titre"


def fetch_pages_from_notion_advanced() -> List[NotionPage]:
    """Récupère toutes les pages depuis Notion avec gestion avancée."""
    if not notion:
        print("Client Notion non configure")
        return []
    pages = []
    try:
        print("Recuperation des pages depuis Notion...")
        # Limiter le nombre de requêtes avec une pause entre chaque batch
        has_more = True
        start_cursor = None
        page_count = 0
        batch_count = 0
        max_batches = 10  # Limiter à 10 batches maximum (500 pages)
        while has_more and batch_count < max_batches:
            search_params = {
                "filter": {"property": "object", "value": "page"},
                "page_size": 50,
                "sort": {
                    "timestamp": "last_edited_time",
                    "direction": "descending"
                }
            }
            if start_cursor:
                search_params["start_cursor"] = start_cursor
            try:
                response = notion.search(**search_params)
                for page_data in response["results"]: # type: ignore
                    try:
                        # Extraction améliorée
                        title = extract_title_advanced(page_data)
                        icon = extract_icon_advanced(page_data)
                        parent_title = get_parent_title_improved(page_data.get("parent", {}))
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
                # Pause entre les batches pour éviter la surcharge
                if has_more and batch_count < max_batches:
                    time.sleep(0.5)  # 500ms de pause
            except Exception as e:
                print(f"Erreur batch {batch_count}: {e}")
                break
        print(f"{page_count} pages recuperees en {batch_count} batches")
    except Exception as e:
        print(f"Erreur recuperation pages: {e}")
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
                                "size": len(image_data)
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
                        "size": len(image_data)
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
                    "original_length": original_length
                }
            else:
                return {
                    "type": "text",
                    "content": text,
                    "size": len(text),
                    "truncated": False,
                    "original_length": original_length
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
        "imgbb_configured": imgbb_key is not None
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
            # Récupérer depuis Notion
            pages = fetch_pages_from_notion_advanced()
            cache.update_cache(pages)
            pages_data = [page.to_dict() for page in pages]
            print(f"🔄 {len(pages_data)} pages depuis Notion")
        
        return jsonify({
            "pages": pages_data,
            "cached": not force_refresh and cache.is_cache_valid(),
            "timestamp": cache.cache.get("timestamp"),
            "count": len(pages_data)
        })
        
    except Exception as e:
        print(f"❌ Erreur get_pages: {e}")
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
        
        # Envoyer vers chaque page
        for page_id in page_ids:
            try:
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
        cache.preferences["recent_pages"] = recent[:20]  # Garder plus pour sélection multiple
        
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
        cache.update_cache(pages)
        
        return jsonify({
            "success": True,
            "pages_count": len(pages),
            "timestamp": cache.cache.get("timestamp")
        })
        
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


@app.route('/api/pages/check_updates')
def check_pages_updates():
    """Vérifie s'il y a eu des changements dans Notion."""
    try:
        if not notion:
            return jsonify({"error": "Notion non configure"}), 400
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


if __name__ == '__main__':
    print("Demarrage de Notion Clipper Pro Backend Enhanced...")
    # Charger la configuration
    load_configuration()
    print("API disponible sur http://localhost:5000")
    print(f"Token Notion: {'Configure' if notion_token else 'Manquant'}")
    print(f"ImgBB: {'Configure' if imgbb_key else 'Non configure (images = texte)'}")
    print(f"Limite clipboard: {MAX_CLIPBOARD_LENGTH:,} caracteres")
    print(f"Cache duration: {CACHE_DURATION//60} minutes")
    # Endpoints disponibles
    print("\nEndpoints disponibles:")
    print("  GET  /api/health - Verification sante")
    print("  GET  /api/pages - Liste des pages")
    print("  GET  /api/clipboard - Contenu clipboard")
    print("  POST /api/config - Configuration")
    print("  POST /api/send - Envoi simple")
    print("  POST /api/send_multiple - Envoi multiple")
    print("  POST /api/refresh - Rafraichir cache")
    print("  POST /api/webhook/notion - Webhook modifications")
    print("  GET  /api/pages/check_updates - Vérifier les changements")
    app.run(host='127.0.0.1', port=5000, debug=False)