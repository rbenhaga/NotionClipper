# backend/markdown_parser.py
"""Validateur de blocs pour l'API Notion"""

from typing import List, Dict, Any, Optional

# Types de blocs supportés par Notion
VALID_BLOCK_TYPES = {
    'paragraph', 'heading_1', 'heading_2', 'heading_3',
    'bulleted_list_item', 'numbered_list_item', 'to_do',
    'toggle', 'code', 'quote', 'callout', 'divider',
    'image', 'video', 'file', 'pdf', 'bookmark',
    'table', 'table_row', 'column_list', 'column',
    'link_preview', 'synced_block', 'template',
    'link_to_page', 'embed', 'audio'
}

# Limite de caractères pour le texte
MAX_TEXT_LENGTH = 2000
MAX_BLOCKS = 100

def validate_notion_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Valide et nettoie les blocs pour s'assurer qu'ils sont conformes à l'API Notion
    """
    if not blocks:
        return []
    
    validated_blocks = []
    
    for block in blocks[:MAX_BLOCKS]:  # Limite à 100 blocs
        if not isinstance(block, dict):
            continue
        
        validated_block = validate_single_block(block)
        if validated_block:
            validated_blocks.append(validated_block)
    
    return validated_blocks


def validate_single_block(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Valide un seul bloc"""
    if 'type' not in block:
        return None
    
    block_type = block['type']
    
    # Vérifier que le type est valide
    if block_type not in VALID_BLOCK_TYPES:
        # Convertir en paragraphe si type invalide
        return create_paragraph_from_invalid_block(block)
    
    # Valider selon le type
    if block_type in ['paragraph', 'heading_1', 'heading_2', 'heading_3',
                      'bulleted_list_item', 'numbered_list_item', 'quote']:
        return validate_text_block(block, block_type)
    
    elif block_type == 'code':
        return validate_code_block(block)
    
    elif block_type == 'to_do':
        return validate_todo_block(block)
    
    elif block_type == 'toggle':
        return validate_toggle_block(block)
    
    elif block_type == 'callout':
        return validate_callout_block(block)
    
    elif block_type == 'divider':
        return {"type": "divider", "divider": {}}
    
    elif block_type == 'image':
        return validate_image_block(block)
    
    elif block_type == 'video':
        return validate_video_block(block)
    
    elif block_type == 'bookmark':
        return validate_bookmark_block(block)
    
    elif block_type == 'table':
        return validate_table_block(block)
    
    # Pour les autres types, retourner tel quel s'il a la bonne structure
    return block if block_type in block else None


def validate_text_block(block: Dict[str, Any], block_type: str) -> Dict[str, Any]:
    """Valide un bloc de texte"""
    content = block.get(block_type, {})
    if not isinstance(content, dict):
        # Retourner un bloc paragraphe par défaut si le contenu est invalide
        return {
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": str(content)[:MAX_TEXT_LENGTH]}
                }],
                "color": "default"
            }
        }
    # S'assurer qu'il y a rich_text
    if 'rich_text' not in content:
        content['rich_text'] = []
    # Valider rich_text
    validated_rich_text = validate_rich_text(content['rich_text'])
    return {
        "type": block_type,
        block_type: {
            "rich_text": validated_rich_text,
            "color": content.get("color", "default")
        }
    }


def validate_code_block(block: Dict[str, Any]) -> Dict[str, Any]:
    """Valide un bloc de code"""
    code_content = block.get('code', {})
    if not isinstance(code_content, dict):
        # Retourner un bloc code par défaut si le contenu est invalide
        return {
            "type": "code",
            "code": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": str(code_content)[:MAX_TEXT_LENGTH]}
                }],
                "language": "plain text"
            }
        }
    rich_text = validate_rich_text(code_content.get('rich_text', []))
    language = code_content.get('language', 'plain text')
    # S'assurer que le langage est valide
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
            "rich_text": rich_text,
            "language": language
        }
    }


def validate_rich_text(rich_text: Any) -> List[Dict[str, Any]]:
    """Valide et nettoie un tableau rich_text"""
    if not isinstance(rich_text, list):
        return [{"type": "text", "text": {"content": str(rich_text)[:MAX_TEXT_LENGTH]}}]
    
    validated = []
    total_length = 0
    
    for item in rich_text:
        if not isinstance(item, dict):
            continue
        
        if item.get('type') == 'text':
            text_content = item.get('text', {})
            if isinstance(text_content, dict):
                content = str(text_content.get('content', ''))
                
                # Limiter la longueur totale
                remaining = MAX_TEXT_LENGTH - total_length
                if remaining <= 0:
                    break
                
                if len(content) > remaining:
                    content = content[:remaining]
                
                total_length += len(content)
                
                validated_item = {
                    "type": "text",
                    "text": {
                        "content": content
                    }
                }
                
                # Ajouter les annotations si présentes
                if 'annotations' in item:
                    validated_item['annotations'] = validate_annotations(item['annotations'])
                
                validated.append(validated_item)
    
    # S'assurer qu'il y a au moins un élément
    if not validated:
        validated = [{"type": "text", "text": {"content": ""}}]
    
    return validated


def validate_annotations(annotations: Any) -> Dict[str, Any]:
    """Valide les annotations de texte"""
    if not isinstance(annotations, dict):
        return get_default_annotations()
    
    valid_colors = [
        "default", "gray", "brown", "orange", "yellow", "green",
        "blue", "purple", "pink", "red", "gray_background",
        "brown_background", "orange_background", "yellow_background",
        "green_background", "blue_background", "purple_background",
        "pink_background", "red_background"
    ]
    
    return {
        "bold": bool(annotations.get("bold", False)),
        "italic": bool(annotations.get("italic", False)),
        "strikethrough": bool(annotations.get("strikethrough", False)),
        "underline": bool(annotations.get("underline", False)),
        "code": bool(annotations.get("code", False)),
        "color": annotations.get("color", "default") if annotations.get("color") in valid_colors else "default"
    }


def get_default_annotations() -> Dict[str, Any]:
    """Retourne les annotations par défaut"""
    return {
        "bold": False,
        "italic": False,
        "strikethrough": False,
        "underline": False,
        "code": False,
        "color": "default"
    }


def validate_image_block(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Valide un bloc image"""
    image_data = block.get('image', {})
    
    if not isinstance(image_data, dict):
        return None
    
    # Vérifier le type d'image
    if image_data.get('type') == 'external':
        external = image_data.get('external', {})
        if isinstance(external, dict) and 'url' in external:
            return {
                "type": "image",
                "image": {
                    "type": "external",
                    "external": {
                        "url": str(external['url'])[:2000]
                    }
                }
            }
    
    return None


def validate_video_block(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Valide un bloc vidéo"""
    video_data = block.get('video', {})
    
    if not isinstance(video_data, dict):
        return None
    
    if video_data.get('type') == 'external':
        external = video_data.get('external', {})
        if isinstance(external, dict) and 'url' in external:
            return {
                "type": "video",
                "video": {
                    "type": "external",
                    "external": {
                        "url": str(external['url'])[:2000]
                    }
                }
            }
    
    return None


def validate_bookmark_block(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Valide un bloc bookmark"""
    bookmark_data = block.get('bookmark', {})
    
    if isinstance(bookmark_data, dict) and 'url' in bookmark_data:
        return {
            "type": "bookmark",
            "bookmark": {
                "url": str(bookmark_data['url'])[:2000]
            }
        }
    
    return None


def validate_table_block(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Valide un bloc table"""
    table_data = block.get('table', {})
    
    if not isinstance(table_data, dict):
        return None
    
    # Valider les propriétés de base
    table_width = table_data.get('table_width', 1)
    if not isinstance(table_width, int) or table_width < 1:
        table_width = 1
    
    # Pour l'instant, retourner la structure de base
    # La validation complète des enfants est complexe
    return {
        "type": "table",
        "table": {
            "table_width": min(table_width, 10),  # Max 10 colonnes
            "has_column_header": bool(table_data.get('has_column_header', False)),
            "has_row_header": bool(table_data.get('has_row_header', False))
        }
    }


def create_paragraph_from_invalid_block(block: Dict[str, Any]) -> Dict[str, Any]:
    """Crée un paragraphe à partir d'un bloc invalide"""
    # Essayer d'extraire du texte du bloc
    text = str(block.get('content', block.get('text', 'Bloc invalide')))[:MAX_TEXT_LENGTH]
    
    return {
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{
                "type": "text",
                "text": {"content": text}
            }],
            "color": "default"
        }
    }


def validate_todo_block(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Valide un bloc to_do"""
    todo_data = block.get('to_do', {})
    
    if not isinstance(todo_data, dict):
        return None
    
    return {
        "type": "to_do",
        "to_do": {
            "rich_text": validate_rich_text(todo_data.get('rich_text', [])),
            "checked": bool(todo_data.get('checked', False)),
            "color": todo_data.get('color', 'default')
        }
    }


def validate_toggle_block(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Valide un bloc toggle"""
    toggle_data = block.get('toggle', {})
    
    if not isinstance(toggle_data, dict):
        return None
    
    return {
        "type": "toggle",
        "toggle": {
            "rich_text": validate_rich_text(toggle_data.get('rich_text', [])),
            "color": toggle_data.get('color', 'default')
        }
    }


def validate_callout_block(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Valide un bloc callout"""
    callout_data = block.get('callout', {})
    
    if not isinstance(callout_data, dict):
        return None
    
    # Valider l'icône
    icon = callout_data.get('icon', {"emoji": "💡"})
    if not isinstance(icon, dict):
        icon = {"emoji": "💡"}
    
    return {
        "type": "callout",
        "callout": {
            "rich_text": validate_rich_text(callout_data.get('rich_text', [])),
            "icon": icon,
            "color": callout_data.get('color', 'default')
        }
    }