"""Tests complets pour le backend Notion Clipper Pro."""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import tempfile
import base64
from PIL import Image
import io

# Import des modules à tester
from backend.config import SecureConfig
from backend.utils import ClipboardManager
from backend.martian_parser import (
    markdown_to_blocks, 
    parse_inline_formatting,
    validate_notion_blocks,
    validate_language
)
from backend.cache import NotionCache


class TestSecureConfig:
    """Tests pour la configuration sécurisée"""
    
    @pytest.fixture
    def temp_config_dir(self):
        """Crée un dossier temporaire pour les tests"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    @pytest.fixture
    def secure_config(self, temp_config_dir, monkeypatch):
        """Instance de SecureConfig avec dossier temporaire"""
        monkeypatch.setattr('backend.config.SecureConfig._get_app_directory', 
                          lambda self: temp_config_dir)
        return SecureConfig()
    
    def test_save_and_load_config(self, secure_config):
        """Test sauvegarde et chargement de configuration"""
        test_config = {
            'notionToken': 'test_token_123',
            'imgbbKey': 'test_imgbb_key',
            'theme': 'dark'
        }
        
        # Sauvegarder
        secure_config.save_config(test_config)
        
        # Charger
        loaded = secure_config.load_config()
        
        assert loaded['notionToken'] == 'test_token_123'
        assert loaded['imgbbKey'] == 'test_imgbb_key'
        assert loaded['theme'] == 'dark'
    
    def test_sensitive_data_encryption(self, secure_config):
        """Test que les données sensibles sont chiffrées"""
        config = {
            'notionToken': 'secret_token',
            'publicData': 'not_secret'
        }
        
        secure_config.save_config(config)
        
        # Vérifier que le token n'apparaît pas en clair dans config.json
        config_file = secure_config.config_file
        with open(config_file, 'r') as f:
            content = f.read()
            assert 'secret_token' not in content
            assert 'not_secret' in content
        
        # Vérifier que le fichier chiffré existe
        assert secure_config.encrypted_file.exists()
    
    def test_preferences_management(self, secure_config):
        """Test gestion des préférences utilisateur"""
        prefs = {
            'theme': 'dark',
            'language': 'fr',
            'shortcuts': {'clip': 'Ctrl+Alt+V'}
        }
        
        secure_config.save_preferences(prefs)
        loaded_prefs = secure_config.load_preferences()
        
        assert loaded_prefs['theme'] == 'dark'
        assert loaded_prefs['language'] == 'fr'
        assert loaded_prefs['shortcuts']['clip'] == 'Ctrl+Alt+V'


class TestClipboardManager:
    """Tests pour le gestionnaire de presse-papiers"""
    
    @pytest.fixture
    def clipboard_manager(self):
        return ClipboardManager()
    
    def test_detect_youtube_url(self, clipboard_manager):
        """Test détection URL YouTube"""
        urls = [
            "https://youtube.com/watch?v=abc123",
            "https://www.youtube.com/watch?v=xyz789",
            "https://youtu.be/short123"
        ]
        
        for url in urls:
            result = clipboard_manager._detect_text_type(url)
            assert result == "video"
    
    def test_detect_image_url(self, clipboard_manager):
        """Test détection URL d'image"""
        image_urls = [
            "https://example.com/image.jpg",
            "https://example.com/photo.png",
            "https://example.com/graphic.gif"
        ]
        
        for url in image_urls:
            result = clipboard_manager._detect_text_type(url)
            assert result == "image"
    
    def test_detect_markdown_content(self, clipboard_manager):
        """Test détection contenu Markdown"""
        markdown_samples = [
            "# Titre principal\n## Sous-titre",
            "**Texte en gras** et *italique*",
            "- Liste à puces\n- Autre élément",
            "[Lien](https://example.com)"
        ]
        
        for content in markdown_samples:
            result = clipboard_manager._detect_text_type(content)
            assert result == "markdown"
    
    def test_detect_table_content(self, clipboard_manager):
        """Test détection tableau"""
        table_content = "Colonne1\tColonne2\tColonne3\nValeur1\tValeur2\tValeur3"
        result = clipboard_manager._detect_text_type(table_content)
        assert result == "table"
    
    def test_detect_json_content(self, clipboard_manager):
        """Test détection JSON"""
        json_samples = [
            '{"key": "value"}',
            '[\n  {"id": 1},\n  {"id": 2}\n]'
        ]
        
        for content in json_samples:
            result = clipboard_manager._detect_text_type(content)
            assert result == "text"  # JSON est traité comme texte
    
    @patch('backend.utils.Image')
    def test_image_compression(self, mock_image_module, clipboard_manager):
        """Test compression d'image > 10MB"""
        # Créer une fausse image
        mock_img = Mock()
        mock_img.size = (4000, 3000)
        mock_img.format = 'JPEG'
        
        # Mock du buffer
        mock_buffer = Mock()
        mock_buffer.tell.return_value = 15 * 1024 * 1024  # 15MB
        
        # Configuration des mocks
        mock_image_module.open.return_value = mock_img
        
        # Test de la compression
        with patch('io.BytesIO', return_value=mock_buffer):
            result = clipboard_manager._compress_image_if_needed(mock_img)
            
            # Vérifier que save a été appelé avec une qualité réduite
            assert mock_img.save.called
    
    def test_content_truncation(self, clipboard_manager):
        """Test troncature du contenu trop long"""
        long_content = "a" * (clipboard_manager.MAX_CLIPBOARD_LENGTH + 1000)
        
        # Simuler get_content avec du texte long
        with patch.object(clipboard_manager, '_get_text', return_value=long_content):
            result = clipboard_manager.get_content()
            
            assert result['truncated'] is True
            assert len(result['content']) <= clipboard_manager.MAX_CLIPBOARD_LENGTH


class TestMarkdownParser:
    """Tests pour le parser Markdown"""
    
    def test_parse_headers(self):
        """Test parsing des titres"""
        markdown = "# Titre 1\n## Titre 2\n### Titre 3\n#### Titre 4"
        blocks = markdown_to_blocks(markdown)
        
        assert len(blocks) == 4
        assert blocks[0]['type'] == 'heading_1'
        assert blocks[1]['type'] == 'heading_2'
        assert blocks[2]['type'] == 'heading_3'
        assert blocks[3]['type'] == 'paragraph'  # h4 converti en paragraphe
    
    def test_parse_lists(self):
        """Test parsing des listes"""
        markdown = """- Item 1
- Item 2
  - Sous-item
1. Numéro 1
2. Numéro 2"""
        
        blocks = markdown_to_blocks(markdown)
        
        assert blocks[0]['type'] == 'bulleted_list_item'
        assert blocks[1]['type'] == 'bulleted_list_item'
        assert blocks[2]['type'] == 'bulleted_list_item'
        assert blocks[3]['type'] == 'numbered_list_item'
        assert blocks[4]['type'] == 'numbered_list_item'
    
    def test_parse_code_blocks(self):
        """Test parsing des blocs de code"""
        markdown = """```python
def hello():
    print("Hello World")
```

```javascript
console.log("Hello");
```"""
        
        blocks = markdown_to_blocks(markdown)
        
        assert len(blocks) == 2
        assert blocks[0]['type'] == 'code'
        assert blocks[0]['code']['language'] == 'python'
        assert blocks[1]['code']['language'] == 'javascript'
    
    def test_parse_quotes(self):
        """Test parsing des citations"""
        markdown = "> Ceci est une citation\n> Sur plusieurs lignes"
        blocks = markdown_to_blocks(markdown)
        
        assert len(blocks) == 2
        assert all(b['type'] == 'quote' for b in blocks)
    
    def test_parse_checkboxes(self):
        """Test parsing des cases à cocher"""
        markdown = """- [ ] Tâche non complétée
- [x] Tâche complétée
- [X] Autre tâche complétée"""
        
        blocks = markdown_to_blocks(markdown)
        
        assert len(blocks) == 3
        assert all(b['type'] == 'to_do' for b in blocks)
        assert blocks[0]['to_do']['checked'] is False
        assert blocks[1]['to_do']['checked'] is True
        assert blocks[2]['to_do']['checked'] is True
    
    def test_inline_formatting(self):
        """Test formatage inline"""
        test_cases = [
            ("**gras**", [{"type": "text", "text": {"content": "gras"}, 
                          "annotations": {"bold": True}}]),
            ("*italique*", [{"type": "text", "text": {"content": "italique"}, 
                           "annotations": {"italic": True}}]),
            ("***gras et italique***", [{"type": "text", "text": {"content": "gras et italique"}, 
                                        "annotations": {"bold": True, "italic": True}}]),
            ("`code`", [{"type": "text", "text": {"content": "code"}, 
                        "annotations": {"code": True}}]),
            ("~~barré~~", [{"type": "text", "text": {"content": "barré"}, 
                          "annotations": {"strikethrough": True}}])
        ]
        
        for markdown, expected in test_cases:
            result = parse_inline_formatting(markdown)
            assert result == expected
    
    def test_parse_links(self):
        """Test parsing des liens"""
        markdown = "[Google](https://google.com) et [GitHub](https://github.com)"
        result = parse_inline_formatting(markdown)
        
        assert len(result) == 3  # Lien1, " et ", Lien2
        assert result[0]['text']['content'] == "Google"
        assert result[0]['text']['link']['url'] == "https://google.com"
        assert result[2]['text']['content'] == "GitHub"
        assert result[2]['text']['link']['url'] == "https://github.com"
    
    def test_parse_images(self):
        """Test parsing des images"""
        markdown = "![Alt text](https://example.com/image.jpg)"
        result = parse_inline_formatting(markdown)
        
        assert len(result) == 1
        assert "[Image: Alt text]" in result[0]['text']['content']
        assert result[0]['text']['link']['url'] == "https://example.com/image.jpg"
    
    def test_validate_language(self):
        """Test validation des langages de code"""
        test_cases = [
            ("js", "javascript"),
            ("py", "python"),
            ("c++", "cpp"),
            ("unknown_lang", "plain text"),
            ("", "plain text")
        ]
        
        for input_lang, expected in test_cases:
            assert validate_language(input_lang) == expected
    
    def test_validate_notion_blocks(self):
        """Test validation des blocs Notion"""
        blocks = [
            {"type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": "Test"}}]}},
            {"type": "invalid_type", "content": "test"},  # Type invalide
            {"type": "heading_1", "heading_1": {"rich_text": "invalid"}},  # rich_text invalide
        ]
        
        validated = validate_notion_blocks(blocks)
        
        assert len(validated) == 3
        assert validated[0]['type'] == 'paragraph'
        assert validated[1]['type'] == 'paragraph'  # Converti
        assert isinstance(validated[2]['heading_1']['rich_text'], list)  # Corrigé
    
    def test_block_length_limit(self):
        """Test limite de longueur des blocs"""
        # Créer un texte très long
        long_text = "a" * 3000
        blocks = [
            {"type": "paragraph", "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": long_text}}]
            }}
        ]
        
        validated = validate_notion_blocks(blocks)
        
        # Vérifier que le texte a été tronqué
        content = validated[0]['paragraph']['rich_text'][0]['text']['content']
        assert len(content) <= 2000
    
    def test_max_blocks_limit(self):
        """Test limite du nombre de blocs"""
        # Créer 150 blocs
        blocks = [
            {"type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": f"Block {i}"}}]}}
            for i in range(150)
        ]
        
        validated = validate_notion_blocks(blocks)
        
        # Vérifier qu'on a au maximum 100 blocs
        assert len(validated) == 100


class TestNotionCache:
    """Tests pour le système de cache"""
    
    @pytest.fixture
    def temp_cache_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    @pytest.fixture
    def cache(self, temp_cache_dir):
        return NotionCache(temp_cache_dir)
    
    def test_cache_add_and_get(self, cache):
        """Test ajout et récupération du cache"""
        page_data = {
            'id': 'page123',
            'title': 'Test Page',
            'icon': '📄'
        }
        
        cache.add_page('page123', page_data)
        retrieved = cache.get_page('page123')
        
        assert retrieved == page_data
    
    def test_cache_expiration(self, cache):
        """Test expiration du cache"""
        # Ajouter une page avec un timestamp ancien
        page_data = {'id': 'old_page', 'title': 'Old'}
        cache.add_page('old_page', page_data)
        
        # Modifier manuellement le timestamp
        cache.last_modified['old_page'] = 0  # Très ancien
        
        # Vérifier que is_expired retourne True
        assert cache.is_expired('old_page') is True
    
    def test_cache_persistence(self, cache, temp_cache_dir):
        """Test persistance du cache"""
        # Ajouter des données
        cache.add_page('page1', {'title': 'Page 1'})
        cache.add_page('page2', {'title': 'Page 2'})
        
        # Sauvegarder
        cache.save_to_disk()
        
        # Créer une nouvelle instance et charger
        new_cache = NotionCache(temp_cache_dir)
        
        page1 = new_cache.get_page('page1')
        page2 = new_cache.get_page('page2')
        assert page1 is not None and page1['title'] == 'Page 1'
        assert page2 is not None and page2['title'] == 'Page 2'
    
    def test_cache_lru_eviction(self, cache):
        """Test éviction LRU quand le cache est plein"""
        # Définir une petite taille max pour le test
        cache.max_size = 3
        
        # Ajouter 4 pages
        for i in range(4):
            cache.add_page(f'page{i}', {'title': f'Page {i}'})
        
        # La première page devrait avoir été évincée
        assert cache.get_page('page0') is None
        assert cache.get_page('page3') is not None


class TestAPIIntegration:
    """Tests d'intégration pour les routes API"""
    
    @pytest.fixture
    def app(self):
        """Créer une app Flask de test"""
        from notion_backend import app
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Client de test Flask"""
        return app.test_client()
    
    def test_health_endpoint(self, client):
        """Test endpoint de santé"""
        response = client.get('/api/health')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'status' in data
        assert data['status'] == 'healthy'
    
    def test_config_endpoint_get(self, client):
        """Test récupération de configuration"""
        response = client.get('/api/config')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'success' in data
    
    @patch('backend.clipboard_manager.get_content')
    def test_clipboard_endpoint(self, mock_get_content, client):
        """Test endpoint clipboard"""
        mock_get_content.return_value = {
            'type': 'text',
            'content': 'Test content',
            'truncated': False
        }
        
        response = client.get('/api/clipboard')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['type'] == 'text'
        assert data['content'] == 'Test content'
    
    def test_clear_cache_endpoint(self, client):
        """Test endpoint de vidage du cache"""
        response = client.post('/api/clear_cache')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])