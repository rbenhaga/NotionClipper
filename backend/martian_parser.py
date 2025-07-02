# backend/martian_parser.py
"""Parser Markdown vers blocs Notion - Version simplifiée mais fonctionnelle"""

import re
from typing import List, Dict, Any

def markdown_to_blocks(markdown_text: str) -> List[Dict[str, Any]]:
    """Convertit du Markdown en blocs Notion"""
    if not markdown_text:
        return []
    
    blocks = []
    lines = markdown_text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].rstrip()
        
        # Ligne vide - skip
        if not line:
            i += 1
            continue
        
        # Headers
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            text = line.lstrip('#').strip()
            
            if level <= 3:
                block_type = f"heading_{level}"
                blocks.append({
                    "type": block_type,
                    block_type: {
                        "rich_text": [{"type": "text", "text": {"content": text}}],
                        "color": "default"
                    }
                })
                i += 1
                continue
        
        # Listes à puces
        if line.startswith(('- ', '* ', '+ ')):
            text = line[2:].strip()
            blocks.append({
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [{"type": "text", "text": {"content": text}}],
                    "color": "default"
                }
            })
            i += 1
            continue
        
        # Listes numérotées
        if re.match(r'^\d+\.\s', line):
            text = re.sub(r'^\d+\.\s*', '', line)
            blocks.append({
                "type": "numbered_list_item",
                "numbered_list_item": {
                    "rich_text": [{"type": "text", "text": {"content": text}}],
                    "color": "default"
                }
            })
            i += 1
            continue
        
        # Blockquotes
        if line.startswith('> '):
            text = line[2:].strip()
            blocks.append({
                "type": "quote",
                "quote": {
                    "rich_text": [{"type": "text", "text": {"content": text}}],
                    "color": "default"
                }
            })
            i += 1
            continue
        
        # Code blocks
        if line.startswith('```'):
            language = line[3:].strip() or "plain text"
            code_lines = []
            i += 1
            
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            
            if code_lines or i < len(lines):
                code_content = '\n'.join(code_lines)
                blocks.append({
                    "type": "code",
                    "code": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": code_content[:2000]}  # Limite Notion
                        }],
                        "language": language
                    }
                })
            i += 1
            continue
        
        # Ligne horizontale
        if line.strip() in ['---', '***', '___'] and len(line.strip()) >= 3:
            blocks.append({"type": "divider", "divider": {}})
            i += 1
            continue
        
        # Tables simples (conversion en code block pour préserver le format)
        if '|' in line and i + 1 < len(lines) and '|' in lines[i + 1]:
            table_lines = []
            start_i = i
            
            while i < len(lines) and '|' in lines[i]:
                table_lines.append(lines[i])
                i += 1
            
            if len(table_lines) > 1:
                blocks.append({
                    "type": "code",
                    "code": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": '\n'.join(table_lines)}
                        }],
                        "language": "plain text"
                    }
                })
                continue
        
        # Paragraphe avec formatage inline
        rich_text = parse_inline_formatting(line)
        blocks.append({
            "type": "paragraph",
            "paragraph": {
                "rich_text": rich_text,
                "color": "default"
            }
        })
        i += 1
    
    return blocks


def parse_inline_formatting(text: str) -> List[Dict[str, Any]]:
    """Parse le formatage inline (gras, italique, code, liens)"""
    if not text:
        return [{"type": "text", "text": {"content": ""}}]
    
    rich_text = []
    
    # Patterns pour le formatage
    patterns = {
        'bold_italic': r'\*\*\*(.+?)\*\*\*',
        'bold': r'\*\*(.+?)\*\*',
        'italic': r'\*(.+?)\*',
        'code': r'`(.+?)`',
        'link': r'\[(.+?)\]\((.+?)\)'
    }
    
    # Pour simplifier, on va juste gérer le texte avec gras et italique basique
    # Remplacer les patterns par des marqueurs temporaires
    temp_text = text
    replacements = []
    
    # Gérer les liens d'abord
    for match in re.finditer(patterns['link'], temp_text):
        link_text = match.group(1)
        link_url = match.group(2)
        placeholder = f"__LINK_{len(replacements)}__"
        replacements.append({
            'type': 'link',
            'text': link_text,
            'url': link_url,
            'placeholder': placeholder
        })
        temp_text = temp_text.replace(match.group(0), placeholder, 1)
    
    # Gérer le code inline
    for match in re.finditer(patterns['code'], temp_text):
        code_text = match.group(1)
        placeholder = f"__CODE_{len(replacements)}__"
        replacements.append({
            'type': 'code',
            'text': code_text,
            'placeholder': placeholder
        })
        temp_text = temp_text.replace(match.group(0), placeholder, 1)
    
    # Pour l'instant, on retourne juste le texte simple
    # Une version complète nécessiterait un parsing plus complexe
    if replacements:
        # Version simplifiée : on ignore le formatage complexe
        return [{"type": "text", "text": {"content": text}}]
    
    # Gérer le gras simple
    if '**' in text:
        parts = text.split('**')
        for i, part in enumerate(parts):
            if part:
                is_bold = i % 2 == 1
                rich_text.append({
                    "type": "text",
                    "text": {"content": part},
                    "annotations": {
                        "bold": is_bold,
                        "italic": False,
                        "strikethrough": False,
                        "underline": False,
                        "code": False,
                        "color": "default"
                    }
                })
    else:
        rich_text.append({"type": "text", "text": {"content": text}})
    
    return rich_text or [{"type": "text", "text": {"content": text}}]