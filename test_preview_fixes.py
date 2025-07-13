#!/usr/bin/env python3
"""
Script de test pour vérifier les corrections apportées à Notion Clipper Pro
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.core.notion_clipper import NotionClipperBackend
from backend.api.content_routes import content_bp
from backend.api.config_routes import config_bp
from flask import Flask

def test_backend_initialization():
    """Test l'initialisation du backend"""
    print("🔧 Test d'initialisation du backend...")
    try:
        backend = NotionClipperBackend()
        print("✅ Backend initialisé avec succès")
        return True
    except Exception as e:
        print(f"❌ Erreur initialisation backend: {e}")
        return False

def test_create_preview_page_method():
    """Test la méthode create_preview_page"""
    print("\n🔧 Test de la méthode create_preview_page...")
    try:
        backend = NotionClipperBackend()
        
        # Vérifier que la méthode existe
        if hasattr(backend, 'create_preview_page'):
            print("✅ Méthode create_preview_page trouvée")
            
            # Test avec un token factice (ne créera pas réellement la page)
            # Mais vérifie que la méthode ne plante pas
            result = backend.create_preview_page()
            print(f"✅ Méthode exécutée (résultat: {result})")
            return True
        else:
            print("❌ Méthode create_preview_page non trouvée")
            return False
    except Exception as e:
        print(f"❌ Erreur test create_preview_page: {e}")
        return False

def test_routes_registration():
    """Test l'enregistrement des routes"""
    print("\n🔧 Test d'enregistrement des routes...")
    try:
        app = Flask(__name__)
        
        # Enregistrer les blueprints
        app.register_blueprint(content_bp, url_prefix='/api')
        app.register_blueprint(config_bp, url_prefix='/api')
        
        print("✅ Routes enregistrées avec succès")
        
        # Vérifier que les routes existent
        routes = [rule.rule for rule in app.url_map.iter_rules()]
        
        expected_routes = [
            '/api/preview/url',
            '/api/create-preview-page'
        ]
        
        for route in expected_routes:
            if route in routes:
                print(f"✅ Route {route} trouvée")
            else:
                print(f"❌ Route {route} manquante")
                return False
        
        return True
    except Exception as e:
        print(f"❌ Erreur test routes: {e}")
        return False

def test_preview_url_route():
    """Test la route /preview/url"""
    print("\n🔧 Test de la route /preview/url...")
    try:
        app = Flask(__name__)
        app.register_blueprint(content_bp, url_prefix='/api')
        
        # Configurer le backend pour le test
        backend = NotionClipperBackend()
        app.config['backend'] = backend
        
        with app.test_client() as client:
            response = client.get('/api/preview/url')
            data = response.get_json()
            
            if response.status_code == 200:
                print("✅ Route /preview/url répond correctement")
                print(f"   Réponse: {data}")
                return True
            else:
                print(f"❌ Erreur route /preview/url: {response.status_code}")
                return False
    except Exception as e:
        print(f"❌ Erreur test route /preview/url: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🚀 Test des corrections Notion Clipper Pro")
    print("=" * 50)
    
    tests = [
        test_backend_initialization,
        test_create_preview_page_method,
        test_routes_registration,
        test_preview_url_route
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Résultats: {passed}/{total} tests réussis")
    
    if passed == total:
        print("🎉 Tous les tests sont passés !")
        return True
    else:
        print("⚠️ Certains tests ont échoué")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 