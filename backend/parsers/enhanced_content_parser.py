# backend/enhanced_content_parser.py
"""
Parser de contenu amélioré pour Notion Clipper Pro
Gère intelligemment différents types de contenu et les convertit en blocs Notion
"""

import re
import json
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse, parse_qs
import html
from datetime import datetime

from backend.parsers.markdown_parser import validate_notion_blocks
from backend.handlers.image_handler import ImageHandler


class EnhancedContentParser:
    """Parser avancé pour convertir différents types de contenu en blocs Notion"""
    
    def __init__(self, imgbb_key: Optional[str] = None):
        self.image_handler = ImageHandler(imgbb_key)
        
        # Patterns de détection
        self.patterns = {
            'youtube': r'(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([\w-]+)',
            'vimeo': r'(?:https?://)?(?:www\.)?vimeo\.com/(\d+)',
            'twitter': r'(?:https?://)?(?:www\.)?(?:twitter\.com|x\.com)/\w+/status/(\d+)',
            'github_gist': r'(?:https?://)?gist\.github\.com/[\w-]+/([\w]+)',
            'codepen': r'(?:https?://)?codepen\.io/[\w-]+/pen/([\w]+)',
            'spotify': r'(?:https?://)?open\.spotify\.com/(track|album|playlist)/([\w]+)',
            'soundcloud': r'(?:https?://)?soundcloud\.com/[\w-]+/[\w-]+',
            'google_docs': r'(?:https?://)?docs\.google\.com/(document|spreadsheets|presentation)/d/([\w-]+)',
            'figma': r'(?:https?://)?(?:www\.)?figma\.com/file/([\w]+)',
            'miro': r'(?:https?://)?miro\.com/app/board/([\w=]+)',
            'loom': r'(?:https?://)?(?:www\.)?loom\.com/share/([\w]+)',
            'notion': r'(?:https?://)?(?:www\.)?notion\.so/([\w-]+)',
        }
        
        # Mapping des langages de programmation
        self.language_map = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'rb': 'ruby',
            'cpp': 'c++',
            'cs': 'c#',
            'php': 'php',
            'go': 'go',
            'rs': 'rust',
            'kt': 'kotlin',
            'swift': 'swift',
            'objc': 'objective-c',
            'r': 'r',
            'scala': 'scala',
            'dart': 'dart',
            'yml': 'yaml',
            'json': 'json',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'sql': 'sql',
            'graphql': 'graphql',
            'dockerfile': 'dockerfile',
            'bash': 'bash',
            'sh': 'shell',
            'ps1': 'powershell',
            'vim': 'vim',
            'lua': 'lua',
            'perl': 'perl',
            'java': 'java',
        }
    
    def parse_content(self, content: str, content_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Parse le contenu et retourne une liste de blocs Notion
        """
        if not content or not content.strip():
            return []
        
        # Déterminer le type de contenu si non spécifié
        if not content_type or content_type == 'mixed':
            content_type = self.detect_content_type(content)
        
        # Parser selon le type
        if content_type == 'code':
            return self.parse_code_content(content)
        elif content_type == 'markdown':
            return self.parse_markdown_content(content)
        elif content_type == 'table':
            return self.parse_table_content(content)
        elif content_type == 'url':
            return self.parse_url_content(content)
        elif content_type == 'html':
            return self.parse_html_content(content)
        else:
            # Par défaut, essayer de détecter et parser intelligemment
            return self.parse_mixed_content(content)
    
    def detect_content_type(self, content: str) -> str:
        """Détecte automatiquement le type de contenu"""
        content_lower = content.lower().strip()
        
        # URL seule
        if re.match(r'^https?://\S+$', content_lower):
            return 'url'
        
        # HTML
        if content_lower.startswith('<') and content_lower.endswith('>'):
            return 'html'
        
        # Tableau
        lines = content.strip().split('\n')
        if len(lines) > 1 and all('|' in line for line in lines[:3]):
            return 'table'
        
        # Code (avec indicateurs)
        if content.strip().startswith('```') or content.strip().startswith('<?'):
            return 'code'
        
        # Markdown (avec indicateurs forts)
        markdown_indicators = ['#', '**', '- [', '![', '[](', '```', '> ']
        if any(content.strip().startswith(ind) for ind in markdown_indicators):
            return 'markdown'
        
        return 'mixed'
    
    def parse_mixed_content(self, content: str) -> List[Dict[str, Any]]:
        """Parse du contenu mixte en détectant différents éléments"""
        blocks = []
        lines = content.split('\n')
        current_block = []
        current_type = None
        in_code_block = False
        code_language = ''
        
        for i, line in enumerate(lines):
            # Détection de bloc de code
            if line.strip().startswith('```'):
                if not in_code_block:
                    # Finir le bloc précédent
                    if current_block and current_type:
                        blocks.extend(self._create_blocks_from_lines(current_block, current_type))
                        current_block = []
                    
                    # Commencer un bloc de code
                    in_code_block = True
                    code_language = line.strip()[3:].strip() or 'plain text'
                    current_type = 'code'
                else:
                    # Finir le bloc de code
                    if current_block:
                        blocks.append(self._create_code_block('\n'.join(current_block), code_language))
                    in_code_block = False
                    current_block = []
                    current_type = None
                continue
            
            if in_code_block:
                current_block.append(line)
                continue
            
            # Détection d'URL seule sur une ligne
            if re.match(r'^https?://\S+$', line.strip()):
                # Finir le bloc précédent
                if current_block and current_type:
                    blocks.extend(self._create_blocks_from_lines(current_block, current_type))
                    current_block = []
                
                # Créer un bloc embed/bookmark
                url_blocks = self.parse_url_content(line.strip())
                blocks.extend(url_blocks)
                current_type = None
                continue
            
            # Détection d'image
            image_match = re.match(r'!\[([^\]]*)\]\(([^)]+)\)', line.strip())
            if image_match:
                # Finir le bloc précédent
                if current_block and current_type:
                    blocks.extend(self._create_blocks_from_lines(current_block, current_type))
                    current_block = []
                
                # Créer un bloc image
                alt_text = image_match.group(1)
                image_url = image_match.group(2)
                processed_url = self.image_handler.process_image_url(image_url, alt_text)
                
                if processed_url:
                    blocks.append({
                        'type': 'image',
                        'image': {
                            'type': 'external',
                            'external': {'url': processed_url},
                            'caption': [{'type': 'text', 'text': {'content': alt_text}}] if alt_text else []
                        }
                    })
                current_type = None
                continue
            
            # Ligne vide - finir le bloc actuel
            if not line.strip():
                if current_block and current_type:
                    blocks.extend(self._create_blocks_from_lines(current_block, current_type))
                    current_block = []
                    current_type = None
                continue
            
            # Déterminer le type de la ligne actuelle
            line_type = self._detect_line_type(line)
            
            # Si le type change, finir le bloc précédent
            if line_type != current_type and current_block:
                if current_type is not None:
                    blocks.extend(self._create_blocks_from_lines(current_block, current_type))
                current_block = []
            
            current_type = line_type
            current_block.append(line)
        
        # Finir le dernier bloc
        if current_block and current_type:
            blocks.extend(self._create_blocks_from_lines(current_block, current_type))
        
        return validate_notion_blocks(blocks)
    
    def _detect_line_type(self, line: str) -> str:
        """Détecte le type d'une ligne"""
        if line.strip().startswith('#'):
            return 'heading'
        elif re.match(r'^[-*]\s+\[[ xX]\]', line):
            return 'todo'
        elif re.match(r'^[-*]\s+', line):
            return 'bullet'
        elif re.match(r'^\d+\.\s+', line):
            return 'numbered'
        elif line.strip().startswith('>'):
            return 'quote'
        elif re.match(r'^\|.*\|$', line.strip()):
            return 'table'
        else:
            return 'paragraph'
    
    def _create_blocks_from_lines(self, lines: List[str], block_type: str) -> List[Dict[str, Any]]:
        """Crée des blocs Notion à partir de lignes de texte"""
        blocks = []
        
        if block_type == 'heading':
            for line in lines:
                level = len(line) - len(line.lstrip('#'))
                text = line.strip('#').strip()
                heading_type = f'heading_{min(level, 3)}'
                
                blocks.append({
                    'type': heading_type,
                    heading_type: {
                        'rich_text': self._parse_rich_text(text)
                    }
                })
        
        elif block_type == 'bullet':
            for line in lines:
                text = re.sub(r'^[-*]\s+', '', line)
                blocks.append({
                    'type': 'bulleted_list_item',
                    'bulleted_list_item': {
                        'rich_text': self._parse_rich_text(text)
                    }
                })
        
        elif block_type == 'numbered':
            for line in lines:
                text = re.sub(r'^\d+\.\s+', '', line)
                blocks.append({
                    'type': 'numbered_list_item',
                    'numbered_list_item': {
                        'rich_text': self._parse_rich_text(text)
                    }
                })
        
        elif block_type == 'todo':
            for line in lines:
                match = re.match(r'^[-*]\s+\[([ xX])\]\s+(.+)', line)
                if match:
                    checked = match.group(1).lower() == 'x'
                    text = match.group(2)
                    blocks.append({
                        'type': 'to_do',
                        'to_do': {
                            'rich_text': self._parse_rich_text(text),
                            'checked': checked
                        }
                    })
        
        elif block_type == 'quote':
            for line in lines:
                text = line.strip().lstrip('>').strip()
                blocks.append({
                    'type': 'quote',
                    'quote': {
                        'rich_text': self._parse_rich_text(text)
                    }
                })
        
        elif block_type == 'table':
            # Parser toutes les lignes comme un tableau
            blocks.extend(self.parse_table_content('\n'.join(lines)))
        
        else:  # paragraph
            # Combiner les lignes en un seul paragraphe
            text = ' '.join(lines)
            if text.strip():
                blocks.append({
                    'type': 'paragraph',
                    'paragraph': {
                        'rich_text': self._parse_rich_text(text)
                    }
                })
        
        return blocks
    
    def _parse_rich_text(self, text: str) -> List[Dict[str, Any]]:
        """Parse le texte avec formatage inline"""
        if not text:
            return []
        
        elements = []
        remaining = text
        
        # Patterns pour le formatage inline
        patterns = [
            (r'\*\*([^*]+)\*\*', 'bold'),
            (r'\*([^*]+)\*', 'italic'),
            (r'`([^`]+)`', 'code'),
            (r'~~([^~]+)~~', 'strikethrough'),
            (r'\[([^\]]+)\]\(([^)]+)\)', 'link'),
        ]
        
        while remaining:
            earliest_match = None
            earliest_pos = len(remaining)
            match_type = None
            
            # Trouver le premier match
            for pattern, ptype in patterns:
                match = re.search(pattern, remaining)
                if match and match.start() < earliest_pos:
                    earliest_match = match
                    earliest_pos = match.start()
                    match_type = ptype
            
            if earliest_match:
                # Ajouter le texte avant le match
                if earliest_pos > 0:
                    elements.append({
                        'type': 'text',
                        'text': {'content': remaining[:earliest_pos]}
                    })
                
                # Ajouter le texte formaté
                if match_type == 'link':
                    elements.append({
                        'type': 'text',
                        'text': {
                            'content': earliest_match.group(1),
                            'link': {'url': earliest_match.group(2)}
                        }
                    })
                else:
                    content = earliest_match.group(1)
                    element = {
                        'type': 'text',
                        'text': {'content': content},
                        'annotations': {}
                    }
                    
                    if match_type == 'bold':
                        element['annotations']['bold'] = True
                    elif match_type == 'italic':
                        element['annotations']['italic'] = True
                    elif match_type == 'code':
                        element['annotations']['code'] = True
                    elif match_type == 'strikethrough':
                        element['annotations']['strikethrough'] = True
                    
                    elements.append(element)
                
                # Continuer avec le reste
                remaining = remaining[earliest_pos + len(earliest_match.group(0)):]
            else:
                # Plus de matches, ajouter le reste
                elements.append({
                    'type': 'text',
                    'text': {'content': remaining}
                })
                break
        
        return elements if elements else [{'type': 'text', 'text': {'content': text}}]
    
    def parse_markdown_content(self, content: str) -> List[Dict[str, Any]]:
        """Parse du contenu Markdown complet"""
        # Utiliser le parser mixte qui gère déjà bien le Markdown
        return self.parse_mixed_content(content)
    
    def parse_code_content(self, content: str) -> List[Dict[str, Any]]:
        """Parse du contenu code"""
        # Détecter le langage si possible
        language = 'plain text'
        code_content = content
        
        # Si le contenu commence par ```
        if content.strip().startswith('```'):
            lines = content.strip().split('\n')
            if len(lines) > 1:
                first_line = lines[0][3:].strip()
                if first_line:
                    language = self.language_map.get(first_line.lower(), first_line)
                if lines[-1].strip() == '```':
                    code_content = '\n'.join(lines[1:-1])
                else:
                    code_content = '\n'.join(lines[1:])
        
        return [self._create_code_block(code_content, language)]
    
    def _create_code_block(self, code: str, language: str = 'plain text') -> Dict[str, Any]:
        """Crée un bloc de code Notion"""
        # Normaliser le langage
        language = self.language_map.get(language.lower(), language)
        
        return {
            'type': 'code',
            'code': {
                'rich_text': [{'type': 'text', 'text': {'content': code}}],
                'language': language
            }
        }
    
    def parse_table_content(self, content: str) -> List[Dict[str, Any]]:
        """Parse du contenu de tableau"""
        lines = content.strip().split('\n')
        if not lines:
            return []
        
        # Filtrer les lignes vides et les séparateurs
        table_lines = []
        for line in lines:
            if '|' in line and not re.match(r'^[\s\-:|]+$', line):
                table_lines.append(line)
        
        if len(table_lines) < 2:
            # Pas assez de lignes pour un tableau
            return self.parse_mixed_content(content)
        
        # Parser les cellules
        rows = []
        for line in table_lines:
            cells = [cell.strip() for cell in line.split('|') if cell.strip()]
            if cells:
                rows.append(cells)
        
        if not rows:
            return []
        
        # Créer le bloc table Notion
        # Note: L'API Notion ne supporte pas directement les tables,
        # donc on crée une représentation alternative
        blocks = []
        
        # Titre du tableau (première ligne)
        if rows:
            blocks.append({
                'type': 'heading_3',
                'heading_3': {
                    'rich_text': [{'type': 'text', 'text': {'content': 'Tableau'}}]
                }
            })
        
        # Créer une liste pour chaque ligne
        for i, row in enumerate(rows):
            if i == 0:
                # En-têtes en gras
                text = ' | '.join(f'**{cell}**' for cell in row)
            else:
                text = ' | '.join(row)
            
            blocks.append({
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': self._parse_rich_text(text)
                }
            })
        
        return blocks
    
    def parse_url_content(self, content: str) -> List[Dict[str, Any]]:
        """Parse une URL et crée le bloc approprié"""
        url = content.strip()
        
        # Vérifier si c'est une URL spéciale
        for pattern_name, pattern in self.patterns.items():
            match = re.match(pattern, url)
            if match:
                return self._create_embed_block(url, pattern_name, match)
        
        # URL d'image
        if self.image_handler.is_image_url(url):
            processed_url = self.image_handler.process_image_url(url)
            if processed_url:
                return [{
                    'type': 'image',
                    'image': {
                        'type': 'external',
                        'external': {'url': processed_url}
                    }
                }]
        
        # URL générique - créer un bookmark
        return [{
            'type': 'bookmark',
            'bookmark': {'url': url}
        }]
    
    def _create_embed_block(self, url: str, platform: str, match) -> List[Dict[str, Any]]:
        """Crée un bloc embed pour les plateformes supportées"""
        # Pour la plupart des plateformes, Notion utilise des bookmarks
        # qui s'affichent automatiquement comme des embeds
        
        blocks = []
        
        # Ajouter un contexte pour certaines plateformes
        if platform == 'youtube':
            blocks.append({
                'type': 'callout',
                'callout': {
                    'rich_text': [{'type': 'text', 'text': {'content': f'📹 Vidéo YouTube'}}],
                    'icon': {'emoji': '📹'},
                    'color': 'red_background'
                }
            })
        elif platform == 'twitter':
            blocks.append({
                'type': 'callout',
                'callout': {
                    'rich_text': [{'type': 'text', 'text': {'content': f'🐦 Tweet'}}],
                    'icon': {'emoji': '🐦'},
                    'color': 'blue_background'
                }
            })
        
        # Ajouter le bookmark
        blocks.append({
            'type': 'bookmark',
            'bookmark': {'url': url}
        })
        
        return blocks
    
    def parse_html_content(self, content: str) -> List[Dict[str, Any]]:
        """Parse du contenu HTML basique"""
        # Nettoyer le HTML
        text = html.unescape(content)
        text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<p[^>]*>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
        
        # Parser comme du texte mixte
        return self.parse_mixed_content(text.strip())


def parse_content_for_notion(
    content: str,
    content_type: Optional[str] = None,
    imgbb_key: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Fonction principale pour parser du contenu en blocs Notion
    """
    parser = EnhancedContentParser(imgbb_key)
    blocks = parser.parse_content(content, content_type)
    return validate_notion_blocks(blocks)