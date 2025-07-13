#!/usr/bin/env python3
"""
Script de test pour vérifier les corrections CORS et les nouveaux endpoints
"""

import requests
import json

API_BASE = "http://localhost:5000/api"

def test_connectivity():
    """Test la connectivité de base"""
    print("🔧 Test de connectivité...")
    try:
        response = requests.get(f"{API_BASE}/test")
        print(f"✅ Connectivité OK: {response.status_code}")
        print(f"   Réponse: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Erreur connectivité: {e}")
        return False

def test_cors_preflight():
    """Test les requêtes preflight CORS"""
    print("\n🔧 Test CORS preflight...")
    try:
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        response = requests.options(f"{API_BASE}/save", headers=headers)
        print(f"✅ Preflight OK: {response.status_code}")
        print(f"   Headers CORS: {dict(response.headers)}")
        return True
    except Exception as e:
        print(f"❌ Erreur preflight: {e}")
        return False

def test_save_endpoint():
    """Test l'endpoint /save"""
    print("\n🔧 Test endpoint /save...")
    try:
        data = {
            'notionToken': 'test_token',
            'imgbbKey': 'test_key',
            'previewPageId': ''
        }
        headers = {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3000'
        }
        response = requests.post(f"{API_BASE}/save", json=data, headers=headers)
        print(f"✅ Save endpoint OK: {response.status_code}")
        print(f"   Réponse: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Erreur save endpoint: {e}")
        return False

def test_health_endpoint():
    """Test l'endpoint /health"""
    print("\n🔧 Test endpoint /health...")
    try:
        response = requests.get(f"{API_BASE}/health")
        print(f"✅ Health endpoint OK: {response.status_code}")
        health_data = response.json()
        print(f"   Status: {health_data.get('status')}")
        print(f"   Notion connected: {health_data.get('notion_connected')}")
        return True
    except Exception as e:
        print(f"❌ Erreur health endpoint: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🚀 Test des corrections CORS et endpoints")
    print("=" * 50)
    
    tests = [
        test_connectivity,
        test_cors_preflight,
        test_save_endpoint,
        test_health_endpoint
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
    exit(0 if success else 1) 