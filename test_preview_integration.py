#!/usr/bin/env python3
"""
Script de test pour vérifier l'intégration de la preview
"""

import requests
import json
import time

API_URL = 'http://localhost:5000/api'

def test_preview_integration():
    """Test complet de l'intégration de la preview"""
    print("🔧 Test de l'intégration de la preview...")
    
    try:
        # 1. Vérifier la connectivité
        print("\n1. Test de connectivité...")
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("✅ Backend connecté")
        else:
            print("❌ Backend non connecté")
            return False
        
        # 2. Vérifier la configuration
        print("\n2. Test de la configuration...")
        response = requests.get(f"{API_URL}/config")
        if response.status_code == 200:
            config = response.json()
            if config.get('notionToken'):
                print("✅ Token Notion configuré")
            else:
                print("❌ Token Notion non configuré")
                return False
        else:
            print("❌ Impossible de récupérer la configuration")
            return False
        
        # 3. Vérifier la page de preview
        print("\n3. Test de la page de preview...")
        response = requests.get(f"{API_URL}/preview/url")
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('url'):
                print(f"✅ Page de preview configurée: {data['url']}")
            else:
                print("❌ Page de preview non configurée")
                return False
        else:
            print("❌ Erreur lors de la récupération de l'URL de preview")
            return False
        
        # 4. Test de mise à jour de la preview
        print("\n4. Test de mise à jour de la preview...")
        test_content = "Test de contenu pour la preview\n\n- Point 1\n- Point 2\n\n**Texte en gras**"
        
        response = requests.post(f"{API_URL}/clipboard/preview", json={
            'content': test_content,
            'contentType': 'text',
            'parseAsMarkdown': True
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Preview mise à jour avec succès")
            else:
                print(f"❌ Erreur mise à jour preview: {data.get('error')}")
                return False
        else:
            print(f"❌ Erreur HTTP: {response.status_code}")
            return False
        
        # 5. Test de création de page de preview
        print("\n5. Test de création de page de preview...")
        response = requests.post(f"{API_URL}/create-preview-page")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"✅ Page de preview créée: {data.get('pageId')}")
            else:
                print(f"⚠️ Erreur création page preview: {data.get('error')}")
        else:
            print(f"⚠️ Erreur HTTP création preview: {response.status_code}")
        
        print("\n✅ Tests d'intégration terminés avec succès!")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors des tests: {e}")
        return False

if __name__ == "__main__":
    test_preview_integration() 