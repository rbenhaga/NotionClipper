#!/usr/bin/env python3
"""
Script de vérification de sécurité pour NotionClipper Pro
Vérifie que toutes les améliorations de sécurité sont en place
"""

import sys, os
sys.path.insert(0, os.path.abspath('.'))

import subprocess
import json
from pathlib import Path

def print_status(message, status="INFO"):
    """Affiche un message avec un statut coloré"""
    colors = {
        "SUCCESS": "\033[92m",  # Vert
        "ERROR": "\033[91m",    # Rouge
        "WARNING": "\033[93m",  # Jaune
        "INFO": "\033[94m",     # Bleu
    }
    reset = "\033[0m"
    
    color = colors.get(status, colors["INFO"])
    print(f"{color}[{status}]{reset} {message}")

def check_hardcoded_keys():
    """Vérifie qu'aucune clé API n'est hardcodée"""
    print_status("🔍 Vérification des clés hardcodées...", "INFO")
    
    hardcoded_keys = []
    search_patterns = [
        "f3c96fc1d87f81ae20bb67c5a9e90fc9",
        "IMGBB_API_KEY = '",
        "imgbbApiKey: IMGBB_API_KEY"
    ]
    
    # Chercher dans tous les fichiers
    for root, dirs, files in os.walk("."):
        # Ignorer les dossiers de backup, node_modules, tests et ce script lui-même
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'backup', 'tests']]
        for file in files:
            if file == os.path.basename(__file__):
                continue
            if file.endswith(('.py', '.js', '.jsx', '.ts', '.tsx')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        for pattern in search_patterns:
                            if pattern in content:
                                hardcoded_keys.append(f"{file_path}: {pattern}")
                except Exception:
                    continue
    
    if hardcoded_keys:
        print_status(f"❌ {len(hardcoded_keys)} clés hardcodées trouvées:", "ERROR")
        for key in hardcoded_keys:
            print(f"   - {key}")
        return False
    else:
        print_status("✅ Aucune clé hardcodée trouvée", "SUCCESS")
        return True

def check_security_modules():
    """Vérifie que les modules de sécurité existent"""
    print_status("🔒 Vérification des modules de sécurité...", "INFO")
    
    required_files = [
        "backend/utils/security.py",
        "backend/utils/config.py",
        "tests/unit/test_security.py"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print_status(f"❌ {len(missing_files)} fichiers manquants:", "ERROR")
        for file in missing_files:
            print(f"   - {file}")
        return False
    else:
        print_status("✅ Tous les modules de sécurité présents", "SUCCESS")
        return True

def check_dependencies():
    """Vérifie que les dépendances de sécurité sont installées"""
    print_status("📦 Vérification des dépendances...", "INFO")
    
    required_packages = [
        "cryptography",
        "sentry-sdk"
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print_status(f"❌ {len(missing_packages)} packages manquants:", "ERROR")
        for package in missing_packages:
            print(f"   - {package}")
        return False
    else:
        print_status("✅ Toutes les dépendances installées", "SUCCESS")
        return True

def test_security_module():
    """Teste le module de sécurité"""
    print_status("🧪 Test du module de sécurité...", "INFO")
    
    try:
        from backend.utils.security import SecureStorage, get_secure_api_key, set_secure_api_key
        
        # Test basique
        storage = SecureStorage()
        test_key = "test_security_key"
        test_value = "test_security_value"
        
        # Stocker et récupérer
        success = storage.store_secret(test_key, test_value)
        if not success:
            raise Exception("Échec du stockage")
        
        retrieved_value = storage.get_secret(test_key)
        if retrieved_value != test_value:
            raise Exception("Valeur récupérée incorrecte")
        
        # Nettoyer
        storage.remove_secret(test_key)
        
        print_status("✅ Module de sécurité fonctionnel", "SUCCESS")
        return True
        
    except Exception as e:
        print_status(f"❌ Erreur dans le module de sécurité: {e}", "ERROR")
        return False

def check_api_routes():
    """Vérifie que les routes API sécurisées sont présentes"""
    print_status("🌐 Vérification des routes API sécurisées...", "INFO")
    
    config_routes_file = "backend/api/config_routes.py"
    if not os.path.exists(config_routes_file):
        print_status("❌ Fichier config_routes.py manquant", "ERROR")
        return False
    
    try:
        with open(config_routes_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        required_routes = [
            "/config/secure-api-key",
            "set_secure_api_key_route",
            "get_secure_api_key_route"
        ]
        
        missing_routes = []
        for route in required_routes:
            if route not in content:
                missing_routes.append(route)
        
        if missing_routes:
            print_status(f"❌ {len(missing_routes)} routes manquantes:", "ERROR")
            for route in missing_routes:
                print(f"   - {route}")
            return False
        else:
            print_status("✅ Toutes les routes sécurisées présentes", "SUCCESS")
            return True
            
    except Exception as e:
        print_status(f"❌ Erreur lors de la vérification des routes: {e}", "ERROR")
        return False

def check_frontend_updates():
    """Vérifie que le frontend utilise le stockage sécurisé"""
    print_status("🎨 Vérification des mises à jour frontend...", "INFO")
    
    # Vérifier OnBoarding.jsx
    onboarding_file = "src/react/src/OnBoarding.jsx"
    if os.path.exists(onboarding_file):
        try:
            with open(onboarding_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if "f3c96fc1d87f81ae20bb67c5a9e90fc9" in content:
                print_status("❌ Clé hardcodée encore présente dans OnBoarding.jsx", "ERROR")
                return False
            else:
                print_status("✅ OnBoarding.jsx mis à jour", "SUCCESS")
        except Exception as e:
            print_status(f"❌ Erreur lors de la vérification d'OnBoarding.jsx: {e}", "ERROR")
            return False
    
    # Vérifier config.js
    config_service_file = "src/react/src/services/config.js"
    if os.path.exists(config_service_file):
        try:
            with open(config_service_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if "secure-api-key" in content:
                print_status("✅ Service de configuration mis à jour", "SUCCESS")
                return True
            else:
                print_status("❌ Service de configuration non mis à jour", "ERROR")
                return False
        except Exception as e:
            print_status(f"❌ Erreur lors de la vérification du service de config: {e}", "ERROR")
            return False
    
    return True

def run_tests():
    """Lance les tests de sécurité"""
    print_status("🧪 Lancement des tests de sécurité...", "INFO")
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            "tests/unit/test_security.py", 
            "-v", "--tb=short"
        ], capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print_status("✅ Tests de sécurité réussis", "SUCCESS")
            return True
        else:
            print_status("❌ Tests de sécurité échoués:", "ERROR")
            print(result.stdout)
            print(result.stderr)
            return False
            
    except Exception as e:
        print_status(f"❌ Erreur lors de l'exécution des tests: {e}", "ERROR")
        return False

def generate_report():
    """Génère un rapport de sécurité"""
    print_status("📊 Génération du rapport de sécurité...", "INFO")
    
    checks = [
        ("Clés hardcodées", check_hardcoded_keys),
        ("Modules de sécurité", check_security_modules),
        ("Dépendances", check_dependencies),
        ("Module de sécurité", test_security_module),
        ("Routes API", check_api_routes),
        ("Frontend", check_frontend_updates),
        ("Tests", run_tests)
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print_status(f"❌ Erreur lors de {name}: {e}", "ERROR")
            results[name] = False
    
    # Afficher le rapport
    print("\n" + "="*50)
    print_status("📋 RAPPORT DE SÉCURITÉ", "INFO")
    print("="*50)
    
    passed = 0
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name:<25} {status}")
        if result:
            passed += 1
    
    print("-"*50)
    print(f"Total: {passed}/{total} tests réussis")
    
    if passed == total:
        print_status("🎉 Toutes les vérifications de sécurité sont passées !", "SUCCESS")
        return True
    else:
        print_status(f"⚠️  {total - passed} vérifications ont échoué", "WARNING")
        return False

def main():
    """Fonction principale"""
    print_status("🚀 Vérification de sécurité NotionClipper Pro", "INFO")
    print_status("Version: 1.0.0", "INFO")
    print()
    
    success = generate_report()
    
    if success:
        print_status("✅ Installation sécurisée validée !", "SUCCESS")
        sys.exit(0)
    else:
        print_status("❌ Des problèmes de sécurité ont été détectés", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main() 