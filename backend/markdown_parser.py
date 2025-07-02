import re
from typing import List, Dict, Any

class MartianParser:
    """Parser Markdown vers blocs Notion inspiré de Martian"""
    
    def parse(self, markdown_text: str) -> List[Dict[str, Any]]:
        """Parse le markdown en blocs Notion"""
        blocks = []
        lines = markdown_text.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].rstrip()
            
            # Headers
            if line.startswith('#'):
                level = len(line.split()[0])
                text = line[level:].strip()
                block_type = f"heading_{min(level, 3)}"
                blocks.append({
                    "object": "block",
                    "type": block_type,
                    block_type: {
                        "rich_text": self._parse_inline_formatting([{
                            "type": "text",
                            "text": {"content": text}
                        }])
                    }
                })
            
            # Code blocks
            elif line.startswith('```'):
                language = line[3:].strip() or "plain text"
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    code_lines.append(lines[i])
                    i += 1
                
                blocks.append({
                    "object": "block",
                    "type": "code",
                    "code": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": '\n'.join(code_lines)}
                        }],
                        "language": self._normalize_language(language)
                    }
                })
            
            # Lists
            elif line.startswith('* ') or line.startswith('- '):
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": self._parse_inline_formatting([{
                            "type": "text",
                            "text": {"content": line[2:]}
                        }])
                    }
                })
            
            elif re.match(r'^\d+\.\s', line):
                text = re.sub(r'^\d+\.\s', '', line)
                blocks.append({
                    "object": "block",
                    "type": "numbered_list_item",
                    "numbered_list_item": {
                        "rich_text": self._parse_inline_formatting([{
                            "type": "text",
                            "text": {"content": text}
                        }])
                    }
                })
            
            # Checkboxes
            elif line.startswith('- [ ]') or line.startswith('- [x]'):
                checked = line.startswith('- [x]')
                text = line[5:].strip()
                blocks.append({
                    "object": "block",
                    "type": "to_do",
                    "to_do": {
                        "rich_text": self._parse_inline_formatting([{
                            "type": "text",
                            "text": {"content": text}
                        }]),
                        "checked": checked
                    }
                })
            
            # Quote
            elif line.startswith('>'):
                blocks.append({
                    "object": "block",
                    "type": "quote",
                    "quote": {
                        "rich_text": self._parse_inline_formatting([{
                            "type": "text",
                            "text": {"content": line[1:].strip()}
                        }])
                    }
                })
            
            # Horizontal rule
            elif line in ['---', '***', '___']:
                blocks.append({
                    "object": "block",
                    "type": "divider",
                    "divider": {}
                })
            
            # Images
            elif re.match(r'!\[.*?\]\(.*?\)', line):
                match = re.match(r'!\[(.*?)\]\((.*?)\)', line)
                if match:
                    alt_text, url = match.groups()
                    blocks.append({
                        "object": "block",
                        "type": "image",
                        "image": {
                            "type": "external",
                            "external": {"url": url},
                            "caption": [{
                                "type": "text",
                                "text": {"content": alt_text}
                            }] if alt_text else []
                        }
                    })
            
            # Normal paragraph
            elif line:
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": self._parse_inline_formatting([{
                            "type": "text",
                            "text": {"content": line}
                        }])
                    }
                })
            
            i += 1
        
        return blocks
    
    def _parse_inline_formatting(self, rich_text: List[Dict]) -> List[Dict]:
        """Parse le formatage inline (gras, italique, code, liens)"""
        result = []
        
        for item in rich_text:
            text = item["text"]["content"]
            
            # Pattern pour détecter les différents formatages
            patterns = [
                (r'\*\*(.*?)\*\*', 'bold'),
                (r'\*(.*?)\*', 'italic'),
                (r'`(.*?)`', 'code'),
                (r'\[(.*?)\]\((.*?)\)', 'link')
            ]
            
            segments = []
            last_end = 0
            
            for pattern, format_type in patterns:
                for match in re.finditer(pattern, text):
                    # Ajouter le texte avant le match
                    if match.start() > last_end:
                        segments.append({
                            "type": "text",
                            "text": {"content": text[last_end:match.start()]}
                        })
                    
                    # Ajouter le texte formaté
                    if format_type == 'link':
                        segments.append({
                            "type": "text",
                            "text": {
                                "content": match.group(1),
                                "link": {"url": match.group(2)}
                            }
                        })
                    else:
                        annotations = {
                            "bold": format_type == 'bold',
                            "italic": format_type == 'italic',
                            "code": format_type == 'code'
                        }
                        segments.append({
                            "type": "text",
                            "text": {"content": match.group(1)},
                            "annotations": annotations
                        })
                    
                    last_end = match.end()
            
            # Ajouter le reste du texte
            if last_end < len(text):
                segments.append({
                    "type": "text",
                    "text": {"content": text[last_end:]}
                })
            
            result.extend(segments if segments else [item])
        
        return result
    
    def _normalize_language(self, language: str) -> str:
        """Normalise les noms de langages pour Notion"""
        language_map = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'rb': 'ruby',
            'yml': 'yaml',
            'sh': 'shell',
            'bash': 'shell',
            'zsh': 'shell'
        }
        return language_map.get(language.lower(), language.lower()) 