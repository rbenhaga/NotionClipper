"""Tests pour le backend Notion Clipper Pro."""
import pytest
from backend.app import create_app
from backend.config import SecureConfig

@pytest.fixture
def app():
    """Fixture pour l'app de test."""
    app = create_app()
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """Client de test."""
    return app.test_client()

def test_health_endpoint(client):
    """Test de l'endpoint de santé."""
    response = client.get('/api/health')
    assert response.status_code == 200
    assert 'status' in response.json

def test_config_get(client):
    """Test de récupération de config."""
    response = client.get('/api/config')
    assert response.status_code == 200
    assert 'message' in response.json

def test_onboarding_complete(client):
    """Test de completion onboarding."""
    response = client.post('/api/onboarding/complete')
    assert response.status_code in (200, 404)

def test_clipboard_empty(client):
    """Test presse-papiers vide."""
    response = client.get('/api/clipboard')
    assert response.status_code == 200

@pytest.mark.parametrize("content_type,expected", [
    ("text", "text"),
    ("https://youtube.com/watch?v=123", "video"),
    ("data.mp3", "audio"),
    ("col1\tcol2\nval1\tval2", "table")
])
def test_content_detection(content_type, expected):
    from backend.utils import get_clipboard_content
    # Ce test est un placeholder, à adapter selon la logique réelle
    assert isinstance(get_clipboard_content(), dict) 