"""
Gestionnaires de formats pour Notion Clipper Pro
Traite différents types de contenu et les convertit en blocs Notion
"""

import re
import base64
import requests
from typing import Dict, Any, List, Optional, TYPE_CHECKING
from io import BytesIO
from PIL import Image

from backend.parsers.martian_parser import markdown_to_blocks
from backend.handlers.image_handler import ImageHandler as ExternalImageHandler

if TYPE_CHECKING:
    from core.notion_clipper import NotionClipperBackend


class FormatHandlerRegistry:
    """Registre centralisé des gestionnaires de formats"""
    
    def __init__(self, backend: 'NotionClipperBackend'):
        self.backend = backend
        
        # Enregistrement des handlers
        self.handlers = {
            'text': TextHandler(backend),
            'markdown': MarkdownHandler(backend),
            'image': ExternalImageHandler(backend.imgbb_key),
            'video': VideoHandler(backend),
            'audio': AudioHandler(backend),
            'document': DocumentHandler(backend),
            'table': TableHandler(backend),
            'code': CodeHandler(backend),
            'url': URLHandler(backend),
            'file': FileHandler(backend)
        }
    
    def get_handler(self, format_type: str):
        """Retourne le handler approprié ou le handler par défaut"""
        return self.handlers.get(format_type, self.handlers['text'])
    
    def keys(self):
        """Retourne la liste des formats supportés"""
        return self.handlers.keys()


class BaseHandler:
    """Classe de base pour tous les handlers de format"""
    
    def __init__(self, backend: 'NotionClipperBackend'):
        self.backend = backend
    
    def __call__(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Interface principale pour traiter le contenu"""
        return self.handle(content, parse_markdown)
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Méthode à implémenter par les sous-classes"""
        raise NotImplementedError
    
    def create_paragraph_block(self, text: str) -> Dict[str, Any]:
        """Crée un bloc paragraphe simple"""
        return {
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": text}
                }]
            }
        }


class TextHandler(BaseHandler):
    """Gestionnaire pour le texte simple"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite le texte simple"""
        if not content.strip():
            return []
        
        # Si le markdown est activé et qu'on détecte du markdown
        if parse_markdown and self._contains_markdown(content):
            return MarkdownHandler(self.backend).handle(content, True)
        
        # Sinon, créer des blocs paragraphe
        blocks = []
        paragraphs = content.split('\n\n')
        
        for para in paragraphs:
            if para.strip():
                blocks.append(self.create_paragraph_block(para.strip()))
        
        return blocks
    
    def _contains_markdown(self, content: str) -> bool:
        """Détecte la présence de markdown"""
        patterns = [
            r'^#{1,6}\s',  # Headers
            r'\*\*[\w\s]+\*\*',  # Bold
            r'\[[\w\s]+\]\(',  # Links
            r'^\s*[-*+]\s',  # Lists
            r'```',  # Code blocks
        ]
        
        for pattern in patterns:
            if re.search(pattern, content, re.MULTILINE):
                return True
        
        return False


class MarkdownHandler(BaseHandler):
    """Gestionnaire pour le contenu Markdown"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite le contenu Markdown"""
        if not parse_markdown:
            return TextHandler(self.backend).handle(content, False)
        
        try:
            # Utiliser le parser Markdown
            blocks = markdown_to_blocks(content)
            return blocks
        except Exception as e:
            print(f"Erreur parsing Markdown: {e}")
            # Fallback vers texte simple
            return TextHandler(self.backend).handle(content, False)


class ImageHandler(BaseHandler):
    """Gestionnaire pour les images"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite les images (URL ou base64)"""
        content = content.strip()
        
        # Image base64
        if content.startswith('data:image/'):
            return self._handle_base64_image(content)
        
        # URL d'image
        if self._is_image_url(content):
            return self._handle_image_url(content)
        
        # Fallback
        return [self.create_paragraph_block(content)]
    
    def _handle_base64_image(self, content: str) -> List[Dict]:
        """Traite une image base64"""
        try:
            # Extraire les données base64
            header, data = content.split(',', 1)
            image_data = base64.b64decode(data)
            
            # Upload vers ImgBB si disponible
            if self.backend.imgbb_key:
                url = self._upload_to_imgbb(image_data)
                if url:
                    return [{
                        "type": "image",
                        "image": {
                            "type": "external",
                            "external": {"url": url}
                        }
                    }]
            
            # Si pas d'upload possible, créer un bloc texte
            return [self.create_paragraph_block("[Image non uploadée]")]
            
        except Exception as e:
            print(f"Erreur traitement image base64: {e}")
            return [self.create_paragraph_block("[Erreur image]")]
    
    def _handle_image_url(self, url: str) -> List[Dict]:
        """Traite une URL d'image"""
        return [{
            "type": "image",
            "image": {
                "type": "external",
                "external": {"url": url}
            }
        }]
    
    def _is_image_url(self, url: str) -> bool:
        """Vérifie si l'URL pointe vers une image"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'}
        url_lower = url.lower()
        
        return (url.startswith(('http://', 'https://')) and
                any(ext in url_lower for ext in image_extensions))
    
    def _upload_to_imgbb(self, image_data: bytes) -> Optional[str]:
        """Upload une image vers ImgBB"""
        try:
            # Optimiser l'image avant upload
            optimized = self._optimize_image(image_data)
            
            # Encoder en base64
            b64_image = base64.b64encode(optimized).decode()
            
            # Upload vers ImgBB
            response = requests.post(
                'https://api.imgbb.com/1/upload',
                data={
                    'key': self.backend.imgbb_key,
                    'image': b64_image
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.backend.stats_manager.increment('images_uploaded')
                    return data['data']['url']
            
            return None
            
        except Exception as e:
            print(f"Erreur upload ImgBB: {e}")
            return None
    
    def _optimize_image(self, image_data: bytes, max_dimension: int = 1920) -> bytes:
        """Optimise une image pour l'upload"""
        try:
            # Ouvrir l'image
            img = Image.open(BytesIO(image_data))
            
            # Convertir en RGB si nécessaire
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if 'A' in img.mode else None)
                img = background
            
            # Redimensionner si trop grande
            if max(img.size) > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            
            # Sauvegarder avec compression
            output = BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            return output.getvalue()
            
        except Exception as e:
            print(f"Erreur optimisation image: {e}")
            return image_data


class VideoHandler(BaseHandler):
    """Gestionnaire pour les vidéos"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite les vidéos et liens vidéo"""
        content = content.strip()
        
        # YouTube
        youtube_match = re.match(
            r'(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([\w-]+)',
            content
        )
        if youtube_match:
            video_id = youtube_match.group(1)
            return [{
                "type": "video",
                "video": {
                    "type": "external",
                    "external": {"url": f"https://www.youtube.com/watch?v={video_id}"}
                }
            }]
        
        # Vimeo
        vimeo_match = re.match(
            r'(?:https?://)?(?:www\.)?vimeo\.com/(\d+)',
            content
        )
        if vimeo_match:
            return [{
                "type": "video",
                "video": {
                    "type": "external",
                    "external": {"url": content}
                }
            }]
        
        # Autres vidéos
        if any(ext in content.lower() for ext in ['.mp4', '.avi', '.mov', '.webm']):
            return [{
                "type": "video",
                "video": {
                    "type": "external",
                    "external": {"url": content}
                }
            }]
        
        # Fallback vers embed
        return [{
            "type": "embed",
            "embed": {"url": content}
        }]


class AudioHandler(BaseHandler):
    """Gestionnaire pour l'audio"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite les fichiers et liens audio"""
        content = content.strip()
        
        # Plateformes supportées
        if any(platform in content for platform in ['soundcloud.com', 'spotify.com']):
            return [{
                "type": "embed",
                "embed": {"url": content}
            }]
        
        # Fichiers audio
        if any(ext in content.lower() for ext in ['.mp3', '.wav', '.flac', '.aac']):
            return [{
                "type": "audio",
                "audio": {
                    "type": "external",
                    "external": {"url": content}
                }
            }]
        
        # Fallback vers bookmark
        return [{
            "type": "bookmark",
            "bookmark": {"url": content}
        }]


class DocumentHandler(BaseHandler):
    """Gestionnaire pour les documents"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite les documents (PDF, Word, etc.)"""
        content = content.strip()
        
        # Documents PDF
        if content.lower().endswith('.pdf'):
            return [{
                "type": "pdf",
                "pdf": {
                    "type": "external",
                    "external": {"url": content}
                }
            }]
        
        # Autres documents
        return [{
            "type": "file",
            "file": {
                "type": "external",
                "external": {"url": content}
            }
        }]


class TableHandler(BaseHandler):
    """Gestionnaire pour les tableaux"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite les tableaux avec détection intelligente du format"""
        lines = [line.strip() for line in content.strip().split('\n') if line.strip()]
        if not lines:
            return []
        
        # Détecter le séparateur
        separator = self._detect_table_separator(lines[0])
        if not separator:
            return TextHandler(self.backend).handle(content)
        
        # Parser le tableau
        rows = []
        max_cols = 0
        
        for line in lines:
            # Ignorer les lignes de séparation Markdown
            if separator == '|' and re.match(r'^[\s\|:\-]+$', line):
                continue
            
            cells = [cell.strip() for cell in line.split(separator)]
            # Filtrer les cellules vides aux extrémités (Markdown)
            if separator == '|':
                cells = [c for c in cells if c]
            
            if cells:
                rows.append(cells)
                max_cols = max(max_cols, len(cells))
        
        if not rows or max_cols < 2:
            return TextHandler(self.backend).handle(content)
        
        # Normaliser les lignes
        for row in rows:
            while len(row) < max_cols:
                row.append("")
        
        # Créer le bloc table Notion
        return self._create_table_block(rows, max_cols)
    
    def _detect_table_separator(self, line: str) -> Optional[str]:
        """Détecte le séparateur utilisé dans le tableau"""
        separators = ['|', '\t', ',', ';']
        
        for sep in separators:
            if sep in line:
                # Vérifier qu'il y a au moins 2 colonnes
                parts = line.split(sep)
                if len(parts) >= 2:
                    return sep
        
        return None
    
    def _create_table_block(self, rows: List[List[str]], cols: int) -> List[Dict]:
        """Crée un bloc table Notion"""
        # Limiter la taille du tableau
        max_rows = 100
        max_cols = 25
        
        rows = rows[:max_rows]
        cols = min(cols, max_cols)
        
        # Créer le bloc table
        table_block = {
            "type": "table",
            "table": {
                "table_width": cols,
                "has_column_header": True,
                "has_row_header": False,
                "children": []
            }
        }
        
        # Ajouter les lignes
        for row in rows:
            row_cells = []
            for i in range(cols):
                cell_content = row[i] if i < len(row) else ""
                row_cells.append([{
                    "type": "text",
                    "text": {"content": cell_content[:2000]}  # Limite Notion
                }])
            
            table_block["table"]["children"].append({
                "type": "table_row",
                "table_row": {"cells": row_cells}
            })
        
        return [table_block]


class CodeHandler(BaseHandler):
    """Gestionnaire pour le code"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite le code source"""
        # Détecter le langage si possible
        language = self._detect_language(content)
        
        # Créer le bloc code
        return [{
            "type": "code",
            "code": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": content[:2000]}  # Limite Notion
                }],
                "language": language
            }
        }]
    
    def _detect_language(self, code: str) -> str:
        """Détecte le langage de programmation"""
        # Patterns simples pour détecter les langages courants
        patterns = {
            'python': [r'def\s+\w+\s*\(', r'import\s+\w+', r'from\s+\w+\s+import'],
            'javascript': [r'function\s+\w+\s*\(', r'const\s+\w+', r'let\s+\w+', r'=>'],
            'java': [r'public\s+class', r'private\s+\w+', r'public\s+static'],
            'cpp': [r'#include\s*<', r'using\s+namespace', r'int\s+main\s*\('],
            'csharp': [r'namespace\s+\w+', r'public\s+class', r'using\s+System'],
            'html': [r'<html', r'<div', r'<span', r'</\w+>'],
            'css': [r'\.\w+\s*{', r'#\w+\s*{', r':\s*\w+;'],
            'sql': [r'SELECT\s+', r'FROM\s+', r'WHERE\s+', r'INSERT\s+INTO'],
            'bash': [r'#!/bin/bash', r'\$\w+', r'echo\s+'],
            'rust': [r'fn\s+\w+\s*\(', r'let\s+mut\s+', r'impl\s+'],
            'go': [r'package\s+\w+', r'func\s+\w+\s*\(', r'import\s+"'],
        }
        
        code_upper = code.upper()
        
        for lang, lang_patterns in patterns.items():
            for pattern in lang_patterns:
                if re.search(pattern, code, re.IGNORECASE if lang != 'sql' else 0):
                    return lang
        
        return 'plain text'


class URLHandler(BaseHandler):
    """Gestionnaire pour les URLs"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite les URLs"""
        url = content.strip()
        
        # Vérifier si c'est une URL valide
        if not url.startswith(('http://', 'https://', 'ftp://')):
            url = 'https://' + url
        
        # Créer un bloc bookmark
        return [{
            "type": "bookmark",
            "bookmark": {"url": url}
        }]


class FileHandler(BaseHandler):
    """Gestionnaire générique pour les fichiers"""
    
    def handle(self, content: str, parse_markdown: bool = True) -> List[Dict]:
        """Traite les fichiers génériques"""
        return [{
            "type": "file",
            "file": {
                "type": "external",
                "external": {"url": content.strip()}
            }
        }]