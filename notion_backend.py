#!/usr/bin/env python3
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
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any, List, Union, Tuple
from collections import defaultdict
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from notion_client import Client
from dotenv import load_dotenv
import requests
from PIL import Image
from backend.config import SecureConfig
from backend.cache import NotionCache
from backend.martian_parser import markdown_to_blocks
from backend.markdown_parser import validate_notion_blocks

# Configuration
load_dotenv()
app = Flask(__name__)
CORS(app)

# Thread pool pour opérations async
executor = ThreadPoolExecutor(max_workers=4)

class NotionClipperBackend:
    """Classe principale gérant toute la logique backend"""
    
    def __init__(self):
        self.secure_config = SecureConfig()
        self.app_dir = self.secure_config.app_dir
        self.notion_client: Optional[Client] = None
        self.imgbb_key: Optional[str] = None
        
        # Cache intelligent
        self.cache = NotionCache(self.app_dir)
        self.polling_manager = SmartPollingManager(self)
        
        # Statistiques
        self.stats = {
            'api_calls': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'images_uploaded': 0,
            'content_processed': 0,
            'errors': 0,
            'changes_detected': 0
        }
        self.start_time = time.time()
        
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
    
    async def process_content(self, content: str, page_id: str, 
                            content_type: Optional[str] = None,
                            parse_markdown: bool = True) -> Dict[str, Any]:
        """Traite le contenu de manière asynchrone et intelligente"""
        try:
            # Détection automatique du type si non spécifié
            if not content_type:
                content_type = self.detect_content_type(content)
            
            # Utiliser le handler approprié
            handler = self.format_handlers.get(content_type, self._handle_text)
            blocks = await asyncio.get_event_loop().run_in_executor(
                executor, handler, content, parse_markdown
            )
            
            # Valider les blocs
            validated_blocks = validate_notion_blocks(blocks)
            
            # Envoyer à Notion
            if self.notion_client and validated_blocks:
                response = await self._send_to_notion_async(page_id, validated_blocks)
                
                # Mettre à jour le cache
                await self._update_cache_async(page_id)
                
                return {
                    "success": True,
                    "page_id": page_id,
                    "blocks_count": len(validated_blocks),
                    "content_type": content_type,
                    "response": response
                }
            
            return {
                "success": False,
                "error": "Notion client not configured or no blocks to send"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "content_type": content_type
            }
    
    def _handle_text(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Gère le contenu texte"""
        if parse_markdown and self._is_markdown(content):
            return markdown_to_blocks(content)
        
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
            return markdown_to_blocks(content)
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
        separator_counts = {}
        
        for sep in separators:
            count = line.count(sep)
            if count > 0:
                separator_counts[sep] = count
        
        if separator_counts:
            # Retourner le séparateur le plus fréquent
            return max(list(separator_counts.keys()), key=lambda k: separator_counts[k])
        
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
            return max(list(scores.keys()), key=lambda k: scores[k])
        
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
    
    async def _send_to_notion_async(self, page_id: str, blocks: List[Dict]) -> Dict:
        """Envoie les blocs à Notion de manière asynchrone"""
        if self.notion_client is None or not hasattr(self.notion_client, 'blocks') or self.notion_client.blocks is None:
            return {"error": "Notion client not configured"}
        loop = asyncio.get_event_loop()
        def send_blocks():
            if self.notion_client is None or not hasattr(self.notion_client, 'blocks') or self.notion_client.blocks is None:
                return {"error": "Notion client not configured"}
            result = self.notion_client.blocks.children.append(page_id, children=blocks)
            if isinstance(result, dict):
                return result
            else:
                return {"error": "Erreur lors de l'envoi à Notion"}
        return await loop.run_in_executor(
            executor,
            send_blocks
        )
    
    async def _update_cache_async(self, page_id: str):
        """Met à jour le cache de manière asynchrone"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            executor,
            lambda: self.polling_manager.update_single_page(page_id)
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques d'utilisation"""
        uptime = time.time() - self.start_time
        return {
            "uptime": uptime,
            "api_calls": self.stats['api_calls'],
            "cache_hits": self.stats['cache_hits'],
            "cache_misses": self.stats['cache_misses'],
            "images_uploaded": self.stats['images_uploaded'],
            "content_processed": self.stats['content_processed'],
            "errors": self.stats['errors']
        }


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
            response = self.backend.notion_client.search(
                filter={"property": "object", "value": "page"},
                page_size=1,
                sort={"timestamp": "last_edited_time", "direction": "descending"}
            )
            if isinstance(response, dict) and response.get("results"):
                latest = response["results"][0]
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
            response = self.backend.notion_client.search(
                filter={"property": "object", "value": "page"},
                page_size=50,
                sort={"timestamp": "last_edited_time", "direction": "descending"}
            )
            updated_count = 0
            if isinstance(response, dict):
                for page in response.get("results", []):
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
                if isinstance(response, dict):
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
            if isinstance(page, dict):
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
    """Health check avec statistiques détaillées"""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "notion_connected": backend.notion_client is not None,
        "imgbb_configured": backend.imgbb_key is not None,
        "stats": backend.get_stats(),
        "cache": {
            "pages_count": len(backend.cache.get_all_pages()),
            "memory_usage": sys.getsizeof(backend.cache.pages_cache)
        }
    })

@app.route('/api/config', methods=['POST'])
def update_config():
    """Configure Notion et ImgBB"""
    try:
        data = request.get_json()
        backend.secure_config.save_config({
            "notionToken": data.get("notionToken", ""),
            "imgbbKey": data.get("imgbbKey", "")
        })
        
        success = backend.initialize()
        
        return jsonify({
            "success": success,
            "notion_connected": backend.notion_client is not None,
            "imgbb_configured": backend.imgbb_key is not None
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/send', methods=['POST'])
def send_to_notion():
    """Endpoint principal pour envoyer du contenu à Notion"""
    try:
        data = request.get_json()
        page_id = data.get('pageId') or data.get('page_id')
        content = data.get('content', '')
        content_type = data.get('contentType')
        parse_markdown = data.get('parseAsMarkdown', True)
        if not page_id or not content:
            return jsonify({"error": "page_id et content requis"}), 400
        # Traitement asynchrone du contenu
        result = asyncio.run(backend.process_content(
            content=content,
            page_id=page_id,
            content_type=content_type,
            parse_markdown=parse_markdown
        ))
        backend.stats['content_processed'] += 1
        if result['success']:
            return jsonify(result)
        else:
            backend.stats['errors'] += 1
            return jsonify(result), 400
    except Exception as e:
        backend.stats['errors'] += 1
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages')
def get_pages():
    """Récupère les pages depuis le cache"""
    try:
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
            if isinstance(db, dict):
                return jsonify({
                    "type": "database",
                    "properties": db.get('properties', {}),
                    "title": db.get('title', [{}])[0].get('plain_text', 'Base de données')
                })
            else:
                return jsonify({"error": "Réponse inattendue de Notion"}), 500
        except:
            # C'est une page normale
            page = backend.notion_client.pages.retrieve(page_id)
            if isinstance(page, dict):
                return jsonify({
                    "type": "page",
                    "properties": page.get('properties', {}),
                    "title": backend.polling_manager._get_page_title(page)
                })
            else:
                return jsonify({"error": "Réponse inattendue de Notion"}), 500
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


if __name__ == '__main__':
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
    
    # Lancer Flask
    app.run(host='127.0.0.1', port=5000, debug=False)