# backend/enhanced_content_parser.py
"""
Système de parsing avancé pour NotionClipper Pro
Gère tous les types de contenu avec conversion fidèle vers Notion
"""

import re
import json
from typing import List, Dict, Any, Optional, Tuple, Union
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass, field
from enum import Enum


class ContentType(Enum):
    """Types de contenu supportés"""
    TEXT = "text"
    MARKDOWN = "markdown"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    CODE = "code"
    TABLE = "table"
    URL = "url"
    FILE = "file"
    EMBED = "embed"
    MIXED = "mixed"


@dataclass
class ContentBlock:
    """Représente un bloc de contenu détecté"""
    type: ContentType
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    start_pos: int = 0
    end_pos: int = 0


class EnhancedContentParser:
    """Parser intelligent qui détecte et convertit tous les types de contenu"""
    
    def __init__(self, imgbb_key: Optional[str] = None):
        self.imgbb_key = imgbb_key
        
        # Patterns de détection compilés pour la performance
        self.patterns = {
            'youtube': re.compile(
                r'(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
                re.IGNORECASE
            ),
            'vimeo': re.compile(
                r'(?:https?://)?(?:www\.)?vimeo\.com/(\d+)',
                re.IGNORECASE
            ),
            'image_url': re.compile(
                r'(https?://[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)',
                re.IGNORECASE
            ),
            'image_markdown': re.compile(
                r'!\[([^\]]*)\]\(([^)]+)\)'
            ),
            'link_markdown': re.compile(
                r'\[([^\]]+)\]\(([^)]+)\)'
            ),
            'code_block': re.compile(
                r'```(\w*)\n(.*?)\n```',
                re.DOTALL
            ),
            'inline_code': re.compile(
                r'`([^`]+)`'
            ),
            'table': re.compile(
                r'(\|[^\n]+\|\n)(\|[\s:|-]+\|\n)((?:\|[^\n]+\|\n?)+)',
                re.MULTILINE
            ),
            'embed_url': re.compile(
                r'(https?://(?:codepen\.io|jsfiddle\.net|codesandbox\.io|repl\.it|glitch\.com|stackblitz\.com)[^\s]+)',
                re.IGNORECASE
            ),
            'twitter': re.compile(
                r'(?:https?://)?(?:www\.)?twitter\.com/\w+/status/(\d+)',
                re.IGNORECASE
            ),
            'audio_url': re.compile(
                r'(https?://[^\s]+\.(?:mp3|wav|ogg|m4a|flac)(?:\?[^\s]*)?)',
                re.IGNORECASE
            )
        }
    
    def parse_content(self, content: str, content_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Parse le contenu et retourne une liste de blocs Notion
        
        Args:
            content: Le contenu à parser
            content_type: Type de contenu forcé (optionnel)
        
        Returns:
            Liste de blocs Notion prêts à être envoyés
        """
        if not content:
            return []
        
        # Si le type est forcé et n'est pas "mixed", utiliser le handler spécifique
        if content_type and content_type != 'mixed':
            return self._handle_specific_type(content, content_type)
        
        # Sinon, détecter et parser intelligemment
        blocks = self._parse_mixed_content(content)
        
        # Convertir en blocs Notion
        notion_blocks = []
        for block in blocks:
            notion_block = self._convert_to_notion_block(block)
            if notion_block:
                if isinstance(notion_block, list):
                    notion_blocks.extend(notion_block)
                else:
                    notion_blocks.append(notion_block)
        
        return notion_blocks or self._create_fallback_blocks(content)
    
    def _parse_mixed_content(self, content: str) -> List[ContentBlock]:
        """Parse du contenu mixte en détectant tous les types"""
        blocks = []
        remaining = content
        position = 0
        
        while remaining:
            # Essayer de détecter chaque type de contenu
            earliest_match = None
            earliest_pos = len(remaining)
            matched_type = None
            
            # Vérifier tous les patterns
            detectors = [
                (self._detect_code_block, ContentType.CODE),
                (self._detect_table, ContentType.TABLE),
                (self._detect_video, ContentType.VIDEO),
                (self._detect_image, ContentType.IMAGE),
                (self._detect_embed, ContentType.EMBED),
                (self._detect_audio, ContentType.AUDIO),
                (self._detect_url, ContentType.URL),
            ]
            
            for detector, content_type in detectors:
                match = detector(remaining)
                if match and match['start'] < earliest_pos:
                    earliest_match = match
                    earliest_pos = match['start']
                    matched_type = content_type
            
            if earliest_match:
                # Ajouter le texte avant le match
                if earliest_pos > 0:
                    text_content = remaining[:earliest_pos].strip()
                    if text_content:
                        blocks.append(ContentBlock(
                            type=ContentType.MARKDOWN if self._is_markdown(text_content) else ContentType.TEXT,
                            content=text_content,
                            start_pos=position,
                            end_pos=position + earliest_pos
                        ))
                
                # Ajouter le contenu détecté
                blocks.append(ContentBlock(
                    type=matched_type or ContentType.TEXT,
                    content=earliest_match['content'],
                    metadata=earliest_match.get('metadata', {}),
                    start_pos=position + earliest_pos,
                    end_pos=position + earliest_match['end']
                ))
                
                # Continuer avec le reste
                position += earliest_match['end']
                remaining = remaining[earliest_match['end']:]
            else:
                # Plus de matches, ajouter le reste comme texte/markdown
                if remaining.strip():
                    blocks.append(ContentBlock(
                        type=ContentType.MARKDOWN if self._is_markdown(remaining) else ContentType.TEXT,
                        content=remaining.strip(),
                        start_pos=position,
                        end_pos=position + len(remaining)
                    ))
                break
        
        return blocks
    
    def _detect_code_block(self, content: str) -> Optional[Dict[str, Any]]:
        """Détecte les blocs de code"""
        match = self.patterns['code_block'].search(content)
        if match:
            return {
                'start': match.start(),
                'end': match.end(),
                'content': match.group(2),
                'metadata': {'language': match.group(1) or 'plain text'}
            }
        
        # Détecter le code indenté (4 espaces ou 1 tab)
        lines = content.split('\n')
        code_start = None
        code_lines = []
        
        for i, line in enumerate(lines):
            if line.startswith('    ') or line.startswith('\t'):
                if code_start is None:
                    code_start = sum(len(l) + 1 for l in lines[:i])
                code_lines.append(line[4:] if line.startswith('    ') else line[1:])
            elif code_start is not None and code_lines:
                # Fin du bloc de code
                code_content = '\n'.join(code_lines)
                return {
                    'start': code_start,
                    'end': code_start + len(code_content) + len(code_lines) * 4,
                    'content': code_content,
                    'metadata': {'language': self._detect_language(code_content)}
                }
        
        return None
    
    def _detect_table(self, content: str) -> Optional[Dict[str, Any]]:
        """Détecte les tableaux Markdown"""
        match = self.patterns['table'].search(content)
        if match:
            return {
                'start': match.start(),
                'end': match.end(),
                'content': match.group(0),
                'metadata': {
                    'header': match.group(1),
                    'separator': match.group(2),
                    'rows': match.group(3)
                }
            }
        return None
    
    def _detect_video(self, content: str) -> Optional[Dict[str, Any]]:
        """Détecte les vidéos (YouTube, Vimeo, etc.)"""
        # YouTube
        match = self.patterns['youtube'].search(content)
        if match:
            video_id = match.group(1)
            return {
                'start': match.start(),
                'end': match.end(),
                'content': match.group(0),
                'metadata': {
                    'platform': 'youtube',
                    'video_id': video_id,
                    'embed_url': f'https://www.youtube.com/embed/{video_id}'
                }
            }
        
        # Vimeo
        match = self.patterns['vimeo'].search(content)
        if match:
            video_id = match.group(1)
            return {
                'start': match.start(),
                'end': match.end(),
                'content': match.group(0),
                'metadata': {
                    'platform': 'vimeo',
                    'video_id': video_id,
                    'embed_url': f'https://player.vimeo.com/video/{video_id}'
                }
            }
        
        return None
    
    def _detect_image(self, content: str) -> Optional[Dict[str, Any]]:
        """Détecte les images (URLs et Markdown)"""
        # Image Markdown ![alt](url)
        match = self.patterns['image_markdown'].search(content)
        if match:
            return {
                'start': match.start(),
                'end': match.end(),
                'content': match.group(2),
                'metadata': {
                    'alt_text': match.group(1),
                    'format': 'markdown'
                }
            }
        
        # URL d'image directe
        match = self.patterns['image_url'].search(content)
        if match:
            return {
                'start': match.start(),
                'end': match.end(),
                'content': match.group(1),
                'metadata': {
                    'format': 'url'
                }
            }
        
        return None
    
    def _detect_embed(self, content: str) -> Optional[Dict[str, Any]]:
        """Détecte les embeds (CodePen, JSFiddle, etc.)"""
        match = self.patterns['embed_url'].search(content)
        if match:
            url = match.group(1)
            return {
                'start': match.start(),
                'end': match.end(),
                'content': url,
                'metadata': {
                    'platform': self._get_embed_platform(url),
                    'embed_url': self._get_embed_url(url)
                }
            }
        
        # Twitter
        match = self.patterns['twitter'].search(content)
        if match:
            return {
                'start': match.start(),
                'end': match.end(),
                'content': match.group(0),
                'metadata': {
                    'platform': 'twitter',
                    'tweet_id': match.group(1)
                }
            }
        
        return None
    
    def _detect_audio(self, content: str) -> Optional[Dict[str, Any]]:
        """Détecte les fichiers audio"""
        match = self.patterns['audio_url'].search(content)
        if match:
            return {
                'start': match.start(),
                'end': match.end(),
                'content': match.group(1),
                'metadata': {
                    'format': 'url'
                }
            }
        return None
    
    def _detect_url(self, content: str) -> Optional[Dict[str, Any]]:
        """Détecte les URLs génériques"""
        # Pattern simple pour URL
        url_pattern = re.compile(r'https?://[^\s]+')
        match = url_pattern.search(content)
        if match:
            url = match.group(0)
            # Vérifier que ce n'est pas déjà détecté comme autre chose
            if not any(p.search(url) for p in [
                self.patterns['youtube'], self.patterns['vimeo'],
                self.patterns['image_url'], self.patterns['embed_url'],
                self.patterns['audio_url']
            ]):
                return {
                    'start': match.start(),
                    'end': match.end(),
                    'content': url,
                    'metadata': {}
                }
        return None
    
    def _is_markdown(self, content: str) -> bool:
        """Vérifie si le contenu contient du Markdown"""
        markdown_indicators = [
            r'^#{1,6}\s',  # Headers
            r'\*\*[^*]+\*\*',  # Bold
            r'\*[^*]+\*',  # Italic
            r'\[([^\]]+)\]\(([^)]+)\)',  # Links
            r'^\s*[-*+]\s',  # Lists
            r'^\s*\d+\.\s',  # Numbered lists
            r'^>\s',  # Quotes
            r'`[^`]+`',  # Inline code
        ]
        
        for pattern in markdown_indicators:
            if re.search(pattern, content, re.MULTILINE):
                return True
        return False
    
    def _detect_language(self, code: str) -> str:
        """Détecte le langage de programmation"""
        # Indicateurs par langage
        language_hints = {
            'python': ['def ', 'import ', 'from ', 'class ', '__init__', 'self.', 'print('],
            'javascript': ['function', 'const ', 'let ', 'var ', '=>', 'console.', 'document.'],
            'typescript': ['interface ', 'type ', ': string', ': number', 'export '],
            'java': ['public class', 'private ', 'protected ', 'static void', 'System.out'],
            'cpp': ['#include', 'std::', 'cout', 'cin', 'namespace', 'nullptr'],
            'csharp': ['using System', 'namespace ', 'public class', 'static void Main'],
            'html': ['<!DOCTYPE', '<html', '<div', '<span', '<body'],
            'css': ['{', '}', ':', ';', 'px', 'color:', 'background:', '.class', '#id'],
            'sql': ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'CREATE TABLE', 'JOIN'],
            'json': ['{"', '"}', '": "', '": {', '": [', '": true', '": false'],
            'yaml': [':', '-', 'name:', 'version:', 'services:', '  '],
            'rust': ['fn ', 'let ', 'mut ', 'impl ', 'pub ', 'use ', '::'],
            'go': ['func ', 'package ', 'import ', 'var ', 'type ', 'struct '],
            'ruby': ['def ', 'end', 'class ', 'require ', 'puts ', '@', 'attr_'],
            'php': ['<?php', '$', 'function ', 'echo ', 'namespace ', '->'],
            'swift': ['func ', 'var ', 'let ', 'class ', 'struct ', 'import '],
            'kotlin': ['fun ', 'val ', 'var ', 'class ', 'package ', 'import ']
        }
        
        scores = {}
        code_lower = code.lower()
        
        for lang, hints in language_hints.items():
            score = sum(1 for hint in hints if hint.lower() in code_lower)
            if score > 0:
                scores[lang] = score
        
        if scores:
            return max(scores, key=lambda k: scores[k])
        
        return 'plain text'
    
    def _convert_to_notion_block(self, block: ContentBlock) -> Union[Dict[str, Any], List[Dict[str, Any]], None]:
        """Convertit un ContentBlock en bloc(s) Notion"""
        
        if block.type == ContentType.TEXT:
            return self._create_text_block(block.content)
        
        elif block.type == ContentType.MARKDOWN:
            # Utiliser le parser Markdown existant
            from backend.martian_parser import markdown_to_blocks
            return markdown_to_blocks(block.content)
        
        elif block.type == ContentType.CODE:
            return self._create_code_block(
                block.content,
                block.metadata.get('language', 'plain text')
            )
        
        elif block.type == ContentType.IMAGE:
            return self._create_image_block(
                block.content,
                block.metadata.get('alt_text', '')
            )
        
        elif block.type == ContentType.VIDEO:
            return self._create_video_block(
                block.content,
                block.metadata
            )
        
        elif block.type == ContentType.TABLE:
            return self._create_table_blocks(block.content)
        
        elif block.type == ContentType.EMBED:
            return self._create_embed_block(
                block.content,
                block.metadata
            )
        
        elif block.type == ContentType.AUDIO:
            return self._create_audio_block(block.content)
        
        elif block.type == ContentType.URL:
            return self._create_bookmark_block(block.content)
        
        return None
    
    def _create_text_block(self, content: str) -> Dict[str, Any]:
        """Crée un bloc de texte simple"""
        return {
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": content[:2000]}  # Limite Notion
                }]
            }
        }
    
    def _create_code_block(self, content: str, language: str = "plain text") -> Dict[str, Any]:
        """Crée un bloc de code"""
        # Valider le langage
        valid_languages = [
            'abap', 'arduino', 'bash', 'basic', 'c', 'clojure', 'coffeescript',
            'cpp', 'csharp', 'css', 'dart', 'diff', 'docker', 'elixir', 'elm',
            'erlang', 'flow', 'fortran', 'fsharp', 'gherkin', 'glsl', 'go',
            'graphql', 'groovy', 'haskell', 'html', 'java', 'javascript', 'json',
            'julia', 'kotlin', 'latex', 'less', 'lisp', 'livescript', 'lua',
            'makefile', 'markdown', 'markup', 'matlab', 'mermaid', 'nix',
            'objective-c', 'ocaml', 'pascal', 'perl', 'php', 'plain text',
            'powershell', 'prolog', 'protobuf', 'python', 'r', 'reason',
            'ruby', 'rust', 'sass', 'scala', 'scheme', 'scss', 'shell',
            'sql', 'swift', 'typescript', 'vbnet', 'verilog', 'vhdl',
            'visual basic', 'webassembly', 'xml', 'yaml'
        ]
        
        if language not in valid_languages:
            language = 'plain text'
        
        return {
            "type": "code",
            "code": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": content[:2000]}
                }],
                "language": language
            }
        }
    
    def _create_image_block(self, url: str, alt_text: str = "") -> Dict[str, Any]:
        """Crée un bloc image"""
        # Si c'est une data URL, essayer de l'uploader
        if url.startswith('data:image/') and self.imgbb_key:
            uploaded_url = self._upload_to_imgbb(url)
            if uploaded_url:
                url = uploaded_url
        
        return {
            "type": "image",
            "image": {
                "type": "external",
                "external": {"url": url}
            }
        }
    
    def _create_video_block(self, url: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Crée un bloc vidéo"""
        # Notion supporte les embeds YouTube et Vimeo directement
        if metadata.get('platform') in ['youtube', 'vimeo']:
            return {
                "type": "embed",
                "embed": {"url": url}
            }
        
        # Pour les autres, créer un bookmark
        return self._create_bookmark_block(url)
    
    def _create_table_blocks(self, table_content: str) -> List[Dict[str, Any]]:
        """Convertit un tableau Markdown en blocs Notion"""
        lines = table_content.strip().split('\n')
        blocks = []
        
        # Notion ne supporte pas directement les tableaux dans l'API
        # On crée donc une représentation alternative
        
        # Option 1: Utiliser des toggles pour chaque ligne
        for i, line in enumerate(lines):
            if i == 1 and all(c in '|-: ' for c in line):
                continue  # Skip separator line
            
            cells = [cell.strip() for cell in line.strip('|').split('|')]
            
            if i == 0:
                # Header en gras
                blocks.append({
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": " | ".join(cells)},
                            "annotations": {"bold": True}
                        }]
                    }
                })
            else:
                # Lignes de données
                blocks.append({
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": " | ".join(cells)}
                        }]
                    }
                })
        
        return blocks
    
    def _create_embed_block(self, url: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Crée un bloc embed"""
        # Notion supporte certains embeds directement
        supported_platforms = ['codepen', 'replit', 'figma', 'gist', 'loom', 'typeform']
        
        if metadata.get('platform', '').lower() in supported_platforms:
            return {
                "type": "embed",
                "embed": {"url": url}
            }
        
        # Pour Twitter, utiliser l'embed
        if metadata.get('platform') == 'twitter':
            return {
                "type": "embed",
                "embed": {"url": f"https://twitter.com/i/status/{metadata.get('tweet_id')}"}
            }
        
        # Sinon, bookmark
        return self._create_bookmark_block(url)
    
    def _create_audio_block(self, url: str) -> Dict[str, Any]:
        """Crée un bloc audio"""
        # Notion ne supporte pas directement l'audio, utiliser un callout avec lien
        return {
            "type": "callout",
            "callout": {
                "rich_text": [{
                    "type": "text",
                    "text": {
                        "content": "🎵 Fichier audio: ",
                    }
                }, {
                    "type": "text",
                    "text": {
                        "content": url.split('/')[-1],
                        "link": {"url": url}
                    }
                }],
                "icon": {"emoji": "🎵"}
            }
        }
    
    def _create_bookmark_block(self, url: str) -> Dict[str, Any]:
        """Crée un bloc bookmark"""
        return {
            "type": "bookmark",
            "bookmark": {"url": url}
        }
    
    def _create_fallback_blocks(self, content: str) -> List[Dict[str, Any]]:
        """Crée des blocs de fallback si aucun parsing n'a fonctionné"""
        # Diviser en paragraphes
        paragraphs = content.split('\n\n')
        blocks = []
        
        for para in paragraphs:
            if para.strip():
                blocks.append(self._create_text_block(para.strip()))
        
        return blocks or [self._create_text_block(content)]
    
    def _handle_specific_type(self, content: str, content_type: str) -> List[Dict[str, Any]]:
        """Gère un type de contenu spécifique"""
        handlers = {
            'text': lambda c: [self._create_text_block(c)],
            'markdown': lambda c: self._parse_markdown_to_blocks(c),
            'code': lambda c: [self._create_code_block(c, self._detect_language(c))],
            'image': lambda c: [self._create_image_block(c)],
            'video': lambda c: [self._create_video_block(c, {})],
            'audio': lambda c: [self._create_audio_block(c)],
            'url': lambda c: [self._create_bookmark_block(c)],
            'table': lambda c: self._create_table_blocks(c)
        }
        
        handler = handlers.get(content_type)
        if handler:
            return handler(content)
        
        return self._create_fallback_blocks(content)
    
    def _parse_markdown_to_blocks(self, content: str) -> List[Dict[str, Any]]:
        """Parse du Markdown complet en blocs Notion"""
        try:
            from backend.martian_parser import markdown_to_blocks
            return markdown_to_blocks(content)
        except:
            # Fallback si l'import échoue
            return self._create_fallback_blocks(content)
    
    def _get_embed_platform(self, url: str) -> str:
        """Détermine la plateforme d'embed"""
        domain_map = {
            'codepen.io': 'codepen',
            'jsfiddle.net': 'jsfiddle',
            'codesandbox.io': 'codesandbox',
            'repl.it': 'replit',
            'replit.com': 'replit',
            'glitch.com': 'glitch',
            'stackblitz.com': 'stackblitz'
        }
        
        parsed = urlparse(url)
        domain = parsed.netloc.lower().replace('www.', '')
        
        return domain_map.get(domain, 'unknown')
    
    def _get_embed_url(self, url: str) -> str:
        """Obtient l'URL d'embed appropriée"""
        # La plupart des plateformes utilisent l'URL directement
        return url
    
    def _upload_to_imgbb(self, data_url: str) -> Optional[str]:
        """Upload une image data URL vers ImgBB"""
        if not self.imgbb_key:
            return None
        
        try:
            # Extraire les données base64
            import base64
            import requests
            
            header, data = data_url.split(',', 1)
            
            response = requests.post(
                'https://api.imgbb.com/1/upload',
                data={
                    'key': self.imgbb_key,
                    'image': data
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return result['data']['url']
        except Exception as e:
            print(f"Erreur upload ImgBB: {e}")
        
        return None


# Fonction helper pour une utilisation facile
def parse_content_for_notion(content: str, content_type: Optional[str] = None, 
                           imgbb_key: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fonction principale pour parser du contenu vers des blocs Notion
    
    Args:
        content: Le contenu à parser
        content_type: Type forcé (optionnel)
        imgbb_key: Clé API ImgBB pour l'upload d'images (optionnel)
    
    Returns:
        Liste de blocs Notion
    """
    parser = EnhancedContentParser(imgbb_key=imgbb_key)
    return parser.parse_content(content, content_type)