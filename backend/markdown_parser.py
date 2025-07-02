import re
from typing import List, Dict, Any, Optional

def markdown_to_blocks(content: str, options: Optional[dict] = None) -> List[Dict[str, Any]]:
    """Parser Markdown Python pur pour Notion"""
    if not content:
        return []
    
    blocks = []
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Headers
        if match := re.match(r'^(#{1,3})\s+(.+)$', line):
            level = min(len(match.group(1)), 3)
            blocks.append({
                "type": f"heading_{level}",
                f"heading_{level}": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": match.group(2).strip()}
                    }]
                }
            })
        
        # Listes
        elif re.match(r'^[-*+]\s+', line):
            text = re.sub(r'^[-*+]\s+', '', line)
            blocks.append({
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": text}
                    }]
                }
            })
        
        # Code blocks
        elif line.strip().startswith('```'):
            lang = line.strip()[3:] or "plain text"
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
        
        # Paragraphes non vides
        elif line.strip():
            blocks.append({
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": line}
                    }]
                }
            })
        
        i += 1
    
    return blocks if blocks else [{
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{
                "type": "text",
                "text": {"content": content}
            }]
        }
    }]

def validate_and_fix_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Valide et corrige les blocs pour s'assurer qu'ils respectent les limites de Notion.
    Limites Notion:
    - Max 2000 caractères par rich_text
    - Max 100 blocs enfants par bloc
    - Max 1000 blocs par page
    """
    validated_blocks = []
    for block in blocks[:1000]:  # Limite max de 1000 blocs
        block_type = block.get('type')
        if block_type in ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'quote', 'callout']:
            content_key = block_type
            if content_key in block and 'rich_text' in block[content_key]:
                rich_text = block[content_key]['rich_text']
                new_rich_text = []
                current_length = 0
                for segment in rich_text:
                    if 'text' in segment and 'content' in segment['text']:
                        content = segment['text']['content']
                        if current_length + len(content) > 2000:
                            remaining = 2000 - current_length
                            if remaining > 0:
                                new_segment = segment.copy()
                                new_segment['text']['content'] = content[:remaining]
                                new_rich_text.append(new_segment)
                            overflow_segment = segment.copy()
                            overflow_segment['text']['content'] = content[remaining:]
                            overflow_block = {
                                "object": "block",
                                "type": "paragraph",
                                "paragraph": {
                                    "rich_text": [overflow_segment]
                                }
                            }
                            validated_blocks.append(overflow_block)
                            current_length = len(content[remaining:])
                        else:
                            new_rich_text.append(segment)
                            current_length += len(content)
                    else:
                        new_rich_text.append(segment)
                block[content_key]['rich_text'] = new_rich_text
        validated_blocks.append(block)
    return validated_blocks


def detect_markdown(text: str) -> bool:
    """Détecte si le texte contient du Markdown"""
    if not text:
        return False
    markdown_patterns = [
        r'^#{1,6}\s+',           # Headers
        r'\*\*[^*]+\*\*',        # Bold
        r'\*[^*]+\*',            # Italic
        r'`[^`]+`',              # Inline code
        r'```[\s\S]*?```',       # Code blocks
        r'^\s*[-*+]\s+',         # Lists
        r'^\s*\d+\.\s+',         # Numbered lists
        r'^\s*>\s+',             # Quotes
        r'\[([^\]]+)\]\([^)]+\)', # Links
        r'!\[([^\]]*)\]\([^)]+\)', # Images
        r'^\s*\|.*\|.*\|',       # Tables
        r'^---+$',               # Horizontal rules
        r'~~[^~]+~~',            # Strikethrough
    ]
    pattern_count = 0
    for pattern in markdown_patterns:
        if re.search(pattern, text, re.MULTILINE):
            pattern_count += 1
            if pattern_count >= 2:
                return True
    return pattern_count >= 1


def determine_content_type(text: str, image_data: Any) -> str:
    """Détermine le type de contenu dans le presse-papiers"""
    if image_data:
        return "image"
    lines = text.strip().split('\n')
    if len(lines) > 1:
        tab_counts = [line.count('\t') for line in lines if line.strip()]
        if tab_counts and all(count == tab_counts[0] and count > 0 for count in tab_counts):
            return "table"
    return "text"


def validate_notion_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Valide et corrige les blocs pour respecter les limites Notion"""
    validated = []
    
    for block in blocks[:1000]:  # Max 1000 blocs
        # Assurer la structure correcte
        if 'type' not in block:
            continue
            
        block_type = block['type']
        
        # Valider rich_text
        if block_type in ['paragraph', 'heading_1', 'heading_2', 'heading_3', 
                         'quote', 'bulleted_list_item', 'numbered_list_item']:
            content_key = block_type
            if content_key in block and 'rich_text' in block[content_key]:
                # Limiter à 2000 caractères par segment
                rich_text = block[content_key]['rich_text']
                new_rich_text = []
                
                for segment in rich_text:
                    if 'text' in segment and len(segment['text'].get('content', '')) > 2000:
                        # Découper en segments de 2000 caractères
                        content = segment['text']['content']
                        for i in range(0, len(content), 2000):
                            new_segment = segment.copy()
                            new_segment['text']['content'] = content[i:i+2000]
                            new_rich_text.append(new_segment)
                    else:
                        new_rich_text.append(segment)
                
                block[content_key]['rich_text'] = new_rich_text
        
        # Ajouter les annotations par défaut si manquantes
        if block_type in ['paragraph', 'heading_1', 'heading_2', 'heading_3']:
            for item in block.get(block_type, {}).get('rich_text', []):
                if 'annotations' not in item:
                    item['annotations'] = {
                        "bold": False,
                        "italic": False, 
                        "strikethrough": False,
                        "underline": False,
                        "code": False,
                        "color": "default"
                    }
        
        validated.append(block)
    
    return validated