#!/usr/bin/env python3
"""
🚀 Notion Clipper Pro - Setup automatique modernisé
Installation et configuration en un clic
"""

import os
import sys
import subprocess
import json
import shutil
from pathlib import Path

def print_banner():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║               🚀 NOTION CLIPPER PRO 3.0                     ║
║                   Setup Automatique                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)

def check_requirements():
    """Vérifie les prérequis système."""
    print("🔍 Vérification des prérequis...")
    
    # Python
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ requis")
        sys.exit(1)
    print("✅ Python OK")
    
    # Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Node.js OK")
        else:
            print("❌ Node.js non trouvé - Installez depuis https://nodejs.org")
            sys.exit(1)
    except FileNotFoundError:
        print("❌ Node.js non trouvé - Installez depuis https://nodejs.org")
        sys.exit(1)
    
    # npm - Version corrigée  
    try:
        result = subprocess.run('npm --version', capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print(f"✅ npm OK (version {result.stdout.strip()})")
        else:
            print("❌ npm non trouvé")
            sys.exit(1)
    except FileNotFoundError:
        print("❌ npm non trouvé")
        sys.exit(1)

def create_structure():
    """Crée la structure modernisée du projet."""
    print("\n📁 Création de la structure du projet...")
    
    directories = [
        "src/electron",
        "src/react/src", 
        "src/react/public",
        "assets",
        "dist"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"   📁 {directory}/")

def install_dependencies():
    """Installe toutes les dépendances."""
    print("\n📦 Installation des dépendances...")
    
    # Dépendances Python
    print("🐍 Installation des packages Python...")
    python_deps = [
        "flask", "flask-cors", "notion-client", 
        "python-dotenv", "requests", "pillow", "pyperclip"
    ]
    
    for dep in python_deps:
        subprocess.run([sys.executable, "-m", "pip", "install", dep], 
                      check=True, capture_output=True)
        print(f"   ✅ {dep}")
    
    # Dépendances Node.js principales
    print("\n⚡ Installation des packages Node.js...")
    subprocess.run(["npm", "install"], check=True, capture_output=True, shell=True)
    print("   ✅ Packages Electron installés")
    
    # Dépendances React
    print("\n⚛️  Installation des packages React...")
    os.chdir("src/react")
    subprocess.run(["npm", "install"], check=True, capture_output=True, shell=True)
    print("   ✅ Packages React installés")
    os.chdir("../..")

def setup_environment():
    """Configure l'environnement."""
    print("\n⚙️  Configuration de l'environnement...")
    
    if Path(".env").exists():
        print("   ⚠️  Fichier .env existant conservé")
        return
    
    print("\n🔑 Configuration Notion:")
    print("   1. Allez sur https://www.notion.so/my-integrations")
    print("   2. Créez une nouvelle intégration")
    print("   3. Copiez le token d'intégration")
    
    notion_token = input("\n🔐 NOTION_TOKEN: ").strip()
    
    if not notion_token:
        print("❌ Token Notion requis!")
        sys.exit(1)
    
    print("\n📸 Configuration imgBB (optionnel):")
    print("   1. Allez sur https://api.imgbb.com/")
    print("   2. Créez un compte gratuit")
    print("   3. Générez une clé API")
    print("   (Appuyez sur Entrée pour ignorer)")
    
    imgbb_key = input("\n🔐 IMGBB_API_KEY (optionnel): ").strip()
    
    env_content = f"""# Notion Clipper Pro - Configuration
NOTION_TOKEN={notion_token}
"""
    
    if imgbb_key:
        env_content += f"IMGBB_API_KEY={imgbb_key}\n"
    
    with open(".env", "w", encoding='utf-8') as f:
        f.write(env_content)
    
    print("   ✅ Fichier .env créé")

def move_files():
    """Déplace les fichiers vers la nouvelle structure."""
    print("\n🔄 Réorganisation des fichiers...")
    
    # Déplacer main.js vers src/electron/
    if Path("main.js").exists():
        shutil.move("main.js", "src/electron/main.js")
        print("   ✅ main.js → src/electron/")
    
    # Déplacer les fichiers React vers src/react/src/
    react_files = ["src/App.jsx", "src/App.css", "src/index.js"]
    for file_path in react_files:
        if Path(file_path).exists():
            dest = Path(f"src/react/{file_path}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(file_path, dest)
            print(f"   ✅ {file_path} → src/react/{file_path}")
    
    # Déplacer public/index.html vers src/react/public/
    if Path("public/index.html").exists():
        dest = Path("src/react/public/index.html")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move("public/index.html", dest)
        print("   ✅ public/index.html → src/react/public/")

def create_scripts():
    """Crée les scripts de développement."""
    print("\n📝 Création des scripts de développement...")
    
    # Script de développement
    dev_script = """#!/bin/bash
echo "🚀 Démarrage de Notion Clipper Pro en mode développement..."

# Démarrer le backend Python en arrière-plan
echo "🐍 Démarrage du backend Python..."
python notion_backend.py &
BACKEND_PID=$!

# Attendre que le backend démarre
sleep 3

# Démarrer React en mode développement
echo "⚛️  Démarrage du serveur React..."
cd src/react && npm start &
REACT_PID=$!

# Attendre que React démarre
sleep 5

# Démarrer Electron
echo "⚡ Démarrage d'Electron..."
npm run start:electron

# Nettoyer les processus à la fin
kill $BACKEND_PID $REACT_PID
"""
    
    with open("dev.sh", "w", encoding='utf-8') as f:
        f.write(dev_script)
    
    os.chmod("dev.sh", 0o755)
    
    # Script Windows
    dev_bat = """@echo off
echo 🚀 Démarrage de Notion Clipper Pro en mode développement...

echo 🐍 Démarrage du backend Python...
start /B python notion_backend.py

echo ⚛️  Démarrage du serveur React...
cd src/react
start /B npm start
cd ../..

echo ⚡ Attente du démarrage des services...
timeout /t 5 /nobreak > nul

echo ⚡ Démarrage d'Electron...
npm run start:electron
"""
    
    with open("dev.bat", "w", encoding='utf-8') as f:
        f.write(dev_bat)
    
    print("   ✅ Scripts de développement créés")
    print("      - dev.sh (Mac/Linux)")
    print("      - dev.bat (Windows)")

def final_instructions():
    """Affiche les instructions finales."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║                    🎉 INSTALLATION TERMINÉE !                ║
╚══════════════════════════════════════════════════════════════╝

📋 PROCHAINES ÉTAPES:

1. 📤 Partagez vos pages Notion avec votre intégration
   • Ouvrez une page Notion
   • Cliquez sur "Partager" → "Inviter"
   • Ajoutez votre intégration

2. 🚀 Démarrez l'application:
   • Mode développement: npm run dev (ou ./dev.sh sur Mac/Linux)
   • Mode production: npm run prod

3. ⌨️  Utilisez les raccourcis:
   • Ctrl+Shift+N : Ouvrir/fermer l'application
   • Copiez du contenu puis utilisez l'app !

4. 🛠️  Commandes disponibles:
   • npm run dev        - Mode développement
   • npm run prod       - Mode production  
   • npm run build      - Build pour distribution

╔══════════════════════════════════════════════════════════════╗
║          ✨ VOTRE NOTION CLIPPER PRO EST PRÊT ! ✨          ║
╚══════════════════════════════════════════════════════════════╝
    """)

def main():
    """Installation principale."""
    print_banner()
    
    try:
        check_requirements()
        create_structure()
        install_dependencies()
        setup_environment()
        move_files()
        create_scripts()
        final_instructions()
        
    except KeyboardInterrupt:
        print("\n\n❌ Installation interrompue par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Erreur: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()