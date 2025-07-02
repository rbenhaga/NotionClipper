# backend/martian_parser.py
import re
import json
from typing import List, Dict, Any, Optional, Tuple

def parse_inline_markdown(text: str) -> List[Dict[str, Any]]:
    """Parse le formatage inline (gras, italique, liens, code)"""
    if not text:
        return []
    
    segments = []
    remaining = text
    
    while remaining:
        # Chercher le prochain pattern
        earliest_match = None
        earliest_pos = len(remaining)
        matched_type = None
        
        patterns = [
            (r'\*\*\*(.+?)\*\*\*', 'bold_italic'),
            (r'\*\*(.+?)\*\*', 'bold'),
            (r'\*(.+?)\*', 'italic'),
            (r'~~(.+?)~~', 'strikethrough'),
            (r'`([^`]+)`', 'code'),
            (r'\[([^\]]+)\]\(([^)]+)\)', 'link'),
        ]
        
        for pattern, ptype in patterns:
            match = re.search(pattern, remaining)
            if match and match.start() < earliest_pos:
                earliest_match = match
                earliest_pos = match.start()
                matched_type = ptype
        
        if earliest_match:
            # Ajouter le texte avant le match
            if earliest_pos > 0:
                segments.append({
                    "type": "text",
                    "text": {"content": remaining[:earliest_pos]}
                })
            
            # Ajouter le segment formaté
            if matched_type == 'link':
                segments.append({
                    "type": "text",
                    "text": {
                        "content": earliest_match.group(1),
                        "link": {"url": earliest_match.group(2)}
                    }
                })
            else:
                content = earliest_match.group(1)
                segment = {
                    "type": "text",
                    "text": {"content": content},
                    "annotations": {
                        "bold": matched_type in ['bold', 'bold_italic'],
                        "italic": matched_type in ['italic', 'bold_italic'],
                        "strikethrough": matched_type == 'strikethrough',
                        "underline": False,
                        "code": matched_type == 'code',
                        "color": "default"
                    }
                }
                segments.append(segment)
            
            remaining = remaining[earliest_match.end():]
        else:
            # Plus de patterns, ajouter le reste
            if remaining:
                segments.append({
                    "type": "text",
                    "text": {"content": remaining}
                })
            break
    
    return segments if segments else [{"type": "text", "text": {"content": text}}]

def markdown_to_blocks(markdown: str, options: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Parser Markdown complet pour Notion"""
    if not markdown:
        return []
    
    blocks = []
    lines = markdown.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Headers H1-H6
        if match := re.match(r'^(#{1,6})\s+(.+)$', line):
            level = min(len(match.group(1)), 3)  # Notion supporte H1-H3
            blocks.append({
                "type": f"heading_{level}",
                f"heading_{level}": {
                    "rich_text": parse_inline_markdown(match.group(2).strip()),
                    "is_toggleable": False
                }
            })
        
        # Code blocks avec ```
        elif line.strip().startswith('```'):
            lang = line.strip()[3:].strip() or "plain text"
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            
            blocks.append({
                "type": "code",
                "code": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": '\n'.join(code_lines)}
                    }],
                    "language": lang
                }
            })
        
        # Tables (détection améliorée)
        elif '|' in line and i + 1 < len(lines) and ('|' in lines[i + 1] or re.match(r'^[\s\-|]+$', lines[i + 1])):
            table_lines = []
            start_i = i
            
            # Collecter toutes les lignes du tableau
            while i < len(lines) and '|' in lines[i]:
                if not re.match(r'^[\s\-|]+$', lines[i]):  # Ignorer les lignes de séparation
                    table_lines.append(lines[i])
                i += 1
            i -= 1  # Reculer d'une ligne car on a trop avancé
            
            if table_lines:
                # Parser le tableau
                rows = []
                for line in table_lines:
                    cells = [cell.strip() for cell in line.split('|')]
                    # Retirer les cellules vides au début et à la fin
                    if cells and not cells[0]:
                        cells = cells[1:]
                    if cells and not cells[-1]:
                        cells = cells[:-1]
                    if cells:
                        rows.append(cells)
                
                if rows:
                    # Créer le bloc table
                    max_cols = max(len(row) for row in rows)
                    
                    # Normaliser les lignes
                    for row in rows:
                        while len(row) < max_cols:
                            row.append("")
                    
                    blocks.append({
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
                                                "text": {"content": cell}
                                            }]
                                            for cell in row
                                        ]
                                    }
                                }
                                for row in rows
                            ]
                        }
                    })
        
        # Images ![alt](url)
        elif match := re.match(r'^!\[([^\]]*)\]\(([^)]+)\)$', line.strip()):
            alt_text = match.group(1)
            image_url = match.group(2)
            
            blocks.append({
                "type": "image",
                "image": {
                    "type": "external",
                    "external": {"url": image_url}
                }
            })
        
        # Vidéos YouTube (détection inline)
        elif 'youtube.com' in line or 'youtu.be' in line:
            # Extraire l'URL YouTube
            youtube_patterns = [
                r'(https?://(?:www\.)?youtube\.com/watch\?v=[a-zA-Z0-9_-]+)',
                r'(https?://(?:www\.)?youtu\.be/[a-zA-Z0-9_-]+)',
                r'(https?://(?:www\.)?youtube\.com/embed/[a-zA-Z0-9_-]+)'
            ]
            
            found_video = False
            for pattern in youtube_patterns:
                if match := re.search(pattern, line):
                    youtube_url = match.group(1)
                    
                    # Texte avant la vidéo
                    text_before = line[:match.start()].strip()
                    if text_before:
                        blocks.append({
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": parse_inline_markdown(text_before)
                            }
                        })
                    
                    # Bloc vidéo
                    blocks.append({
                        "type": "video",
                        "video": {
                            "type": "external",
                            "external": {"url": youtube_url}
                        }
                    })
                    
                    # Texte après la vidéo
                    text_after = line[match.end():].strip()
                    if text_after:
                        blocks.append({
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": parse_inline_markdown(text_after)
                            }
                        })
                    
                    found_video = True
                    break
            
            if not found_video and line.strip():
                # Si pas de vidéo trouvée, traiter comme paragraphe
                blocks.append({
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": parse_inline_markdown(line)
                    }
                })
        
        # Blockquotes >
        elif line.strip().startswith('>'):
            quote_text = line.strip()[1:].strip()
            
            # Vérifier si c'est une alerte GFM
            if match := re.match(r'^\[!(\w+)\](.*)$', quote_text):
                alert_type = match.group(1).upper()
                alert_content = match.group(2).strip()
                
                # Collecter les lignes suivantes de l'alerte
                alert_lines = [alert_content] if alert_content else []
                j = i + 1
                while j < len(lines) and lines[j].strip().startswith('>'):
                    alert_lines.append(lines[j].strip()[1:].strip())
                    j += 1
                i = j - 1
                
                # Emoji mapping
                emoji_map = {
                    'NOTE': '📘',
                    'TIP': '💡',
                    'IMPORTANT': '📌',
                    'WARNING': '⚠️',
                    'CAUTION': '🚨'
                }
                
                blocks.append({
                    "type": "callout",
                    "callout": {
                        "rich_text": parse_inline_markdown(' '.join(alert_lines)),
                        "icon": {"emoji": emoji_map.get(alert_type, '📝')},
                        "color": "gray_background"
                    }
                })
            else:
                # Quote normale
                blocks.append({
                    "type": "quote",
                    "quote": {
                        "rich_text": parse_inline_markdown(quote_text)
                    }
                })
        
        # Listes non ordonnées
        elif re.match(r'^[-*+]\s+', line):
            text = re.sub(r'^[-*+]\s+', '', line)
            blocks.append({
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": parse_inline_markdown(text)
                }
            })
        
        # Listes ordonnées
        elif re.match(r'^\d+\.\s+', line):
            text = re.sub(r'^\d+\.\s+', '', line)
            blocks.append({
                "type": "numbered_list_item",
                "numbered_list_item": {
                    "rich_text": parse_inline_markdown(text)
                }
            })
        
        # Horizontal rule
        elif re.match(r'^---+$|^\*\*\*+$|^___+$', line.strip()):
            blocks.append({
                "type": "divider",
                "divider": {}
            })
        
        # Paragraphes non vides
        elif line.strip():
            blocks.append({
                "type": "paragraph",
                "paragraph": {
                    "rich_text": parse_inline_markdown(line)
                }
            })
        
        i += 1
    
    return blocks if blocks else [{
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{"type": "text", "text": {"content": markdown}}]
        }
    }]