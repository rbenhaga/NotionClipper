"""
Point d'entrée principal de l'application Notion Clipper Pro
Architecture modulaire et optimisée
"""

import os
import sys
import signal
from pathlib import Path

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/..'))

# Configuration de l'encodage UTF-8
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

# Charger les variables d'environnement
load_dotenv()

# Import des modules
from backend.core.notion_clipper import NotionClipperBackend
from backend.api import register_blueprints

# Créer l'application Flask
app = Flask(__name__)

# Configuration CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001", "*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Instance globale du backend
backend = NotionClipperBackend()

# Enregistrer toutes les routes
register_blueprints(app, backend)

# Gestionnaire de signal pour arrêt propre
def handle_exit(signum, frame):
    """Gestion propre de l'arrêt de l'application"""
    print("Arrêt propre du backend (signal reçu)", flush=True)
    try:
        os.remove("notion_backend.pid")
    except Exception:
        pass
    
    # Arrêter le polling si actif
    if backend.polling_manager:
        backend.polling_manager.stop()
    
    # Sauvegarder le cache
    if backend.cache:
        backend.cache.save_to_disk()
    
    sys.exit(0)

# Enregistrer les gestionnaires de signaux
signal.signal(signal.SIGTERM, handle_exit)
signal.signal(signal.SIGINT, handle_exit)

# Écrire le PID pour Electron
def write_pid():
    """Écrit le PID du processus dans un fichier"""
    try:
        with open("notion_backend.pid", "w") as f:
            f.write(str(os.getpid()))
    except Exception as e:
        print(f"Impossible d'écrire le fichier PID: {e}")

def print_startup_info():
    """Affiche les informations de démarrage"""
    print("🚀 Notion Clipper Pro - Backend Optimisé")
    print("=========================================")
    
    # Charger la configuration
    if backend.initialize():
        print("✅ Backend initialisé avec succès")
    else:
        print("⚠️ Backend en attente de configuration")
    
    print("\n📊 Formats supportés:")
    for fmt in backend.format_handlers.keys():
        print(f"  • {fmt}")
    
    print("\n🔧 Optimisations:")
    print("  • Détection intelligente des formats")
    print("  • Upload d'images avec compression")
    print("  • Cache multi-niveaux")
    print("  • Polling asynchrone")
    print("  • Traitement parallèle")
    
    print("\n📡 Serveur démarré sur http://localhost:5000")
    print("✅ Toutes les routes sont disponibles")

if __name__ == '__main__':
    # Écrire le PID
    write_pid()
    
    # Afficher les informations de démarrage
    print_startup_info()
    
    # Lancer Flask
    try:
        app.run(
            host='127.0.0.1',
            port=5000,
            debug=False,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\n⏹️ Arrêt du serveur...")
        handle_exit(None, None)