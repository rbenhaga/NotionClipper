"""
Module API pour Notion Clipper Pro
Enregistre toutes les routes Flask de manière modulaire
"""

from flask import Flask

from backend.api.config_routes import config_bp
from backend.api.content_routes import content_bp
from backend.api.page_routes import page_bp
from backend.api.clipboard_routes import clipboard_bp
from backend.api.stats_routes import stats_bp
from backend.api.event_routes import event_bp


def register_blueprints(app: Flask, backend):
    """
    Enregistre tous les blueprints avec l'application Flask
    
    Args:
        app: Instance Flask
        backend: Instance NotionClipperBackend
    """
    # Stocker le backend dans l'app config pour accès global
    app.config['backend'] = backend
    
    # Enregistrer tous les blueprints
    app.register_blueprint(config_bp, url_prefix='/api')
    app.register_blueprint(content_bp, url_prefix='/api')
    app.register_blueprint(page_bp, url_prefix='/api')
    app.register_blueprint(clipboard_bp, url_prefix='/api')
    app.register_blueprint(stats_bp, url_prefix='/api')
    app.register_blueprint(event_bp, url_prefix='/api')
    
    # Route de santé à la racine de l'API
    @app.route('/api/health')
    def health_check():
        """Health check avec statistiques détaillées"""
        import time
        import sys
        
        status = {
            "status": "healthy",
            "timestamp": time.time(),
            "notion_connected": backend.notion_client is not None,
            "imgbb_configured": backend.imgbb_key is not None,
            "stats": backend.get_stats(),
            "cache": {
                "pages_count": len(backend.cache.get_all_pages()),
                "memory_usage": sys.getsizeof(backend.cache.pages_cache)
            }
        }
        
        # Flags d'onboarding
        try:
            cfg = backend.secure_config.load_config()
            notion_token = cfg.get("notionToken", "")
            imgbb_key = cfg.get("imgbbKey", "")
            
            onboarding_file = backend.app_dir / "notion_onboarding.json"
            onboarding_completed = onboarding_file.exists()
            
            status["firstRun"] = not notion_token
            status["onboardingCompleted"] = onboarding_completed
            
        except Exception as e:
            print(f"Erreur récupération config: {e}")
            status["firstRun"] = True
            status["onboardingCompleted"] = False
        
        return status