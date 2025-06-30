#!/usr/bin/env python3
"""
Backend API pour Notion Clipper Pro
Gère la communication avec Notion et le cache local
"""

import os
import json
import time
import base64
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
import threading
import io

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

# Client Notion
notion_token = os.getenv("NOTION_TOKEN")
if not notion_token:
    raise ValueError("NOTION_TOKEN manquant dans .env")

notion = Client(auth=notion_token)

# Cache et préférences
CACHE_FILE = "notion_cache.json"
PREFERENCES_FILE = "notion_preferences.json"
CACHE_DURATION = 3600  # 1 heure


@dataclass
class NotionPage:
    """Représente une page Notion."""
    id: str
    title: str
    icon: Optional[str] = None
    parent_type: str = "page"
    parent_title: Optional[str] = None
    url: Optional[str] = None
    last_edited: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)


class NotionCache:
    """Gère le cache des pages Notion."""
    
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
        timestamp = self.cache.get("timestamp", 0)
        return (time.time() - timestamp) < CACHE_DURATION
    
    def get_pages(self) -> List[Dict]:
        """Retourne les pages en cache."""
        return self.cache.get("pages", [])
    
    def set_pages(self, pages: List[Dict]):
        """Met à jour le cache des pages."""
        self.cache = {
            "pages": pages,
            "timestamp": time.time()
        }
        self.save_cache()
    
    def update_usage(self, page_id: str):
        """Met à jour les statistiques d'usage."""
        # Dernière page utilisée
        self.preferences["last_used_page"] = page_id
        
        # Compteur d'usage
        usage_count = self.preferences.get("usage_count", {})
        usage_count[page_id] = usage_count.get(page_id, 0) + 1
        self.preferences["usage_count"] = usage_count
        
        # Pages récentes (garder les 10 dernières)
        recent = self.preferences.get("recent_pages", [])
        if page_id in recent:
            recent.remove(page_id)
        recent.insert(0, page_id)
        self.preferences["recent_pages"] = recent[:10]
        
        self.save_preferences()
    
    def toggle_favorite(self, page_id: str) -> bool:
        """Ajoute/retire des favoris."""
        favorites = self.preferences.get("favorites", [])
        if page_id in favorites:
            favorites.remove(page_id)
            is_favorite = False
        else:
            favorites.append(page_id)
            is_favorite = True
        
        self.preferences["favorites"] = favorites
        self.save_preferences()
        return is_favorite


# Instance globale du cache
cache = NotionCache()


def fetch_all_pages() -> List[NotionPage]:
    """Récupère toutes les pages depuis Notion."""
    all_pages = []
    try:
        has_more = True
        start_cursor = None
        while has_more:
            response = notion.search(
                filter={"property": "object", "value": "page"},
                page_size=100,
                start_cursor=start_cursor
            )
            # S'assurer que response est bien un dict
            if not isinstance(response, dict):
                raise TypeError("La réponse de Notion n'est pas un dictionnaire. Assurez-vous d'utiliser la version synchrone du client Notion.")
            for page in response.get("results", []):
                try:
                    # Extraire les informations
                    page_id = page.get("id", "")
                    # Titre
                    title = "Sans titre"
                    properties = page.get("properties", {})
                    for prop_name, prop_value in properties.items():
                        if prop_value.get("type") == "title":
                            title_items = prop_value.get("title", [])
                            if title_items:
                                title = title_items[0].get("plain_text", "Sans titre")
                            break
                    # Icône
                    icon = None
                    page_icon = page.get("icon", {})
                    if page_icon and page_icon.get("type") == "emoji":
                        icon = page_icon.get("emoji")
                    # Parent
                    parent = page.get("parent", {})
                    parent_type = parent.get("type", "workspace")
                    parent_title = None
                    # URL et dernière modification
                    url = page.get("url")
                    last_edited = page.get("last_edited_time", "")
                    notion_page = NotionPage(
                        id=page_id,
                        title=title,
                        icon=icon,
                        parent_type=parent_type,
                        parent_title=parent_title,
                        url=url,
                        last_edited=last_edited
                    )
                    all_pages.append(notion_page)
                except Exception as e:
                    print(f"Erreur traitement page: {e}")
                    continue
            has_more = response.get("has_more", False)
            start_cursor = response.get("next_cursor")
        return all_pages
    except Exception as e:
        print(f"Erreur fetch pages: {e}")
        return []


def upload_image_to_imgbb(image_data: bytes) -> Optional[str]:
    """Upload une image sur imgBB (gratuit)."""
    api_key = os.getenv("IMGBB_API_KEY")
    if not api_key:
        # Clé gratuite de test (remplacer par la vôtre)
        api_key = "your_free_imgbb_key"
    
    try:
        # Encoder en base64
        b64_image = base64.b64encode(image_data).decode('utf-8')
        
        response = requests.post(
            "https://api.imgbb.com/1/upload",
            data={
                "key": api_key,
                "image": b64_image
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["data"]["url"]
        else:
            print(f"Erreur imgBB: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Erreur upload: {e}")
        return None


# Routes API

@app.route('/api/pages', methods=['GET'])
def get_pages():
    """Retourne toutes les pages avec cache."""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if not force_refresh and cache.is_cache_valid():
        pages = cache.get_pages()
    else:
        # Récupérer depuis Notion
        notion_pages = fetch_all_pages()
        pages = [p.to_dict() for p in notion_pages]
        cache.set_pages(pages)
    
    # Enrichir avec les préférences
    preferences = cache.preferences
    for page in pages:
        page_id = page["id"]
        page["is_favorite"] = page_id in preferences.get("favorites", [])
        page["usage_count"] = preferences.get("usage_count", {}).get(page_id, 0)
        page["is_last_used"] = page_id == preferences.get("last_used_page")
    
    # Trier par favoris, puis usage, puis alphabétique
    pages.sort(key=lambda p: (
        not p["is_favorite"],  # Favoris en premier
        -p["usage_count"],     # Plus utilisés ensuite
        p["title"].lower()     # Alphabétique
    ))
    
    return jsonify({
        "pages": pages,
        "preferences": preferences,
        "cache_age": int(time.time() - cache.cache.get("timestamp", 0))
    })


@app.route('/api/send', methods=['POST'])
def send_to_notion():
    """Envoie du contenu vers Notion."""
    data = request.json
    if not data:
        return jsonify({"error": "Données manquantes"}), 400
    page_id = data.get("page_id")
    content = data.get("content")
    content_type = data.get("type", "text")
    if not page_id or not content:
        return jsonify({"error": "Données manquantes"}), 400
    try:
        children = []
        if content_type == "text":
            # Découper en paragraphes
            paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
            if not paragraphs:
                paragraphs = [content]
            for paragraph in paragraphs:
                # Limite de 2000 caractères par bloc
                for i in range(0, len(paragraph), 2000):
                    chunk = paragraph[i:i+2000]
                    children.append({
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{
                                "type": "text",
                                "text": {"content": chunk}
                            }]
                        }
                    })
        elif content_type == "image":
            # Décoder l'image base64
            image_data = base64.b64decode(content)
            # Upload sur imgBB
            image_url = upload_image_to_imgbb(image_data)
            if image_url:
                children.append({
                    "object": "block",
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": image_url}
                    }
                })
            else:
                # Fallback
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                children.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"🖼️ Image ajoutée le {timestamp}"},
                            "annotations": {"italic": True, "color": "gray"}
                        }]
                    }
                })
        # Envoyer à Notion
        if children:
            notion.blocks.children.append(
                block_id=page_id,
                children=children
            )
            # Mettre à jour l'usage
            cache.update_usage(page_id)
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Aucun contenu à envoyer"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/favorite', methods=['POST'])
def toggle_favorite():
    """Ajoute/retire des favoris."""
    data = request.json
    if not data:
        return jsonify({"error": "page_id manquant"}), 400
    page_id = data.get("page_id")
    if not page_id:
        return jsonify({"error": "page_id manquant"}), 400
    is_favorite = cache.toggle_favorite(page_id)
    return jsonify({"is_favorite": is_favorite})


@app.route('/api/clipboard', methods=['GET'])
def get_clipboard():
    """Récupère le contenu du presse-papiers."""
    try:
        # Essayer d'abord l'image
        from PIL import ImageGrab
        img = ImageGrab.grabclipboard()
        if img:
            # Si c'est une liste de chemins, ouvrir la première image
            if isinstance(img, list) and img:
                try:
                    img_obj = Image.open(img[0])
                except Exception:
                    img_obj = None
            elif isinstance(img, Image.Image):
                img_obj = img
            else:
                img_obj = None
            if img_obj:
                buffer = io.BytesIO()
                img_obj.save(buffer, format='PNG')
                img_data = base64.b64encode(buffer.getvalue()).decode()
                return jsonify({
                    "type": "image",
                    "content": img_data,
                    "width": img_obj.width,
                    "height": img_obj.height
                })
        # Sinon texte
        text = pyperclip.paste().strip()
        if text:
            return jsonify({
                "type": "text",
                "content": text,
                "length": len(text)
            })
        return jsonify({"type": "empty", "content": None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/refresh-cache', methods=['POST'])
def refresh_cache():
    """Force le rafraîchissement du cache."""
    try:
        notion_pages = fetch_all_pages()
        pages = [p.to_dict() for p in notion_pages]
        cache.set_pages(pages)
        return jsonify({"success": True, "count": len(pages)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Thread de mise à jour automatique du cache
def auto_refresh_cache():
    """Rafraîchit le cache périodiquement."""
    while True:
        time.sleep(CACHE_DURATION)
        try:
            notion_pages = fetch_all_pages()
            pages = [p.to_dict() for p in notion_pages]
            cache.set_pages(pages)
            print(f"Cache auto-refreshed: {len(pages)} pages")
        except Exception as e:
            print(f"Erreur auto-refresh: {e}")


# Démarrer le thread de mise à jour
refresh_thread = threading.Thread(target=auto_refresh_cache, daemon=True)
refresh_thread.start()


if __name__ == '__main__':
    app.run(port=5000, debug=False)