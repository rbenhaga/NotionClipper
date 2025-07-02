# backend/martian_parser.py
import re
import json
from typing import List, Dict, Any, Optional

def markdown_to_blocks(markdown: str, options: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Parser Markdown complet pour Notion avec support étendu"""
    if not markdown:
        return []
    
    blocks = []
    lines = markdown.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Headers H1-H3
        if match := re.match(r'^(#{1,3})\s+(.+)$', line):
            level = len(match.group(1))
            blocks.append({
                "type": f"heading_{level}",
                f"heading_{level}": {
                    "rich_text": parse_inline_markdown(match.group(2))
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
                    "rich_text": [{"type": "text", "text": {"content": '\n'.join(code_lines)}}],
                    "language": lang
                }
            })
        
        # Tables
        elif '|' in line and i + 1 < len(lines) and re.match(r'^[\s\-|]+$', lines[i + 1]):
            table_rows = []
            while i < len(lines) and '|' in lines[i]:
                cells = [cell.strip() for cell in lines[i].split('|')[1:-1]]
                if not re.match(r'^[\s\-|]+$', lines[i]):  # Skip separator
                    table_rows.append(cells)
                i += 1
            i -= 1
            
            if table_rows:
                blocks.append({
                    "type": "table",
                    "table": {
                        "table_width": len(table_rows[0]),
                        "has_column_header": True,
                        "has_row_header": False,
                        "children": [
                            {
                                "type": "table_row",
                                "table_row": {
                                    "cells": [[{"type": "text", "text": {"content": cell}}] for cell in row]
                                }
                            } for row in table_rows
                        ]
                    }
                })
        
        # Blockquotes
        elif line.strip().startswith('>'):
            blocks.append({
                "type": "quote",
                "quote": {
                    "rich_text": parse_inline_markdown(line.strip()[1:].strip())
                }
            })
        
        # Lists
        elif match := re.match(r'^(\s*)([-*+]|\d+\.)\s+(.+)$', line):
            list_type = "bulleted_list_item" if match.group(2) in ['-', '*', '+'] else "numbered_list_item"
            blocks.append({
                "type": list_type,
                list_type: {
                    "rich_text": parse_inline_markdown(match.group(3))
                }
            })
        
        # Images
        elif match := re.match(r'!\[([^\]]*)\]\(([^)]+)\)', line):
            blocks.append({
                "type": "image",
                "image": {
                    "type": "external",
                    "external": {"url": match.group(2)},
                    "caption": [{"type": "text", "text": {"content": match.group(1)}}] if match.group(1) else []
                }
            })
        
        # Paragraphs
        elif line.strip():
            blocks.append({
                "type": "paragraph",
                "paragraph": {
                    "rich_text": parse_inline_markdown(line)
                }
            })
        
        i += 1
    
    return blocks

def parse_inline_markdown(text: str) -> List[Dict[str, Any]]:
    """Parse les éléments inline du Markdown"""
    result = []
    
    # Pattern pour tous les éléments inline
    pattern = r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))'
    parts = re.split(pattern, text)
    
    for i, part in enumerate(parts):
        if not part:
            continue
            
        # Bold
        if part.startswith('**') and part.endswith('**'):
            result.append({
                "type": "text",
                "text": {"content": part[2:-2]},
                "annotations": {"bold": True}
            })
        # Italic
        elif part.startswith('*') and part.endswith('*'):
            result.append({
                "type": "text",
                "text": {"content": part[1:-1]},
                "annotations": {"italic": True}
            })
        # Code
        elif part.startswith('`') and part.endswith('`'):
            result.append({
                "type": "text",
                "text": {"content": part[1:-1]},
                "annotations": {"code": True}
            })
        # Links
        elif match := re.match(r'\[([^\]]+)\]\(([^)]+)\)', part):
            result.append({
                "type": "text",
                "text": {"content": match.group(1), "link": {"url": match.group(2)}}
            })
        # Plain text
        else:
            result.append({
                "type": "text",
                "text": {"content": part}
            })
    
    return result if result else [{"type": "text", "text": {"content": text}}]

# Fonction utilitaire pour tester
def test_parser():
    """Teste le parser avec un exemple simple"""
    test_md = """# Test Martian

Voici du **gras** et de l'*italique*.

- Liste item 1
- Liste item 2

```python
def hello():
    print("Hello Martian!")
```

> [!NOTE]
> Ceci est une note importante.
"""
    
    try:
        print("Test du parser Martian...")
        blocks = markdown_to_blocks(test_md, {
            'enableEmojiCallouts': True
        })
        print(f"✅ Succès ! {len(blocks)} blocs générés")
        print(json.dumps(blocks[0], indent=2, ensure_ascii=False))
        return True
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False

if __name__ == "__main__":
    # Auto-test lors de l'import
    test_parser()