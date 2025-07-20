"""
Tests unitaires pour le module core
Exemples de tests pour la nouvelle architecture
"""

import pytest
import json
import time
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

from backend.core.notion_clipper import NotionClipperBackend
from backend.core.polling_manager import SmartPollingManager
from backend.core.stats_manager import StatsManager
from backend.core.format_handlers import (
    FormatHandlerRegistry, TextHandler, ImageHandler,
    TableHandler, CodeHandler, MarkdownHandler
)
from backend.utils.helpers import extract_notion_page_title


class TestNotionClipperBackend:
    """Tests pour la classe principale du backend"""
    
    @pytest.fixture
    def backend(self):
        """Créer une instance de backend pour les tests"""
        with patch('core.notion_clipper.SecureConfig'):
            backend = NotionClipperBackend()
            backend.notion_client = Mock()
            backend.imgbb_key = "test_key"
            return backend
    
    def test_initialization(self, backend):
        """Test l'initialisation du backend"""
        assert backend.notion_client is not None
        assert backend.imgbb_key == "test_key"
        assert isinstance(backend.cache, Mock)
        assert isinstance(backend.polling_manager, SmartPollingManager)
        assert isinstance(backend.stats_manager, StatsManager)
    
    def test_detect_content_type_text(self, backend):
        """Test la détection du type texte"""
        content = "Ceci est un simple texte"
        assert backend.detect_content_type(content) == 'text'
    
    def test_detect_content_type_markdown(self, backend):
        """Test la détection du type markdown"""
        content = "# Titre\n\n**Texte en gras** et *italique*"
        assert backend.detect_content_type(content) == 'markdown'
    
    def test_detect_content_type_code(self, backend):
        """Test la détection du type code"""
        content = "def hello():\n    return 'world'"
        assert backend.detect_content_type(content) == 'code'
    
    def test_detect_content_type_url(self, backend):
        """Test la détection du type URL"""
        content = "https://www.example.com"
        assert backend.detect_content_type(content) == 'url'
    
    def test_detect_content_type_image(self, backend):
        """Test la détection du type image"""
        content = "https://example.com/image.jpg"
        assert backend.detect_content_type(content) == 'image'
    
    def test_detect_content_type_table(self, backend):
        """Test la détection du type tableau"""
        content = "Col1|Col2|Col3\nVal1|Val2|Val3\nVal4|Val5|Val6"
        assert backend.detect_content_type(content) == 'table'
    
    def test_process_content_text(self, backend):
        """Test le traitement du contenu texte"""
        content = "Simple paragraphe"
        blocks = backend.process_content(content, 'text')
        
        assert len(blocks) == 1
        assert blocks[0]['type'] == 'paragraph'
        assert blocks[0]['paragraph']['rich_text'][0]['text']['content'] == content
    
    @patch('requests.post')
    def test_send_to_notion_success(self, mock_post, backend):
        """Test l'envoi réussi vers Notion"""
        # Mock de la réponse Notion
        backend.notion_client.blocks.children.append.return_value = {
            "object": "list",
            "results": []
        }
        
        blocks = [{"type": "paragraph", "paragraph": {"rich_text": []}}]
        result = backend.send_to_notion("page-id", blocks)
        
        assert result['success'] is True
        assert 'blocksCount' in result
        backend.notion_client.blocks.children.append.assert_called_once()
    
    def test_send_to_notion_no_client(self, backend):
        """Test l'envoi sans client Notion configuré"""
        backend.notion_client = None
        
        result = backend.send_to_notion("page-id", [])
        
        assert result['success'] is False
        assert "non configuré" in result['error']
    
    def test_search_pages(self, backend):
        """Test la recherche de pages"""
        # Mock de la réponse de recherche
        backend.notion_client.search.return_value = {
            "results": [
                {
                    "id": "page-1",
                    "properties": {
                        "title": {
                            "type": "title",
                            "title": [{"plain_text": "Page Test"}]
                        }
                    }
                }
            ]
        }
        
        results = backend.search_pages("test")
        
        assert len(results) == 1
        assert results[0]['id'] == "page-1"
        assert results[0]['title'] == "Page Test"


class TestPollingManager:
    """Tests pour le gestionnaire de polling"""
    
    @pytest.fixture
    def polling_manager(self):
        """Créer un gestionnaire de polling pour les tests"""
        backend = Mock()
        backend.notion_client = Mock()
        backend.cache = Mock()
        return SmartPollingManager(backend)
    
    def test_initialization(self, polling_manager):
        """Test l'initialisation du polling manager"""
        assert polling_manager.running is False
        assert polling_manager.check_interval == 30
        assert polling_manager.sync_interval == 300
        assert polling_manager.page_checksums == {}
    
    def test_start_stop(self, polling_manager):
        """Test le démarrage et l'arrêt du polling"""
        polling_manager.start()
        assert polling_manager.running is True
        assert polling_manager.thread is not None
        
        polling_manager.stop()
        assert polling_manager.running is False
    
    def test_calculate_checksum(self, polling_manager):
        """Test le calcul de checksum"""
        page = {
            "id": "test-page",
            "properties": {
                "title": {
                    "type": "title",
                    "title": [{"plain_text": "Test"}]
                }
            },
            "last_edited_time": "2024-01-01T00:00:00Z"
        }
        
        checksum1 = polling_manager._calculate_checksum(page)
        checksum2 = polling_manager._calculate_checksum(page)
        
        assert checksum1 == checksum2
        assert len(checksum1) == 64  # SHA256 hex length
    
    def test_extract_notion_page_title(self):
        """Test l'extraction universelle du titre d'une page"""
        page = {
            "properties": {
                "title": {
                    "type": "title",
                    "title": [{"plain_text": "Mon Titre"}]
                }
            }
        }
        title = extract_notion_page_title(page)
        assert title == "Mon Titre"

    def test_extract_notion_page_title_no_title(self):
        """Test l'extraction universelle du titre quand il n'y en a pas"""
        page = {"properties": {}}
        title = extract_notion_page_title(page)
        assert title == "Sans titre"


class TestStatsManager:
    """Tests pour le gestionnaire de statistiques"""
    
    @pytest.fixture
    def stats_manager(self):
        """Créer un gestionnaire de stats pour les tests"""
        return StatsManager()
    
    def test_initialization(self, stats_manager):
        """Test l'initialisation du stats manager"""
        assert all(count == 0 for count in stats_manager.counters.values())
        assert stats_manager.content_type_stats == {}
        assert stats_manager.error_log == []
    
    def test_increment_counter(self, stats_manager):
        """Test l'incrémentation des compteurs"""
        stats_manager.increment('api_calls')
        stats_manager.increment('api_calls', 2)
        
        assert stats_manager.counters['api_calls'] == 3
    
    def test_record_content_type(self, stats_manager):
        """Test l'enregistrement des types de contenu"""
        stats_manager.record_content_type('text')
        stats_manager.record_content_type('text')
        stats_manager.record_content_type('image')
        
        assert stats_manager.content_type_stats['text'] == 2
        assert stats_manager.content_type_stats['image'] == 1
    
    def test_record_error(self, stats_manager):
        """Test l'enregistrement des erreurs"""
        stats_manager.record_error("Test error", "test_context")
        
        assert len(stats_manager.error_log) == 1
        assert stats_manager.error_log[0]['error'] == "Test error"
        assert stats_manager.error_log[0]['context'] == "test_context"
        assert stats_manager.counters['errors'] == 1
    
    def test_calculate_cache_hit_rate(self, stats_manager):
        """Test le calcul du taux de succès du cache"""
        stats_manager.counters['cache_hits'] = 80
        stats_manager.counters['cache_misses'] = 20
        
        rate = stats_manager._calculate_cache_hit_rate()
        assert rate == 80.0
    
    def test_calculate_success_rate(self, stats_manager):
        """Test le calcul du taux de succès"""
        stats_manager.counters['successful_sends'] = 95
        stats_manager.counters['failed_sends'] = 5
        
        rate = stats_manager._calculate_success_rate()
        assert rate == 95.0
    
    def test_format_uptime(self, stats_manager):
        """Test le formatage du temps de fonctionnement"""
        assert stats_manager._format_uptime(30) == "30s"
        assert stats_manager._format_uptime(90) == "1m 30s"
        assert stats_manager._format_uptime(3665) == "1h 1m 5s"
    
    def test_get_all_stats(self, stats_manager):
        """Test la récupération de toutes les stats"""
        stats_manager.increment('api_calls', 10)
        stats_manager.record_content_type('text')
        
        all_stats = stats_manager.get_all_stats()
        
        assert 'uptime' in all_stats
        assert 'counters' in all_stats
        assert 'content_types' in all_stats
        assert all_stats['counters']['api_calls'] == 10
        assert all_stats['content_types']['text'] == 1


class TestFormatHandlers:
    """Tests pour les gestionnaires de formats"""
    
    @pytest.fixture
    def backend_mock(self):
        """Mock du backend pour les tests"""
        backend = Mock()
        backend.imgbb_key = "test_key"
        backend.stats_manager = Mock()
        return backend
    
    def test_text_handler(self, backend_mock):
        """Test le handler de texte"""
        handler = TextHandler(backend_mock)
        content = "Simple texte\n\nAvec paragraphes"
        
        blocks = handler.handle(content)
        
        assert len(blocks) == 2
        assert all(b['type'] == 'paragraph' for b in blocks)
    
    def test_markdown_handler(self, backend_mock):
        """Test le handler markdown"""
        handler = MarkdownHandler(backend_mock)
        content = "# Titre\n\nParagraphe avec **gras**"
        
        with patch('core.format_handlers.markdown_to_blocks') as mock_parser:
            mock_parser.return_value = [
                {"type": "heading_1", "heading_1": {}},
                {"type": "paragraph", "paragraph": {}}
            ]
            
            blocks = handler.handle(content)
            
            assert len(blocks) == 2
            assert blocks[0]['type'] == 'heading_1'
            mock_parser.assert_called_once_with(content)
    
    def test_code_handler(self, backend_mock):
        """Test le handler de code"""
        handler = CodeHandler(backend_mock)
        content = "def hello():\n    return 'world'"
        
        blocks = handler.handle(content)
        
        assert len(blocks) == 1
        assert blocks[0]['type'] == 'code'
        assert blocks[0]['code']['language'] == 'python'
    
    def test_table_handler(self, backend_mock):
        """Test le handler de tableaux"""
        handler = TableHandler(backend_mock)
        content = "Col1|Col2|Col3\nVal1|Val2|Val3"
        
        blocks = handler.handle(content)
        
        assert len(blocks) == 1
        assert blocks[0]['type'] == 'table'
        assert blocks[0]['table']['table_width'] == 3
    
    def test_image_handler_url(self, backend_mock):
        """Test le handler d'images avec URL"""
        handler = ImageHandler(backend_mock)
        content = "https://example.com/image.jpg"
        
        blocks = handler.handle(content)
        
        assert len(blocks) == 1
        assert blocks[0]['type'] == 'image'
        assert blocks[0]['image']['external']['url'] == content
    
    @patch('requests.post')
    def test_image_handler_base64(self, mock_post, backend_mock):
        """Test le handler d'images avec base64"""
        handler = ImageHandler(backend_mock)
        content = "data:image/png;base64,iVBORw0KGgoAAAANS..."
        
        # Mock de la réponse ImgBB
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "success": True,
            "data": {"url": "https://imgbb.com/uploaded.jpg"}
        }
        
        blocks = handler.handle(content)
        
        assert len(blocks) == 1
        assert blocks[0]['type'] == 'image'


# Lancer les tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])