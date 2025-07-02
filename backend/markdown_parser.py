import re
from typing import List, Dict, Any, Optional

# Stub pour markdown_to_blocks (à remplacer par la vraie implémentation si besoin)
def markdown_to_blocks(content: str, options: Optional[dict] = None) -> List[Dict[str, Any]]:
    if options is None:
        options = {}
    # Ici, on pourrait utiliser MartianParser ou une autre logique
    # Pour l'instant, retourne un bloc paragraphe simple
    return [{
        "object": "block",
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