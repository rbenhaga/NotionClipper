# backend/tests/test_content_detector.py
"""Tests pour la détection de contenu et le parsing"""

import pytest
from backend.utils.clipboard import ClipboardManager
from backend.parsers.martian_parser import markdown_to_blocks, parse_inline_formatting

class TestContentDetection:
    """Tests pour la détection du type de contenu"""
    
    def setup_method(self):
        """Initialisation avant chaque test"""
        self.clipboard = ClipboardManager()
    
    def test_detect_url_types(self):
        """Test la détection des différents types d'URLs"""
        test_cases = [
            ("https://www.youtube.com/watch?v=123", "video"),
            ("https://youtu.be/123", "video"),
            ("https://example.com/image.jpg", "image"),
            ("https://example.com/file.pdf", "file"),
            ("https://github.com/user/repo", "url"),
            ("https://example.com", "url"),
        ]
        
        for url, expected_type in test_cases:
            result = self.clipboard._detect_text_type(url)
            assert result == expected_type, f"URL {url} devrait être de type {expected_type}, mais est {result}"
    
    def test_detect_markdown(self):
        """Test la détection du Markdown"""
        markdown_texts = [
            "# Titre\nContenu",
            "## Sous-titre\n- Liste",
            "**Texte en gras**",
            "[Lien](https://example.com)",
            "```python\ncode\n```",
        ]
        
        for text in markdown_texts:
            result = self.clipboard._detect_text_type(text)
            assert result == "markdown", f"Le texte devrait être détecté comme Markdown"
    
    def test_detect_table(self):
        """Test la détection des tables"""
        table_text = "Col1\tCol2\tCol3\nVal1\tVal2\tVal3"
        result = self.clipboard._detect_text_type(table_text)
        assert result == "table"
    
    def test_detect_plain_text(self):
        """Test la détection du texte simple"""
        plain_texts = [
            "Simple texte sans formatage",
            "Ligne 1\nLigne 2\nLigne 3",
            "Juste du texte normal",
        ]
        
        for text in plain_texts:
            result = self.clipboard._detect_text_type(text)
            assert result == "text"


class TestMarkdownParser:
    """Tests pour le parser Markdown"""
    
    def test_parse_headers(self):
        """Test le parsing des headers"""
        markdown = "# Titre 1\n## Titre 2\n### Titre 3"
        blocks = markdown_to_blocks(markdown)
        
        assert len(blocks) == 3
        assert blocks[0]["type"] == "heading_1"
        assert blocks[1]["type"] == "heading_2"
        assert blocks[2]["type"] == "heading_3"
    
    def test_parse_lists(self):
        """Test le parsing des listes"""
        markdown = "- Item 1\n- Item 2\n\n1. First\n2. Second"
        blocks = markdown_to_blocks(markdown)
        
        assert len(blocks) == 4
        assert blocks[0]["type"] == "bulleted_list_item"
        assert blocks[2]["type"] == "numbered_list_item"
    
    def test_parse_code_block(self):
        """Test le parsing des blocs de code"""
        markdown = "```python\ndef hello():\n    print('Hello')\n```"
        blocks = markdown_to_blocks(markdown)
        
        assert len(blocks) == 1
        assert blocks[0]["type"] == "code"
        assert blocks[0]["code"]["language"] == "python"
    
    def test_parse_inline_formatting(self):
        """Test le parsing du formatage inline"""
        test_cases = [
            ("**gras**", True, False),
            ("*italique*", False, True),
            ("***gras et italique***", True, True),
            ("`code`", False, False),  # code a son propre flag
        ]
        
        for text, expected_bold, expected_italic in test_cases:
            rich_text = parse_inline_formatting(text)
            
            # Trouver le segment formaté (pas le texte vide)
            formatted_segment = None
            for segment in rich_text:
                if segment.get("text", {}).get("content", "").strip():
                    formatted_segment = segment
                    break
            
            assert formatted_segment is not None
            annotations = formatted_segment.get("annotations", {})
            
            if expected_bold:
                assert annotations.get("bold") == True
            if expected_italic:
                assert annotations.get("italic") == True
    
    def test_parse_links(self):
        """Test le parsing des liens"""
        markdown = "[Anthropic](https://anthropic.com)"
        rich_text = parse_inline_formatting(markdown)
        
        assert len(rich_text) >= 1
        link_segment = rich_text[0]
        assert link_segment["text"]["content"] == "Anthropic"
        assert link_segment["text"].get("link", {}).get("url") == "https://anthropic.com"
    
    def test_empty_markdown(self):
        """Test avec du Markdown vide"""
        blocks = markdown_to_blocks("")
        assert blocks == []
    
    def test_complex_markdown(self):
        """Test avec du Markdown complexe"""
        markdown = """# Titre Principal

Voici un paragraphe avec **du texte en gras** et *de l'italique*.

## Liste de courses
- Pommes
- Bananes
- **Oranges** (important!)

### Code exemple
```javascript
const greeting = "Hello World";
console.log(greeting);
```

> Une citation inspirante

---

[Lien vers le site](https://example.com)
"""
        blocks = markdown_to_blocks(markdown)
        
        # Vérifier qu'on a le bon nombre de blocs
        assert len(blocks) > 5
        
        # Vérifier quelques types spécifiques
        block_types = [block["type"] for block in blocks]
        assert "heading_1" in block_types
        assert "heading_2" in block_types
        assert "bulleted_list_item" in block_types
        assert "code" in block_types
        assert "quote" in block_types
        assert "divider" in block_types