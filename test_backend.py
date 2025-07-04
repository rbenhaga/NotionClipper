#!/usr/bin/env python3
"""
Script de test pour vérifier le démarrage du backend
"""

import sys
import os

def test_imports():
    """Teste les imports du backend"""
    print("🔍 Test des imports...")
    
    try:
        # Test des imports principaux
        from backend.config import SecureConfig
        print("✅ SecureConfig importé")
        
        from backend.cache import NotionCache
        print("✅ NotionCache importé")
        
        from backend.utils import get_clipboard_content, ClipboardManager
        print("✅ Utils importés")
        
        from backend.markdown_parser import validate_notion_blocks
        print("✅ Markdown parser importé")
        
        from backend.enhanced_content_parser import EnhancedContentParser, parse_content_for_notion
        print("✅ Enhanced content parser importé")
        
        # Test des imports externes
        from flask import Flask
        print("✅ Flask importé")
        
        from notion_client import Client
        print("✅ Notion client importé")
        
        from dotenv import load_dotenv
        print("✅ Dotenv importé")
        
        import requests
        print("✅ Requests importé")
        
        from PIL import Image
        print("✅ Pillow importé")
        
        return True
        
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

def test_backend_creation():
    """Teste la création du backend"""
    print("\n🔍 Test de création du backend...")
    
    try:
        # Importer le backend principal
        from notion_backend import NotionClipperBackend
        
        # Créer une instance
        backend = NotionClipperBackend()
        print("✅ Backend créé avec succès")
        
        # Test des attributs de base
        assert hasattr(backend, 'secure_config'), "secure_config manquant"
        assert hasattr(backend, 'clipboard_manager'), "clipboard_manager manquant"
        assert hasattr(backend, 'cache'), "cache manquant"
        print("✅ Attributs de base présents")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur création backend: {e}")
        return False

def test_flask_app():
    """Teste la création de l'app Flask"""
    print("\n🔍 Test de l'app Flask...")
    
    try:
        from notion_backend import app
        
        # Vérifier que l'app Flask existe
        assert app is not None, "App Flask non créée"
        print("✅ App Flask créée")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur app Flask: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🚀 Test du backend Notion Clipper Pro")
    print("=" * 50)
    
    # Test des imports
    if not test_imports():
        print("\n❌ Échec des tests d'import")
        sys.exit(1)
    
    # Test de création du backend
    if not test_backend_creation():
        print("\n❌ Échec de la création du backend")
        sys.exit(1)
    
    # Test de l'app Flask
    if not test_flask_app():
        print("\n❌ Échec de l'app Flask")
        sys.exit(1)
    
    print("\n✅ Tous les tests sont passés !")
    print("🎉 Le backend est prêt à démarrer")

if __name__ == "__main__":
    main() 