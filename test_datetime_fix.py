#!/usr/bin/env python3
"""
Script de test pour vérifier les corrections de datetime
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from datetime import datetime, timezone
from backend.utils.helpers import normalize_notion_date

def test_normalize_notion_date():
    """Test de la fonction de normalisation des dates"""
    print("🧪 Test de normalisation des dates Notion...")
    
    # Cas de test
    test_cases = [
        ("2024-01-01T00:00:00Z", "2024-01-01T00:00:00+00:00"),
        ("2024-01-01T12:30:45Z", "2024-01-01T12:30:45+00:00"),
        ("2024-01-01T00:00:00+00:00", "2024-01-01T00:00:00+00:00"),
        ("", ""),
        ("invalid-date", "2000-01-01T00:00:00+00:00"),
    ]
    
    for input_date, expected in test_cases:
        result = normalize_notion_date(input_date)
        status = "✅" if result == expected else "❌"
        print(f"{status} '{input_date}' -> '{result}' (attendu: '{expected}')")
        
        # Vérifier que la date peut être parsée
        try:
            dt = datetime.fromisoformat(result)
            if dt.tzinfo is None:
                print(f"  ⚠️  Date sans timezone: {result}")
            else:
                print(f"  ✅ Date timezone-aware: {result}")
        except Exception as e:
            print(f"  ❌ Erreur parsing: {e}")

def test_datetime_comparison():
    """Test de comparaison de dates timezone-aware"""
    print("\n🧪 Test de comparaison de dates...")
    
    # Créer des dates timezone-aware
    now_utc = datetime.now(timezone.utc)
    
    # Normaliser une date Notion
    notion_date_str = "2024-01-01T00:00:00Z"
    normalized = normalize_notion_date(notion_date_str)
    notion_date = datetime.fromisoformat(normalized)
    
    print(f"Date actuelle (UTC): {now_utc}")
    print(f"Date Notion normalisée: {notion_date}")
    
    # Comparaison
    try:
        if now_utc > notion_date:
            print("✅ Comparaison réussie: maintenant > date Notion")
        else:
            print("✅ Comparaison réussie: date Notion > maintenant")
    except Exception as e:
        print(f"❌ Erreur de comparaison: {e}")

def test_backend_integration():
    """Test d'intégration avec le backend"""
    print("\n🧪 Test d'intégration backend...")
    
    try:
        from backend.core.cache import NotionCache
        from backend.utils.helpers import normalize_notion_date
        from pathlib import Path
        
        # Créer une instance de cache
        cache_dir = Path.home() / '.notion_clipper' / 'test_cache'
        cache = NotionCache(cache_dir)
        
        # Simuler une page avec date Notion
        test_page = {
            "id": "test-page-id",
            "title": "Test Page",
            "last_edited_time": "2024-01-01T00:00:00Z",
            "created_time": "2024-01-01T00:00:00Z",
            "icon": None,
            "url": "https://notion.so/test",
            "parent": {"type": "page"}
        }
        
        # Normaliser les dates manuellement
        normalized_last_edited = normalize_notion_date(test_page['last_edited_time'])
        normalized_created = normalize_notion_date(test_page['created_time'])
        
        print(f"Date originale: {test_page['last_edited_time']}")
        print(f"Date normalisée: {normalized_last_edited}")
        
        # Vérifier que la date est normalisée
        if normalized_last_edited.endswith('+00:00'):
            print("✅ Date normalisée correctement")
        else:
            print("❌ Date non normalisée")
            
        # Test de parsing
        from datetime import datetime
        dt = datetime.fromisoformat(normalized_last_edited)
        print(f"✅ Date parsée avec succès: {dt}")
            
    except Exception as e:
        print(f"❌ Erreur d'intégration: {e}")

if __name__ == "__main__":
    print("🔧 Test des corrections de datetime\n")
    
    test_normalize_notion_date()
    test_datetime_comparison()
    test_backend_integration()
    
    print("\n✅ Tests terminés!") 