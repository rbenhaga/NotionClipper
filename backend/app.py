# backend/app.py
"""
Backend amélioré avec reconnexion automatique et gestion robuste
"""

import os
import sys
import signal
import time
import threading
from pathlib import Path

from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/..'))

# Configuration de l'encodage UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding="utf-8")

# Charger les variables d'environnement
load_dotenv()

# Import des modules
from backend.core.notion_clipper import NotionClipperBackend
from backend.api import register_blueprints

# Créer l'application Flask
app = Flask(__name__)

# Configuration CORS améliorée
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001"
        ],
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600,
        "send_wildcard": False
    }
})

# Gestionnaire d'exceptions global
@app.errorhandler(Exception)
def handle_exception(e):
    """Gestionnaire global d'exceptions"""
    import traceback
    
    # Log l'erreur
    print(f"Erreur non gérée: {str(e)}")
    print(traceback.format_exc())
    
    # Retourner une réponse JSON
    return jsonify({
        "error": str(e),
        "type": type(e).__name__,
        "traceback": traceback.format_exc() if app.debug else None
    }), 500

# Instance globale du backend
backend = None
backend_lock = threading.Lock()

def init_backend():
    """Initialise le backend avec gestion d'erreurs"""
    global backend
    try:
        with backend_lock:
            if backend is None:
                backend = NotionClipperBackend()
                # IMPORTANT : Initialiser le backend immédiatement
                backend.initialize()
                print("✅ Backend initialisé avec succès", flush=True)
            return backend
    except Exception as e:
        print(f"❌ Erreur initialisation backend: {e}", flush=True)
        # Créer quand même l'instance pour éviter les erreurs
        backend = NotionClipperBackend()
        return backend
        
# Route de reconnexion
@app.route('/api/reconnect', methods=['POST'])
def reconnect():
    """Force la reconnexion du backend"""
    global backend
    try:
        with backend_lock:
            # Nettoyer l'ancien backend
            if backend:
                if hasattr(backend, 'polling_manager') and backend.polling_manager:
                    backend.polling_manager.stop()
                if hasattr(backend, 'cache') and backend.cache:
                    backend.cache.save_to_disk()
            
            # Réinitialiser
            backend = None
            backend = NotionClipperBackend()
            
        return jsonify({
            "success": True,
            "message": "Backend reconnecté"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Thread de maintien en vie
def keepalive_thread():
    """Thread qui maintient le backend en vie"""
    while True:
        try:
            if backend and backend.polling_manager:
                # Forcer une vérification périodique
                if not backend.polling_manager.running:
                    backend.polling_manager.start()
            time.sleep(60)  # Vérifier chaque minute
        except Exception as e:
            print(f"Erreur keepalive: {e}", flush=True)
            time.sleep(60)

# Initialiser le backend au démarrage
init_backend()

# Enregistrer toutes les routes
if backend:
    register_blueprints(app, backend)

# Démarrer le thread de maintien
keepalive = threading.Thread(target=keepalive_thread, daemon=True)
keepalive.start()

# Gestionnaire de signal pour arrêt propre
def handle_exit(signum, frame):
    """Gestion propre de l'arrêt de l'application"""
    print("Arrêt propre du backend...", flush=True)
    try:
        os.remove("notion_backend.pid")
    except:
        pass
    
    if backend:
        if hasattr(backend, 'polling_manager') and backend.polling_manager:
            backend.polling_manager.stop()
        if hasattr(backend, 'cache') and backend.cache:
            backend.cache.save_to_disk()
    
    sys.exit(0)

# Enregistrer les gestionnaires de signaux
signal.signal(signal.SIGTERM, handle_exit)
signal.signal(signal.SIGINT, handle_exit)

# Écrire le PID
def write_pid():
    """Écrit le PID du processus"""
    try:
        with open("notion_backend.pid", "w") as f:
            f.write(str(os.getpid()))
    except Exception as e:
        print(f"Erreur écriture PID: {e}")

def print_startup_info():
    """Affiche les informations de démarrage"""
    print("🚀 Notion Clipper Pro - Backend v3.0", flush=True)
    print("=" * 40, flush=True)
    print(f"📡 Serveur: http://localhost:5000", flush=True)
    print(f"🔧 PID: {os.getpid()}", flush=True)
    print("=" * 40, flush=True)

# Gestionnaire d'erreur 500 détaillé
@app.errorhandler(500)
def handle_500_error(e):
    """Gestionnaire d'erreur 500 avec plus de détails"""
    import traceback
    error_details = {
        "error": str(e),
        "traceback": traceback.format_exc() if app.debug else None
    }
    return jsonify(error_details), 500

if __name__ == '__main__':
    write_pid()
    print_startup_info()
    
    # Configuration pour éviter les déconnexions
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=False,  # Important: pas de debug en production
        threaded=True,  # Support multi-thread
        use_reloader=False  # Éviter les redémarrages intempestifs
    )