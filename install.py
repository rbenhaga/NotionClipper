#!/usr/bin/env python3
"""
Script d'installation automatique pour Notion Clipper Pro
"""

import os
import sys
import subprocess
import json
from pathlib import Path


def print_header(text):
    """Affiche un header stylé."""
    print("\n" + "="*60)
    print(f"🚀 {text}")
    print("="*60 + "\n")


def check_command(command):
    """Vérifie si une commande existe."""
    try:
        subprocess.run([command, "--version"], capture_output=True, check=True)
        return True
    except:
        return False


def install_python_deps():
    """Installe les dépendances Python."""
    print_header("Installation des dépendances Python")
    
    deps = [
        "flask",
        "flask-cors",
        "notion-client",
        "python-dotenv",
        "requests",
        "pillow",
        "pyperclip"
    ]
    
    for dep in deps:
        print(f"📦 Installation de {dep}...")
        subprocess.run([sys.executable, "-m", "pip", "install", dep], check=True)
    
    print("✅ Dépendances Python installées!")


def create_project_structure():
    """Crée la structure du projet."""
    print_header("Création de la structure du projet")
    
    # Dossiers à créer
    dirs = ["src", "public", "assets", "build"]
    
    for dir_name in dirs:
        Path(dir_name).mkdir(exist_ok=True)
        print(f"📁 Dossier {dir_name}/ créé")
    
    print("✅ Structure créée!")


def create_env_file():
    """Crée le fichier .env."""
    print_header("Configuration de l'environnement")
    
    if Path(".env").exists():
        print("⚠️  Fichier .env existant trouvé")
        return
    
    print("Veuillez entrer vos informations de configuration:")
    print("\n1. Token Notion (obligatoire)")
    print("   Allez sur https://www.notion.so/my-integrations")
    print("   Créez une intégration et copiez le token")
    
    notion_token = input("\n🔑 NOTION_TOKEN: ").strip()
    
    if not notion_token:
        print("❌ Token Notion requis!")
        sys.exit(1)
    
    print("\n2. Clé API imgBB (optionnel mais recommandé)")
    print("   Allez sur https://api.imgbb.com/")
    print("   Créez un compte gratuit et générez une clé")
    print("   Appuyez sur Entrée pour ignorer")
    
    imgbb_key = input("\n🔑 IMGBB_API_KEY (optionnel): ").strip()
    
    # Créer le fichier .env
    env_content = f"""# Configuration Notion Clipper Pro
NOTION_TOKEN={notion_token}
"""
    
    if imgbb_key:
        env_content += f"IMGBB_API_KEY={imgbb_key}\n"
    
    with open(".env", "w") as f:
        f.write(env_content)
    
    print("✅ Fichier .env créé!")


def create_react_files():
    """Crée les fichiers React de base."""
    print_header("Création des fichiers React")
    
    # index.js
    index_js = """import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
    },
    mode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  },
  shape: {
    borderRadius: 12,
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
"""
    
    # index.html
    index_html = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notion Clipper Pro</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
  <style>
    body {
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
</head>
<body>
  <div id="root"></div>
</body>
</html>
"""
    
    # Créer les fichiers
    with open("src/index.js", "w") as f:
        f.write(index_js)
    print("✅ src/index.js créé")
    
    with open("public/index.html", "w") as f:
        f.write(index_html)
    print("✅ public/index.html créé")


def install_node_deps():
    """Installe les dépendances Node."""
    print_header("Installation des dépendances Node.js")
    
    if not check_command("npm"):
        print("❌ npm non trouvé! Installez Node.js depuis https://nodejs.org/")
        return False
    
    print("📦 Installation des packages npm...")
    subprocess.run(["npm", "install"], check=True)
    
    print("✅ Dépendances Node.js installées!")
    return True


def create_launch_scripts():
    """Crée des scripts de lancement."""
    print_header("Création des scripts de lancement")
    
    # Script Windows
    bat_content = """@echo off
echo Starting Notion Clipper Pro...
start /B python notion_backend.py
timeout /t 2
npm start
"""
    
    with open("start.bat", "w") as f:
        f.write(bat_content)
    
    # Script Unix
    sh_content = """#!/bin/bash
echo "Starting Notion Clipper Pro..."
python3 notion_backend.py &
BACKEND_PID=$!
sleep 2
npm start
kill $BACKEND_PID
"""
    
    with open("start.sh", "w") as f:
        f.write(sh_content)
    
    os.chmod("start.sh", 0o755)
    
    print("✅ Scripts de lancement créés!")
    print("   - Windows: start.bat")
    print("   - Mac/Linux: start.sh")


def main():
    """Installation principale."""
    print("\n" + "🌟"*30)
    print("   NOTION CLIPPER PRO - Installation Automatique")
    print("🌟"*30 + "\n")
    
    # Vérifications
    print_header("Vérification des prérequis")
    
    if not check_command("python3") and not check_command("python"):
        print("❌ Python non trouvé!")
        sys.exit(1)
    print("✅ Python trouvé")
    
    if not check_command("npm"):
        print("⚠️  npm non trouvé - Installation Node.js requise")
        print("   Téléchargez depuis: https://nodejs.org/")
    else:
        print("✅ Node.js/npm trouvé")
    
    # Installation
    try:
        create_project_structure()
        create_env_file()
        install_python_deps()
        create_react_files()
        
        if check_command("npm"):
            install_node_deps()
        
        create_launch_scripts()
        
        # Instructions finales
        print("\n" + "🎉"*30)
        print("\n✅ INSTALLATION TERMINÉE!")
        print("\n📝 Prochaines étapes:")
        print("\n1. Copiez les fichiers suivants dans ce dossier:")
        print("   - notion_backend.py")
        print("   - main.js")
        print("   - src/App.jsx")
        print("   - src/App.css")
        print("\n2. Partagez vos pages Notion avec votre intégration")
        print("\n3. Lancez l'application:")
        if sys.platform == "win32":
            print("   - Double-cliquez sur start.bat")
        else:
            print("   - ./start.sh")
        print("\n4. Utilisez Ctrl+Shift+N pour ouvrir rapidement!")
        print("\n" + "🎉"*30 + "\n")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()