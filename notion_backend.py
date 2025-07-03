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

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from notion_client import Client
from dotenv import load_dotenv
import requests
from PIL import Image
from backend.config import SecureConfig
from backend.cache import NotionCache
from backend.martian_parser import markdown_to_blocks
from backend.utils import get_clipboard_content, ClipboardManager
from backend.markdown_parser import validate_notion_blocks
from backend.enhanced_content_parser import EnhancedContentParser, parse_content_for_notion


sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

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

# Écrit le PID dans un fichier pour Electron
with open("notion_backend.pid", "w") as f:
    f.write(str(os.getpid()))

# Utilitaire pour forcer un objet Notion en dict
def ensure_dict(obj) -> Dict[str, Any]:
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, 'copy') and callable(obj.copy):
        d = obj.copy()
        if isinstance(d, dict):
            return d
    if hasattr(obj, '__dict__'):
        d = dict(obj.__dict__)
        if isinstance(d, dict):
            return d
    raise TypeError("Impossible de convertir l'objet Notion en dict")

# Utilitaire pour forcer un objet Awaitable en résultat synchrone
def ensure_sync_response(response):
    if hasattr(response, "__await__"):
        # Résoudre l'awaitable dans un contexte synchrone
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop.run_until_complete(response)
    return response

class NotionClipperBackend:
    """Classe principale gérant toute la logique backend"""
    
    def __init__(self):
        self.secure_config = SecureConfig()
        self.app_dir = self.secure_config.config_dir
        self.notion_client: Optional[Client] = None
        self.imgbb_key: Optional[str] = None
        
        # Cache intelligent
        self.cache = NotionCache(self.app_dir)
        self.polling_manager = SmartPollingManager(self)
        self.clipboard_manager = ClipboardManager()
        
        # Statistiques
        self.stats = dict()
        self.stats['start_time'] = time.time()
        self.stats['api_calls'] = 0
        self.stats['cache_hits'] = 0
        self.stats['cache_misses'] = 0
        self.stats['images_uploaded'] = 0
        self.stats['content_processed'] = 0
        self.stats['errors'] = 0
        self.stats['changes_detected'] = 0
        
        # Formats supportés
        self.format_handlers = {
            'text': self._handle_text,
            'markdown': self._handle_markdown,
            'image': self._handle_image,
            'video': self._handle_video,
            'audio': self._handle_audio,
            'document': self._handle_document,
            'table': self._handle_table,
            'code': self._handle_code,
            'url': self._handle_url,
            'file': self._handle_file
        }
        
        # Détecteurs de format
        self.format_detectors = [
            (self._is_image, 'image'),
            (self._is_video, 'video'),
            (self._is_audio, 'audio'),
            (self._is_table, 'table'),
            (self._is_code, 'code'),
            (self._is_url, 'url'),
            (self._is_markdown, 'markdown'),
            (self._is_document, 'document')
        ]
        
        # Ajout du parser avancé
        self.content_parser = EnhancedContentParser(imgbb_key=self.imgbb_key)
    
    def initialize(self):
        """Initialise la configuration et les services"""
        config = self.secure_config.load_config()
        notion_token = config.get('notionToken') or os.getenv('NOTION_TOKEN')
        self.imgbb_key = config.get('imgbbKey') or os.getenv('IMGBB_API_KEY')
        
        if notion_token:
            self.notion_client = Client(auth=notion_token)
            self.polling_manager.start()
            return True
        return False
    
    def detect_content_type(self, content: str, mime_type: Optional[str] = None) -> str:
        """Détecte intelligemment le type de contenu"""
        # Si mime_type fourni, l'utiliser en priorité
        if mime_type:
            if mime_type.startswith('image/'):
                return 'image'
            elif mime_type.startswith('video/'):
                return 'video'
            elif mime_type.startswith('audio/'):
                return 'audio'
            elif mime_type in ['text/markdown', 'text/x-markdown']:
                return 'markdown'
            elif mime_type.startswith('text/'):
                return 'text'
        
        # Détection basée sur le contenu
        for detector, content_type in self.format_detectors:
            if detector(content):
                return content_type
        
        return 'text'  # Défaut
    
    def _is_image(self, content: str) -> bool:
        """Détecte si le contenu est une image"""
        if content.startswith('data:image/'):
            return True
        
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'}
        lower_content = content.lower()
        
        if any(content.endswith(ext) for ext in image_extensions):
            return True
        
        if content.startswith(('http://', 'https://')):
            path = content.split('?')[0].lower()
            return any(path.endswith(ext) for ext in image_extensions)
        
        return False
    
    def _is_video(self, content: str) -> bool:
        """Détecte si le contenu est une vidéo"""
        video_patterns = [
            'youtube.com/watch', 'youtu.be/', 'vimeo.com/',
            'dailymotion.com/', 'twitch.tv/', 'loom.com/'
        ]
        return any(pattern in content for pattern in video_patterns)
    
    def _is_audio(self, content: str) -> bool:
        """Détecte si le contenu est audio"""
        audio_extensions = {'.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'}
        audio_patterns = ['soundcloud.com/', 'spotify.com/', 'music.apple.com/']
        
        lower_content = content.lower()
        return (any(content.endswith(ext) for ext in audio_extensions) or
                any(pattern in lower_content for pattern in audio_patterns))
    
    def _is_table(self, content: str) -> bool:
        """Détecte si le contenu est un tableau"""
        lines = content.strip().split('\n')
        if len(lines) < 2:
            return False
        
        # Détection de séparateurs cohérents
        separators = ['\t', '|', ',']
        for sep in separators:
            if all(sep in line for line in lines[:3]):
                return True
        
        return False
    
    def _is_code(self, content: str) -> bool:
        """Détecte si le contenu est du code"""
        code_indicators = [
            'function', 'def ', 'class ', 'import ', 'const ', 'let ', 'var ',
            '```', 'public static', 'private ', '#!/', '<?php'
        ]
        return any(indicator in content for indicator in code_indicators)
    
    def _is_url(self, content: str) -> bool:
        """Détecte si le contenu est une URL"""
        return content.strip().startswith(('http://', 'https://')) and '\n' not in content
    
    def _is_markdown(self, content: str) -> bool:
        """Détecte si le contenu est en Markdown"""
        markdown_patterns = [
            r'^#{1,6} ', r'\*\*\w+\*\*', r'\[.+\]\(.+\)',
            r'^\* ', r'^\d+\. ', r'^- ', r'```'
        ]
        import re
        return any(re.search(pattern, content, re.MULTILINE) for pattern in markdown_patterns)
    
    def _is_document(self, content: str) -> bool:
        """Détecte si le contenu est un document"""
        doc_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'}
        return any(content.lower().endswith(ext) for ext in doc_extensions)
    

    
    def _handle_text(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère le contenu texte"""
        if parse_markdown and self._is_markdown(content):
            try:
                # Passer la clé ImgBB au parser
                return markdown_to_blocks(content, imgbb_key=self.imgbb_key)
            except:
                # Fallback si l'import échoue
                return [self._create_paragraph_block(content)]
        
        # Diviser en paragraphes si le texte est long
        paragraphs = content.split('\n\n')
        blocks = []
        
        for para in paragraphs:
            if para.strip():
                blocks.append({
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": para.strip()[:2000]}
                        }]
                    }
                })
        
        return blocks or [self._create_paragraph_block(content)]
    
    def _handle_markdown(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère le contenu Markdown"""
        if parse_markdown:
            try:
                # Passer la clé ImgBB au parser
                return markdown_to_blocks(content, imgbb_key=self.imgbb_key)
            except:
                return [self._create_paragraph_block(content)]
        return self._handle_text(content, False)
    
    def _handle_image(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère les images avec upload intelligent"""
        # Si c'est une data URL, uploader vers ImgBB
        if content.startswith('data:image/'):
            if self.imgbb_key:
                uploaded_url = self._upload_to_imgbb(content)
                if uploaded_url:
                    return [{
                        "type": "image",
                        "image": {
                            "type": "external",
                            "external": {"url": uploaded_url}
                        }
                    }]
            
            # Fallback si pas d'upload possible
            return [{
                "type": "callout",
                "callout": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "🖼️ Image détectée. Configurez ImgBB pour l'upload automatique."}
                    }],
                    "icon": {"emoji": "🖼️"},
                    "color": "yellow_background"
                }
            }]
        
        # URL directe
        return [{
            "type": "image",
            "image": {
                "type": "external",
                "external": {"url": content.strip()}
            }
        }]
    
    def _handle_video(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère les vidéos avec détection de plateforme"""
        # Normaliser l'URL YouTube si nécessaire
        if 'youtube.com' in content or 'youtu.be' in content:
            video_url = self._normalize_youtube_url(content)
            if video_url:
                return [{
                    "type": "video",
                    "video": {
                        "type": "external",
                        "external": {"url": video_url}
                    }
                }]
        
        # Autres plateformes vidéo
        if any(platform in content for platform in ['vimeo.com', 'dailymotion.com', 'loom.com']):
            return [{
                "type": "video",
                "video": {
                    "type": "external",
                    "external": {"url": content.strip()}
                }
            }]
        
        # Fallback en bookmark
        return [{
            "type": "bookmark",
            "bookmark": {"url": content.strip()}
        }]
    
    def _handle_audio(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère les fichiers et liens audio"""
        # Pour l'instant, Notion ne supporte pas directement l'audio
        # On utilise un bloc embed ou bookmark
        if any(platform in content for platform in ['soundcloud.com', 'spotify.com']):
            return [{
                "type": "embed",
                "embed": {"url": content.strip()}
            }]
        
        return [{
            "type": "bookmark",
            "bookmark": {"url": content.strip()}
        }]
    
    def _handle_document(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère les documents"""
        return [{
            "type": "file",
            "file": {
                "type": "external",
                "external": {"url": content.strip()}
            }
        }]
    
    def _handle_table(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère les tableaux avec détection intelligente du format"""
        lines = [line.strip() for line in content.strip().split('\n') if line.strip()]
        if not lines:
            return []
        
        # Détecter le séparateur
        separator = self._detect_table_separator(lines[0])
        if not separator:
            return self._handle_text(content)
        
        # Parser le tableau
        rows = []
        max_cols = 0
        
        for line in lines:
            cells = [cell.strip() for cell in line.split(separator)]
            rows.append(cells)
            max_cols = max(max_cols, len(cells))
        
        # Normaliser les colonnes
        for row in rows:
            while len(row) < max_cols:
                row.append("")
        
        # Créer le bloc table
        return [{
            "type": "table",
            "table": {
                "table_width": max_cols,
                "has_column_header": True,
                "has_row_header": False,
                "children": [
                    {
                        "type": "table_row",
                        "table_row": {
                            "cells": [
                                [{
                                    "type": "text",
                                    "text": {"content": str(cell)[:2000]}
                                }]
                                for cell in row
                            ]
                        }
                    }
                    for row in rows
                ]
            }
        }]
    
    def _handle_code(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère les blocs de code avec détection du langage"""
        # Détecter le langage si possible
        language = self._detect_code_language(content)
        
        return [{
            "type": "code",
            "code": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": content[:2000]}
                }],
                "language": language
            }
        }]
    
    def _handle_url(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère les URLs avec prévisualisation"""
        return [{
            "type": "bookmark",
            "bookmark": {"url": content.strip()}
        }]
    
    def _handle_file(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère les fichiers génériques"""
        # Détecter le type MIME
        mime_type, _ = mimetypes.guess_type(content)
        
        if mime_type:
            if mime_type.startswith('image/'):
                return self._handle_image(content)
            elif mime_type.startswith('video/'):
                return self._handle_video(content)
            elif mime_type.startswith('audio/'):
                return self._handle_audio(content)
        
        # Fallback
        return self._handle_document(content)
    
    def _detect_table_separator(self, line: str) -> Optional[str]:
        """Détecte le séparateur de tableau"""
        separators = ['\t', '|', ',', ';']
        separator_counts = dict()
        
        for sep in separators:
            count = line.count(sep)
            if count > 0:
                separator_counts[sep] = count
        
        if separator_counts:
            return max(separator_counts, key=lambda k: separator_counts[k])
        
        return None
    
    def _detect_code_language(self, content: str) -> str:
        """Détecte le langage de programmation"""
        language_patterns = {
            'python': ['def ', 'import ', 'from ', '__init__', 'self.'],
            'javascript': ['function', 'const ', 'let ', 'var ', '=>', 'console.'],
            'java': ['public class', 'private ', 'protected ', 'static void'],
            'cpp': ['#include', 'std::', 'cout', 'cin', 'namespace'],
            'csharp': ['using System', 'namespace ', 'public class', 'static void Main'],
            'html': ['<html', '<div', '<span', '<body', '<!DOCTYPE'],
            'css': ['{', '}', ':', ';', 'px', 'color:', 'background:'],
            'sql': ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'CREATE TABLE'],
            'json': ['{"', '"}', '": "', '": {', '": ['],
            'yaml': [':', '-', 'name:', 'version:', 'services:']
        }
        
        content_lower = content.lower()
        scores = dict()
        
        for lang, patterns in language_patterns.items():
            for pattern in patterns:
                if pattern.lower() in content_lower:
                    scores[lang] = scores.get(lang, 0) + 1
        
        if scores:
            return max(scores, key=lambda k: scores[k])
        
        return 'plain text'
    
    def _normalize_youtube_url(self, url: str) -> Optional[str]:
        """Normalise les URLs YouTube"""
        import re
        
        patterns = [
            r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
            r'(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})',
            r'(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]{11})',
            r'(?:https?://)?m\.youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                video_id = match.group(1)
                return f"https://www.youtube.com/watch?v={video_id}"
        
        return None
    
    def _upload_to_imgbb(self, base64_data: str) -> Optional[str]:
        """Upload une image vers ImgBB avec retry et optimisation"""
        if not self.imgbb_key:
            return None
        
        try:
            # Extraire les données base64
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]
            
            # Optimiser l'image si elle est trop grande
            image_data = base64.b64decode(base64_data)
            if len(image_data) > 5 * 1024 * 1024:  # 5MB
                image_data = self._optimize_image(image_data)
                base64_data = base64.b64encode(image_data).decode()
            
            # Upload avec retry
            for attempt in range(3):
                try:
                    response = requests.post(
                        'https://api.imgbb.com/1/upload',
                        data={
                            'key': self.imgbb_key,
                            'image': base64_data
                        },
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get('success'):
                            url = result['data']['url']
                            self.stats['images_uploaded'] += 1
                            return url
                    
                except requests.RequestException:
                    if attempt < 2:
                        time.sleep(1)  # Attendre avant retry
                    continue
            
        except Exception as e:
            print(f"Erreur upload: {e}")
        
        return None
    
    def _optimize_image(self, image_data: bytes) -> bytes:
        """Optimise une image pour réduire sa taille"""
        from io import BytesIO
        
        img = Image.open(BytesIO(image_data))
        
        # Convertir en RGB si nécessaire
        if img.mode in ('RGBA', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        
        # Redimensionner si trop grand
        max_dimension = 2048
        if img.width > max_dimension or img.height > max_dimension:
            img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        
        # Sauvegarder avec compression
        output = BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        return output.getvalue()
    
    def _create_paragraph_block(self, text: str) -> Dict[str, Any]:
        """Crée un bloc paragraphe simple"""
        return {
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": text[:2000]}
                }]
            }
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques d'utilisation"""
        uptime = time.time() - self.stats['start_time']
        return {
            "uptime": uptime,
            "api_calls": self.stats['api_calls'],
            "cache_hits": self.stats['cache_hits'],
            "cache_misses": self.stats['cache_misses'],
            "images_uploaded": self.stats['images_uploaded'],
            "content_processed": self.stats['content_processed'],
            "errors": self.stats['errors']
        }

    def _send_to_notion_with_result(self, page_id: str, blocks: List[Dict]) -> dict:
        """Envoie les blocs à Notion et retourne un dict de succès ou d'erreur détaillée."""
        if not self.notion_client:
            return {
                "success": False,
                "error": "Notion client non configuré"
            }
        try:
            result = self.notion_client.blocks.children.append(
                block_id=page_id,
                children=blocks
            )
            result = ensure_dict(result)
            if not (isinstance(result, dict) and result.get("object") == "list"):
                msg = result.get("message") or result.get("error") or "Erreur inconnue de Notion"
                return {
                    "success": False,
                    "error": f"Notion API: {msg}"
                }
            return {"success": True}
        except Exception as e:
            return {
                "success": False,
                "error": f"Exception interne: {str(e)}"
            }

    def get_recent_logs(self) -> list:
        """Retourne les logs récents (placeholder)"""
        return ["Aucun log disponible (fonctionnalité à implémenter)"]

    # Nouvelle méthode process_content avec support du parser avancé
    def process_content(self, content: str, content_type: str, 
                       parse_markdown: bool = True, **kwargs) -> List[Dict]:
        """Traite le contenu avec le nouveau parser"""
        # Si le mode parsing avancé est activé
        if kwargs.get('use_enhanced_parser', True):
            return self.content_parser.parse_content(
                content=content,
                content_type=content_type if content_type != 'text' else None
            )
        # Sinon, utiliser l'ancienne méthode
        handler = self.format_handlers.get(content_type)
        if handler:
            return handler(content, parse_markdown)
        # Fallback
        return self._handle_text(content, parse_markdown)

    def create_preview_page(self):
        """Crée la page de preview dans Notion et retourne son ID (parent forcé pour debug)"""
        if not self.notion_client:
            return None
        try:
            # Rechercher d'abord si une page preview existe déjà
            search_response = self.notion_client.search(
                query="Notion Clipper Preview",
                filter={"property": "object", "value": "page"}
            )
            search_response = ensure_sync_response(search_response)
            if isinstance(search_response, dict):
                results = search_response.get("results", [])
            else:
                results = []
            if not isinstance(results, list):
                results = []
            for page in results:
                page = ensure_sync_response(page)
                if isinstance(page, dict):
                    title = self.polling_manager._get_page_title(page) if hasattr(self, 'polling_manager') else ""
                    if "Notion Clipper Preview" in title:
                        return page["id"]
            # Sinon, créer la page sous le parent fourni en dur
            preview_page = self.notion_client.pages.create(
                parent={"type": "page_id", "page_id": "225d744ed272800c98e6f48ca823bed8"},
                icon={"type": "emoji", "emoji": "👁️"},
                properties={
                    "title": {
                        "title": [{
                            "type": "text",
                            "text": {"content": "Notion Clipper Preview"}
                        }]
                    }
                },
                children=[{
                    "type": "heading_1",
                    "heading_1": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": "📋 Preview du contenu"}
                        }]
                    }
                }, {
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": "Cette page affiche un aperçu du contenu qui sera envoyé vers Notion."}
                        }]
                    }
                }, {
                    "type": "divider",
                    "divider": {}
                }]
            )
            preview_page = ensure_sync_response(preview_page)
            if isinstance(preview_page, dict):
                return preview_page["id"]
            return None
        except Exception as e:
            print(f"Erreur création page preview: {e}")
            return None

    def update_preview_page(self, content: str, content_type: str = 'text'):
        """Met à jour la page de preview avec le nouveau contenu"""
        config = self.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if not preview_page_id or not self.notion_client:
            return False
            
        try:
            # IMPORTANT: Supprimer TOUS les blocs existants de la page
            print(f"Vidage de la page preview {preview_page_id}...")
            
            # Récupérer tous les blocs de la page
            all_blocks = []
            has_more = True
            start_cursor = None
            
            while has_more:
                if start_cursor:
                    response = self.notion_client.blocks.children.list(
                        block_id=preview_page_id,
                        start_cursor=start_cursor
                    )
                else:
                    response = self.notion_client.blocks.children.list(
                        block_id=preview_page_id
                    )
                
                response = ensure_sync_response(response)
                
                if isinstance(response, dict):
                    results = response.get("results", [])
                    all_blocks.extend(results)
                    has_more = response.get("has_more", False)
                    start_cursor = response.get("next_cursor")
                else:
                    break
            
            # Supprimer tous les blocs
            deleted_count = 0
            for block in all_blocks:
                if isinstance(block, dict):
                    try:
                        self.notion_client.blocks.delete(block_id=block["id"])
                        deleted_count += 1
                    except Exception as e:
                        print(f"Impossible de supprimer le bloc {block['id']}: {e}")
            
            print(f"Page vidée : {deleted_count} blocs supprimés")
            
            # Préparer le nouveau contenu
            if content_type == 'clipboard':
                clipboard_content = self.clipboard_manager.get_content()
                content = clipboard_content.get('content', '')
                content_type = clipboard_content.get('type', 'text')
            
            # Parser le contenu avec le parser avancé
            if hasattr(self, 'content_parser') and self.content_parser:
                blocks = self.content_parser.parse_content(
                    content=content,
                    content_type=content_type if content_type != 'text' else None
                )
            else:
                # Fallback
                blocks = self.process_content(
                    content=content,
                    content_type=content_type,
                    parse_markdown=True
                )
            
            # Limiter et valider les blocs
            from backend.markdown_parser import validate_notion_blocks
            blocks = validate_notion_blocks(blocks[:100])  # Limiter à 100 blocs
            
            # Ajouter un header pour identifier clairement que c'est une preview
            header_blocks = [
                {
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": "📋 Preview du contenu"}
                        }]
                    }
                },
                {
                    "type": "divider",
                    "divider": {}
                }
            ]
            
            # Ajouter tous les blocs d'un coup
            all_blocks_to_add = header_blocks + blocks
            
            if all_blocks_to_add:
                # Envoyer par batch de 100 blocs max
                for i in range(0, len(all_blocks_to_add), 100):
                    batch = all_blocks_to_add[i:i+100]
                    self.notion_client.blocks.children.append(
                        block_id=preview_page_id,
                        children=batch
                    )
                
                print(f"Preview mise à jour avec {len(blocks)} blocs")
            
            return True
            
        except Exception as e:
            print(f"Erreur mise à jour preview: {e}")
            import traceback
            traceback.print_exc()
            return False

class SmartPollingManager:
    """Gestionnaire de polling optimisé avec détection intelligente"""
    
    def __init__(self, backend: NotionClipperBackend):
        self.backend = backend
        self.running = False
        self.thread = None
        self.check_interval = 30  # secondes
        self.sync_interval = 300  # 5 minutes
        self.last_sync = 0
        self.page_checksums = {}
    
    def start(self):
        """Démarre le polling"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._poll_loop, daemon=True)
            self.thread.start()
    
    def stop(self):
        """Arrête le polling"""
        self.running = False
    
    def _poll_loop(self):
        """Boucle de polling principale"""
        while self.running:
            try:
                current_time = time.time()
                
                # Check rapide des changements
                if self._quick_check():
                    self._incremental_sync()
                
                # Sync complète périodique
                if current_time - self.last_sync > self.sync_interval:
                    self._full_sync()
                    self.last_sync = current_time
                
                time.sleep(self.check_interval)
                
            except Exception as e:
                print(f"Erreur polling: {e}")
                time.sleep(60)
    
    def _quick_check(self) -> bool:
        """Vérifie rapidement s'il y a des changements"""
        if not self.backend.notion_client:
            return False
        
        try:
            # Récupérer la page la plus récemment modifiée
            response = self.backend.notion_client.search(
                filter={"property": "object", "value": "page"},
                page_size=1,
                sort={"timestamp": "last_edited_time", "direction": "descending"}
            )
            response = ensure_sync_response(response)
            if response and response.get("results"): #type: ignore
                latest = response["results"][0] #type: ignore
                checksum = self._calculate_checksum(latest)
                if latest["id"] not in self.page_checksums or \
                   self.page_checksums[latest["id"]] != checksum:
                    return True
            return False
        except Exception:
            return False
    
    def _incremental_sync(self):
        """Synchronisation incrémentale des changements"""
        if not self.backend.notion_client:
            return
        
        try:
            # Récupérer les pages récemment modifiées
            response = self.backend.notion_client.search(
                filter={"property": "object", "value": "page"},
                page_size=50,
                sort={"timestamp": "last_edited_time", "direction": "descending"}
            )
            response = ensure_sync_response(response)
            updated_count = 0
            if response and response.get("results"): #type: ignore
                for page in response.get("results", []): #type: ignore
                    checksum = self._calculate_checksum(page)
                    page_id = page["id"]
                    if page_id not in self.page_checksums or \
                       self.page_checksums[page_id] != checksum:
                        self.page_checksums[page_id] = checksum
                        self.backend.cache.update_page(self._process_page(page))
                        updated_count += 1
            if updated_count > 0:
                self.backend.cache.save_to_disk()
                self.backend.stats['changes_detected'] += updated_count
        except Exception as e:
            print(f"Erreur sync incrémentale: {e}")
    
    def _full_sync(self):
        """Synchronisation complète"""
        if not self.backend.notion_client:
            return
        
        try:
            all_pages = []
            cursor = None
            has_more = True
            while has_more and len(all_pages) < 2000:
                params = {
                    "filter": {"property": "object", "value": "page"},
                    "page_size": 100,
                    "sort": {"timestamp": "last_edited_time", "direction": "descending"}
                }
                if cursor:
                    params["start_cursor"] = cursor
                response = self.backend.notion_client.search(**params)
                self.backend.stats['api_calls'] += 1
                if isinstance(response, dict) and response.get("results"):
                    for page in response.get("results", []):
                        processed = self._process_page(page)
                        all_pages.append(processed)
                        self.backend.cache.update_page(processed)
                        self.page_checksums[page["id"]] = self._calculate_checksum(page)
                    has_more = response.get("has_more", False)
                    cursor = response.get("next_cursor")
                else:
                    has_more = False
                time.sleep(0.3)  # Rate limiting
            self.backend.cache.save_to_disk()
        except Exception as e:
            print(f"Erreur sync complète: {e}")
    
    def update_single_page(self, page_id: str):
        """Met à jour une page spécifique"""
        if not self.backend.notion_client:
            return
        
        try:
            page = self.backend.notion_client.pages.retrieve(page_id)
            page = ensure_dict(page)
            processed = self._process_page(page)
            self.backend.cache.update_page(processed)
            self.page_checksums[page_id] = self._calculate_checksum(page)
            self.backend.cache.save_to_disk()
        except Exception:
            pass
    
    def _process_page(self, page_data: Dict) -> Dict:
        """Traite les données d'une page"""
        title = "Page sans titre"
        
        if "properties" in page_data:
            for prop in page_data["properties"].values():
                if prop.get("type") == "title" and prop.get("title"):
                    texts = [t.get("plain_text", "") for t in prop["title"]]
                    title = "".join(texts).strip() or title
                    break
        
        return {
            "id": page_data["id"],
            "title": title,
            "icon": page_data.get("icon"),
            "url": page_data.get("url"),
            "last_edited": page_data.get("last_edited_time"),
            "created_time": page_data.get("created_time"),
            "parent_type": page_data.get("parent", {}).get("type", "page")
        }
    
    def _calculate_checksum(self, page: Dict) -> str:
        """Calcule un checksum pour détecter les changements"""
        content = json.dumps({
            "title": self._get_page_title(page),
            "last_edited": page.get("last_edited_time"),
            "icon": page.get("icon"),
            "archived": page.get("archived", False)
        }, sort_keys=True)
        
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _get_page_title(self, page: Dict) -> str:
        """Extrait le titre d'une page"""
        if "properties" in page:
            for prop in page["properties"].values():
                if prop.get("type") == "title" and prop.get("title"):
                    return "".join([t.get("plain_text", "") for t in prop["title"]])
        return ""


# Instance globale du backend
backend = NotionClipperBackend()

# Routes Flask optimisées
@app.route('/api/health')
def health_check():
    """Health check avec statistiques détaillées et flags d'onboarding"""
    status = {
        "status": "healthy",
        "timestamp": time.time(),
        "notion_connected": backend.notion_client is not None,
        "imgbb_configured": backend.imgbb_key is not None,
        "stats": backend.get_stats(),
        "cache": {
            "pages_count": len(backend.cache.get_all_pages()),
            "memory_usage": sys.getsizeof(backend.cache.pages_cache)
        }
    }
    # Ajout des flags firstRun et onboardingCompleted pour le frontend
    try:
        cfg = backend.secure_config.load_config()
        notion_token = cfg.get("notionToken", "")
        imgbb_key = cfg.get("imgbbKey", "")
        first_run = not (notion_token and imgbb_key)
        onboarding_completed = bool(notion_token and imgbb_key)
    except Exception:
        first_run = True
        onboarding_completed = False
    status.update({
        "firstRun": first_run,
        "onboardingCompleted": onboarding_completed
    })
    return jsonify(status), 200

@app.route('/api/config', methods=['POST'])
def update_config():
    data = request.get_json() or {}
    notion_token = data.get("notionToken", "").strip()
    imgbb_key = data.get("imgbbKey", "").strip()
    # Validation du token Notion avant enregistrement
    from notion_client import Client as NotionClient
    try:
        test_client = NotionClient(auth=notion_token)
        test_client.users.me()
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Invalid Notion token: {str(e)}"
        }), 400
    # Créer la page de preview si elle n'existe pas ou si elle a été supprimée
    preview_page_id = None
    preview_creation_error = None
    try:
        # Charger la config existante pour vérifier si on a déjà un previewPageId
        existing_config = backend.secure_config.load_config()
        preview_page_id = existing_config.get('previewPageId')
        notion_client = NotionClient(auth=notion_token)
        need_create = False
        if preview_page_id:
            # Vérifier si la page existe vraiment dans Notion
            try:
                page = notion_client.pages.retrieve(preview_page_id)
                page = ensure_sync_response(page)
                # Si la page est archivée ou inaccessible, on la recrée
                if isinstance(page, dict) and page.get('archived', False):
                    need_create = True
            except Exception:
                need_create = True
        else:
            need_create = True
        if need_create:
            temp_backend = NotionClipperBackend()
            temp_backend.notion_client = notion_client
            preview_page_id = temp_backend.create_preview_page()
            if not preview_page_id:
                preview_creation_error = (
                    "Impossible de créer la page de prévisualisation Notion. "
                    "Vérifiez que l'intégration Notion a bien été ajoutée à l'espace de travail ou à la page parent. "
                    "Consultez la documentation ou la console pour plus de détails."
                )
            print(f"Page preview créée avec ID: {preview_page_id}")
    except Exception as e:
        preview_creation_error = f"Erreur lors de la création de la page de preview: {e}"
        print(f"Erreur création page preview: {e}")
    # Enregistrement sécurisé avec le preview page ID
    try:
        config_to_save = {
            "notionToken": notion_token,
            "imgbbKey": imgbb_key
        }
        if preview_page_id:
            config_to_save["previewPageId"] = preview_page_id
        backend.secure_config.save_config(config_to_save)
        # Réinitialiser le backend avec la nouvelle config
        backend.initialize()
        if preview_creation_error:
            return jsonify({
                "success": False,
                "error": preview_creation_error
            }), 400
        return jsonify({
            "success": True,
            "previewPageId": preview_page_id
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    """Récupère la configuration actuelle (Notion Token, ImgBB Key)"""
    try:
        cfg = backend.secure_config.load_config()
        return jsonify({
            "success":      True,
            "notionToken":  cfg.get("notionToken", ""),
            "imgbbKey":     cfg.get("imgbbKey", "")
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/send', methods=['POST'])
def send_content():
    """Envoie du contenu vers Notion avec le parser avancé"""
    try:
        data = request.get_json()
        
        # Validation des données requises
        page_id = data.get('pageId')
        content = data.get('content', '')
        content_type = data.get('contentType', 'text')
        
        if not page_id:
            return jsonify({"error": "pageId requis"}), 400
        if not content and content_type != 'clipboard':
            return jsonify({"error": "Contenu vide"}), 400
        
        # Récupérer les options
        parse_as_markdown = data.get('parseAsMarkdown', True)
        use_enhanced_parser = data.get('useEnhancedParser', True)
        
        # Traiter le contenu avec le parser avancé
        if use_enhanced_parser:
            blocks = parse_content_for_notion(
                content=content,
                content_type=content_type if content_type != 'text' else None,
                imgbb_key=backend.imgbb_key
            )
        else:
            # Ancienne méthode
            blocks = backend.process_content(
                content=content,
                content_type=content_type,
                parse_markdown=parse_as_markdown
            )
        
        # Valider les blocs
        from backend.markdown_parser import validate_notion_blocks
        blocks = validate_notion_blocks(blocks)
        
        if not blocks:
            return jsonify({"error": "Aucun bloc valide généré"}), 400
            
        if data.get('sourceUrl'):
            source_block = {
                "type": "callout",
                "callout": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "🔗 Source: "}
                    }, {
                        "type": "text",
                        "text": {
                            "content": data['sourceUrl'],
                            "link": {"url": data['sourceUrl']}
                        }
                    }],
                    "icon": {"emoji": "🔗"}
                }
            }
            blocks.append(source_block)
        
        # Envoyer à Notion
        result = backend._send_to_notion_with_result(page_id, blocks)
        
        if result['success']:
            # Mise à jour du cache
            backend.polling_manager.update_single_page(page_id)
            
            return jsonify({
                "success": True,
                "message": "Contenu envoyé avec succès",
                "blocksCount": len(blocks)
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Erreur inconnue')
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages')
def get_pages():
    """Récupère les pages depuis le cache, avec option de synchronisation complète si force_refresh est passé en paramètre."""
    try:
        args = request.args or {}
        force_refresh = args.get('force_refresh', 'false').lower() in ('true', '1')
        if force_refresh:
            try:
                backend.polling_manager._full_sync()
            except Exception as e:
                app.logger.warning(f"full_sync échouée : {e}")
        pages = backend.cache.get_all_pages()
        backend.stats['cache_hits'] += 1
        # Trier par date de modification
        pages.sort(key=lambda x: x.get("last_edited", ""), reverse=True)
        return jsonify({
            "pages": pages,
            "count": len(pages),
            "cached": True,
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/<page_id>/info')
def get_page_info(page_id):
    """Récupère les informations détaillées d'une page"""
    try:
        if not backend.notion_client:
            return jsonify({"error": "Notion non configuré"}), 400
        
        # Vérifier si c'est une base de données
        try:
            db = backend.notion_client.databases.retrieve(page_id)
            db = ensure_dict(db)
            return jsonify({
                "type": "database",
                "properties": db.get('properties', {}),
                "title": db.get('title', [{}])[0].get('plain_text', 'Base de données')
            })
        except:
            # C'est une page normale
            page = backend.notion_client.pages.retrieve(page_id)
            page = ensure_dict(page)
            return jsonify({
                "type": "page",
                "properties": page.get('properties', {}),
                "title": backend.polling_manager._get_page_title(page)
            })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clipboard')
def get_clipboard():
    """Récupère le contenu du presse-papiers"""
    try:
        content = backend.clipboard_manager.get_content()
        return jsonify(content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/changes')
def get_changes():
    """Récupère les changements depuis un timestamp"""
    try:
        since = request.args.get('since', '0')
        timestamp = float(since)
        
        changes = backend.cache.get_changes_since(timestamp)
        
        return jsonify({
            "changes": changes,
            "count": len(changes),
            "timestamp": time.time()
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/events/stream')
def event_stream():
    """Server-Sent Events pour les changements en temps réel"""
    def generate():
        # Envoyer un ping initial
        yield f"data: {json.dumps({'type': 'connected', 'timestamp': time.time()})}\n\n"
        
        while True:
            try:
                # Pour l'instant, envoyer un ping toutes les 30 secondes
                time.sleep(30)
                yield f"data: {json.dumps({'type': 'ping', 'timestamp': time.time()})}\n\n"
                    
            except GeneratorExit:
                break
            except Exception as e:
                print(f"SSE error: {e}")
                break
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/onboarding/complete', methods=['POST'])
def complete_onboarding():
    """Marque l'onboarding comme complété"""
    try:
        onboarding_file = backend.app_dir / "notion_onboarding.json"
        onboarding_data = {
            "completed": True,
            "timestamp": time.time(),
            "date": datetime.now().isoformat()
        }
        
        with open(onboarding_file, 'w', encoding='utf-8') as f:
            json.dump(onboarding_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "success": True,
            "message": "Onboarding complété"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/parse-content', methods=['POST'])
def parse_content():
    """Parse le contenu et retourne les blocs Notion"""
    try:
        data = request.get_json()
        content = data.get('content', '')
        content_type = data.get('contentType', 'mixed')
        parse_as_markdown = data.get('parseAsMarkdown', True)
        
        if not content:
            return jsonify({'blocks': []})
        
        # Utiliser le parser avancé
        blocks = parse_content_for_notion(
            content=content,
            content_type=content_type if content_type != 'mixed' else None,
            imgbb_key=backend.imgbb_key
        )
        
        # Valider les blocs
        from backend.markdown_parser import validate_notion_blocks
        validated_blocks = validate_notion_blocks(blocks)
        
        return jsonify({
            'blocks': validated_blocks,
            'count': len(validated_blocks)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/send_multiple', methods=['POST', 'OPTIONS'])
def send_multiple():
    """Envoie multiple de contenu vers Notion"""
    # Gérer les requêtes OPTIONS pour CORS
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    try:
        data = request.get_json() or {}
        # Support du format UI (page_ids + content commun)
        if 'page_ids' in data:
            # On reconstruit la liste d'items attendue côté back
            common = {
                'content':         data.get('content', ''),
                'contentType':     data.get('contentType'),
                'parseAsMarkdown': data.get('parseAsMarkdown', True)
            }
            data['items'] = [
                { 'pageId': pid, **common }
                for pid in data.get('page_ids', [])
            ]
        items = data.get('items', [])
        results = []
        
        for item in items:
            page_id = item.get('pageId') or item.get('page_id')
            content = item.get('content', '')
            content_type = item.get('contentType')
            parse_markdown = item.get('parseAsMarkdown', True)
            
            if not page_id or not content:
                results.append({
                    "success": False,
                    "error": "page_id et content requis"
                })
                continue
            
            # Utiliser le même traitement que send_to_notion
            try:
                if not content_type:
                    content_type = backend.detect_content_type(content)
                
                handler = backend.format_handlers.get(content_type, backend._handle_text)
                blocks = handler(content, parse_markdown)
                
                try:
                    validated_blocks = validate_notion_blocks(blocks)
                except:
                    validated_blocks = blocks[:100]
                
                if backend.notion_client and validated_blocks:
                    try:
                        result = backend._send_to_notion_with_result(page_id, validated_blocks)
                        if result['success']:
                            results.append({
                                "success": True,
                                "pageId": page_id,
                                "blocksCount": len(validated_blocks)
                            })
                        else:
                            results.append({
                                "success": False,
                                "error": result['error']
                            })
                    except Exception as e:
                        results.append({
                            "success": False,
                            "error": str(e)
                        })
                else:
                    results.append({
                        "success": False,
                        "error": "Notion non configuré"
                    })
                    
            except Exception as e:
                results.append({
                    "success": False,
                    "error": str(e)
                })
        
        # Compter les succès et échecs
        success_count = sum(1 for r in results if r.get('success'))
        failed_count = len(results) - success_count
        succeeded = [r.get('pageId') for r in results if r.get('success')]
        failed = [
            {"pageId": r.get('page_id'), "error": r.get('error')} for r in results if not r.get('success')
        ]

        return jsonify({
            "successCount": success_count,
            "failureCount": failed_count,
            "succeeded": succeeded,
            "failed": failed
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/<page_id>/database', methods=['GET'])
def check_if_database(page_id):
    """Vérifie si une page est une base de données"""
    try:
        if not backend.notion_client:
            return jsonify({"is_database": False})
        
        try:
            db = backend.notion_client.databases.retrieve(page_id)
            db = ensure_dict(db)
            return jsonify({
                "is_database": True,
                "properties": db.get('properties', {}),
                "title": db.get('title', [{}])[0].get('plain_text', 'Base de données')
            })
        except:
            return jsonify({"is_database": False})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clear_cache', methods=['POST'])
def clear_cache():
    """Vide le cache et force une resynchronisation"""
    try:
        backend.cache.pages_cache.clear()
        backend.cache.page_hashes.clear()
        backend.cache.last_modified.clear()
        backend.polling_manager.page_checksums.clear()
        
        # Forcer une resync
        if backend.polling_manager.running:
            threading.Thread(
                target=backend.polling_manager._full_sync,
                daemon=True
            ).start()
        
        return jsonify({
            "success": True,
            "message": "Cache vidé et resynchronisation en cours"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/check_updates', methods=['GET'])
def check_updates():
    """Vérifie les mises à jour disponibles"""
    return jsonify({
        "updateAvailable": False,
        "currentVersion": "3.0.0",
        "latestVersion": "3.0.0"
    })

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Récupère les logs récents pour le debugging"""
    try:
        logs = backend.get_recent_logs()
        return jsonify({
            "success": True,
            "logs": logs
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/content-types', methods=['GET'])
def get_content_types():
    """Retourne les types de contenu supportés"""
    return jsonify({
        'types': [
            {'id': 'text', 'label': 'Texte', 'icon': 'FileText'},
            {'id': 'markdown', 'label': 'Markdown', 'icon': 'FileText'},
            {'id': 'code', 'label': 'Code', 'icon': 'Code'},
            {'id': 'image', 'label': 'Image', 'icon': 'Image'},
            {'id': 'video', 'label': 'Vidéo', 'icon': 'Video'},
            {'id': 'audio', 'label': 'Audio', 'icon': 'Music'},
            {'id': 'table', 'label': 'Tableau', 'icon': 'Table'},
            {'id': 'url', 'label': 'Lien', 'icon': 'Link'},
            {'id': 'mixed', 'label': 'Mixte (auto)', 'icon': 'Layers'}
        ],
        'default': 'mixed'
    })

@app.route('/api/analyze-content', methods=['POST'])
def analyze_content():
    """Analyse le contenu et suggère le meilleur type"""
    try:
        data = request.get_json()
        content = data.get('content', '')
        
        if not content:
            return jsonify({'suggestedType': 'text', 'confidence': 1.0})
        
        # Analyser avec le parser
        parser = EnhancedContentParser()
        blocks = parser.parse_content(content=content, content_type='mixed')
        
        # Déterminer le type dominant
        type_counts = {}
        for block in blocks:
            block_type = block.get("type", "unknown")
            type_counts[block_type] = type_counts.get(block_type, 0) + 1
        
        if not type_counts:
            return jsonify({'suggestedType': 'text', 'confidence': 1.0})
        
        # Si plusieurs types, suggérer 'mixed'
        if len(type_counts) > 1:
            return jsonify({
                'suggestedType': 'mixed',
                'confidence': 0.9,
                'types': type_counts
            })
        
        # Sinon, retourner le type unique
        suggested_type = list(type_counts.keys())[0]
        return jsonify({
            'suggestedType': suggested_type,
            'confidence': 1.0,
            'types': type_counts
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preview/url', methods=['GET'])
def get_preview_url():
    """Récupère l'URL de la page preview"""
    try:
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        if not preview_page_id:
            return jsonify({"error": "Page preview non configurée"}), 404
        # Récupérer les infos de la page pour avoir l'URL
        if backend.notion_client:
            try:
                page = backend.notion_client.pages.retrieve(preview_page_id)
                page = ensure_sync_response(page)
                page = ensure_dict(page)
                return jsonify({
                    "success": True,
                    "pageId": preview_page_id,
                    "url": page.get("url", f"https://www.notion.so/{preview_page_id.replace('-', '')}")
                })
            except Exception as e:
                print(f"Erreur récupération page: {e}")
                # URL par défaut si on ne peut pas récupérer la page
                return jsonify({
                    "success": True,
                    "pageId": preview_page_id,
                    "url": f"https://www.notion.so/{preview_page_id.replace('-', '')}"
                })
        else:
            # Si le client n'est pas initialisé, retourner l'URL par défaut
            return jsonify({
                "success": True,
                "pageId": preview_page_id,
                "url": f"https://www.notion.so/{preview_page_id.replace('-', '')}"
            })
    except Exception as e:
        print(f"Erreur get_preview_url: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/clipboard/preview', methods=['POST'])
def update_clipboard_preview():
    """Met à jour la page preview avec le contenu du presse-papiers"""
    try:
        # Vérifier que la preview est configurée
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if not preview_page_id:
            return jsonify({"error": "Page preview non configurée"}), 404
            
        if not backend.notion_client:
            return jsonify({"error": "Client Notion non initialisé"}), 500
        
        # Récupérer le contenu du presse-papiers
        clipboard_content = backend.clipboard_manager.get_content()
        if clipboard_content.get('empty'):
            return jsonify({"error": "Presse-papiers vide"}), 400
        
        content = clipboard_content.get('content', '')
        content_type = clipboard_content.get('type', 'text')
        
        try:
            # ÉTAPE 1: Supprimer TOUS les blocs existants
            print(f"Vidage complet de la page preview {preview_page_id}...")
            
            # Récupérer tous les blocs
            all_blocks = []
            has_more = True
            start_cursor = None
            
            while has_more:
                params = {"block_id": preview_page_id}
                if start_cursor:
                    params["start_cursor"] = start_cursor
                    
                response = backend.notion_client.blocks.children.list(**params)
                response = ensure_sync_response(response)
                
                if isinstance(response, dict):
                    results = response.get("results", [])
                    all_blocks.extend(results)
                    has_more = response.get("has_more", False)
                    start_cursor = response.get("next_cursor")
                else:
                    break
            
            # Supprimer tous les blocs en parallèle pour plus de rapidité
            from concurrent.futures import ThreadPoolExecutor, as_completed
            
            def delete_block(block_id):
                try:
                    if backend.notion_client is not None:
                        backend.notion_client.blocks.delete(block_id=block_id)
                        return True, block_id
                    else:
                        return False, "Notion client non initialisé"
                except Exception as e:
                    return False, f"{block_id}: {str(e)}"
            
            deleted_count = 0
            failed_deletions = []
            
            with ThreadPoolExecutor(max_workers=5) as executor:
                # Soumettre toutes les suppressions
                future_to_block = {
                    executor.submit(delete_block, block["id"]): block["id"] 
                    for block in all_blocks if isinstance(block, dict)
                }
                
                # Attendre les résultats
                for future in as_completed(future_to_block):
                    success, result = future.result()
                    if success:
                        deleted_count += 1
                    else:
                        failed_deletions.append(result)
            
            print(f"Suppression terminée: {deleted_count} blocs supprimés, {len(failed_deletions)} échecs")
            
            # ÉTAPE 2: Parser le nouveau contenu
            if hasattr(backend, 'content_parser') and backend.content_parser:
                blocks = backend.content_parser.parse_content(
                    content=content,
                    content_type=content_type if content_type != 'text' else None
                )
            else:
                # Fallback
                handler = backend.format_handlers.get(content_type, backend._handle_text)
                blocks = handler(content, True)
            
            # Valider les blocs
            from backend.markdown_parser import validate_notion_blocks
            blocks = validate_notion_blocks(blocks[:100])  # Limiter à 100 blocs
            
            # ÉTAPE 3: Ajouter le nouveau contenu
            if blocks:
                # Envoyer par batch de 100 blocs max (limite API Notion)
                for i in range(0, len(blocks), 100):
                    batch = blocks[i:i+100]
                    backend.notion_client.blocks.children.append(
                        block_id=preview_page_id,
                        children=batch
                    )
                
                print(f"Preview mise à jour avec {len(blocks)} nouveaux blocs")
            
            return jsonify({
                "success": True,
                "message": "Preview mise à jour",
                "blocksCount": len(blocks),
                "deletedCount": deleted_count
            })
            
        except Exception as e:
            print(f"Erreur lors de la mise à jour de la preview: {e}")
            import traceback
            traceback.print_exc()
            
            return jsonify({
                "success": False,
                "error": f"Erreur lors de la mise à jour: {str(e)}"
            }), 500
            
    except Exception as e:
        print(f"Erreur update_clipboard_preview: {e}")
        return jsonify({"error": str(e)}), 500
        
if __name__ == '__main__':
    # Écrire le PID dans un fichier pour permettre un arrêt propre
    try:
        with open("notion_backend.pid", "w") as f:
            f.write(str(os.getpid()))
    except Exception as e:
        print(f"Impossible d'écrire le fichier PID: {e}")
    
    # Initialisation
    print("🚀 Notion Clipper Pro - Backend Optimisé")
    print("=========================================")
    
    # Charger la configuration
    if backend.initialize():
        print("✅ Backend initialisé avec succès")
    else:
        print("⚠️ Backend en attente de configuration")
    
    print("\n📊 Formats supportés:")
    for fmt in backend.format_handlers.keys():
        print(f"  • {fmt}")
    
    print("\n🔧 Optimisations:")
    print("  • Détection intelligente des formats")
    print("  • Upload d'images avec compression")
    print("  • Cache multi-niveaux")
    print("  • Polling asynchrone")
    print("  • Traitement parallèle")
    
    print("\n📡 Serveur démarré sur http://localhost:5000")
    print("✅ Toutes les routes sont disponibles")
    
    # Lancer Flask - CORRECTION IMPORTANTE
    try:
        app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        print("\n⏹️ Arrêt du serveur...")
        handle_exit(None, None)