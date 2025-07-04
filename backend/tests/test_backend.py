"""Tests complets pour le backend Notion Clipper Pro."""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import tempfile
import base64
from PIL import Image
import io
import sys
import os

# Ajouter le répertoire parent au path pour l'import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import des modules à tester
from backend.core.config import SecureConfig
from backend.utils.clipboard import ClipboardManager
from backend.parsers.enhanced_content_parser import EnhancedContentParser
from backend.core.cache import NotionCache


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
        test_config = {
            'notionToken': 'secret_token',
            'imgbbKey': 'secret_key'
        }
        
        secure_config.save_config(test_config)
        
        # Vérifier que le fichier ne contient pas les tokens en clair
        config_file = secure_config.config_file
        if config_file.exists():
            with open(config_file, 'r') as f:
                raw_content = f.read()
                assert 'secret_token' not in raw_content
                assert 'secret_key' not in raw_content


class TestClipboardManager:
    """Tests pour le gestionnaire de presse-papiers"""
    
    @pytest.fixture
    def clipboard_manager(self):
        return ClipboardManager()
    
    def test_detect_markdown(self, clipboard_manager):
        """Test détection du Markdown"""
        markdown_text = "# Titre\n\n**Texte gras** et *italique*"
        result = clipboard_manager._detect_text_type(markdown_text)
        assert result == "markdown"
    
    def test_detect_url(self, clipboard_manager):
        """Test détection d'URL"""
        url = "https://www.example.com"
        result = clipboard_manager._detect_text_type(url)
        assert result == "url"
    
    def test_detect_plain_text(self, clipboard_manager):
        """Test détection texte simple"""
        text = "Simple texte sans formatage"
        result = clipboard_manager._detect_text_type(text)
        assert result == "text"


class TestEnhancedContentParser:
    """Tests pour le parser de contenu amélioré"""
    
    @pytest.fixture
    def parser(self):
        return EnhancedContentParser()
    
    def test_parse_youtube_url(self, parser):
        """Test parsing URL YouTube"""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        blocks = parser.parse_content(url, 'url')
        
        assert len(blocks) >= 1
        # Vérifier qu'un bookmark est créé
        bookmark_block = next((b for b in blocks if b['type'] == 'bookmark'), None)
        assert bookmark_block is not None
        assert bookmark_block['bookmark']['url'] == url
    
    def test_parse_code_block(self, parser):
        """Test parsing bloc de code"""
        code = "```python\ndef hello():\n    print('Hello')\n```"
        blocks = parser.parse_content(code, 'code')
        
        assert len(blocks) == 1
        assert blocks[0]['type'] == 'code'
        assert 'hello()' in blocks[0]['code']['rich_text'][0]['text']['content']
    
    def test_parse_mixed_content(self, parser):
        """Test parsing contenu mixte"""
        content = """# Titre
        
Voici un paragraphe avec **texte gras**.

- Item 1
- Item 2

https://example.com"""
        
        blocks = parser.parse_content(content)
        
        # Vérifier la présence des différents types de blocs
        block_types = [b['type'] for b in blocks]
        assert 'heading_1' in block_types
        assert 'paragraph' in block_types
        assert 'bulleted_list_item' in block_types
        assert 'bookmark' in block_types


class TestNotionCache:
    """Tests pour le système de cache"""
    
    @pytest.fixture
    def cache(self, tmp_path):
        """Cache avec dossier temporaire"""
        cache = NotionCache(app_dir=tmp_path)
        return cache
    
    def test_add_and_get_page(self, cache):
        """Test ajout et récupération de page"""
        page_data = {
            'id': 'test-123',
            'title': 'Test Page',
            'url': 'https://notion.so/test-123'
        }
        
        cache.update_page(page_data)
        retrieved = cache.get_page('test-123')
        
        assert retrieved is not None
        assert retrieved['title'] == 'Test Page'
    
    def test_save_and_load(self, cache):
        """Test sauvegarde et chargement du cache"""
        pages = [
            {'id': '1', 'title': 'Page 1'},
            {'id': '2', 'title': 'Page 2'}
        ]
        
        for page in pages:
            cache.update_page(page)
        
        cache.save_to_disk()
        
        # Créer un nouveau cache et charger
        new_cache = NotionCache(app_dir=cache.app_dir)
        new_cache.load_from_disk()
        
        all_pages = new_cache.get_all_pages()
        assert len(all_pages) == 2
        page_1 = new_cache.get_page('1')
        assert page_1 is not None
        assert page_1['title'] == 'Page 1'
    
    def test_invalidate_page(self, cache):
        """Test invalidation de page"""
        page = {'id': 'test-123', 'title': 'Test'}
        cache.update_page(page)
        
        # Vérifier que la page est en cache
        assert cache.get_page('test-123') is not None
        
        # Invalider
        cache.remove_page('test-123')
        
        # Vérifier que la page n'est plus en cache
        assert cache.get_page('test-123') is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])