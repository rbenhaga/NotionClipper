"""
Routes API pour la gestion des pages Notion
"""

import time
from flask import Blueprint, request, jsonify, current_app

from backend.utils.helpers import ensure_dict, ensure_sync_response

page_bp = Blueprint('page', __name__)


@page_bp.route('/pages')
def get_pages():
    """Récupère les pages depuis le cache, avec option de synchronisation"""
    backend = current_app.config['backend']
    
    try:
        args = request.args or {}
        force_refresh = args.get('force_refresh', 'false').lower() in ('true', '1')
        
        if force_refresh:
            try:
                backend.polling_manager.force_sync()
            except Exception as e:
                print(f"Erreur lors de la synchronisation forcée: {e}")
        
        # Récupérer les pages du cache
        pages = backend.cache.get_all_pages()
        backend.stats_manager.increment('cache_hits')
        
        # Trier par date de modification
        pages.sort(key=lambda x: x.get("last_edited", ""), reverse=True)
        
        return jsonify({
            "pages": pages,
            "count": len(pages),
            "cached": True,
            "timestamp": time.time()
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_pages')
        return jsonify({"error": str(e)}), 500


@page_bp.route('/pages/<page_id>/info')
def get_page_info(page_id):
    """Récupère les informations détaillées d'une page"""
    backend = current_app.config['backend']
    
    try:
        if not backend.notion_client:
            return jsonify({"error": "Notion non configuré"}), 400
        
        # Vérifier d'abord dans le cache
        cached_page = backend.cache.get_page(page_id)
        if cached_page:
            backend.stats_manager.increment('cache_hits')
            return jsonify({
                "type": "page",
                "properties": cached_page.get('properties', {}),
                "title": backend.polling_manager._get_page_title(cached_page),
                "cached": True
            })
        
        backend.stats_manager.increment('cache_misses')
        
        # Vérifier si c'est une base de données
        try:
            db = backend.notion_client.databases.retrieve(page_id)
            db = ensure_dict(db)
            backend.stats_manager.increment('api_calls')
            
            return jsonify({
                "type": "database",
                "properties": db.get('properties', {}),
                "title": db.get('title', [{}])[0].get('plain_text', 'Base de données')
            })
        except:
            # C'est une page normale
            page = backend.notion_client.pages.retrieve(page_id)
            page = ensure_dict(page)
            backend.stats_manager.increment('api_calls')
            
            # Mettre à jour le cache
            backend.cache.add_page(page_id, page)
            
            return jsonify({
                "type": "page",
                "properties": page.get('properties', {}),
                "title": backend.polling_manager._get_page_title(page)
            })
    
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_page_info')
        return jsonify({"error": str(e)}), 500


@page_bp.route('/pages/<page_id>/database', methods=['GET'])
def check_if_database(page_id):
    """Vérifie si une page est une base de données"""
    backend = current_app.config['backend']
    
    try:
        if not backend.notion_client:
            return jsonify({"is_database": False})
        
        try:
            db = backend.notion_client.databases.retrieve(page_id)
            db = ensure_dict(db)
            backend.stats_manager.increment('api_calls')
            
            return jsonify({
                "is_database": True,
                "properties": db.get('properties', {}),
                "title": db.get('title', [{}])[0].get('plain_text', 'Base de données')
            })
        except:
            return jsonify({"is_database": False})
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'check_if_database')
        return jsonify({"error": str(e)}), 500


@page_bp.route('/search', methods=['POST'])
def search_pages():
    """Recherche des pages dans Notion"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({"pages": []})
        
        # Rechercher dans Notion
        pages = backend.search_pages(query)
        
        return jsonify({
            "pages": pages,
            "count": len(pages),
            "query": query
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'search_pages')
        return jsonify({"error": str(e)}), 500


@page_bp.route('/databases', methods=['GET'])
def get_databases():
    """Récupère toutes les bases de données accessibles"""
    backend = current_app.config['backend']
    
    try:
        databases = backend.get_databases()
        
        return jsonify({
            "databases": databases,
            "count": len(databases)
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_databases')
        return jsonify({"error": str(e)}), 500


@page_bp.route('/pages/changes')
def get_changes():
    """Récupère les changements depuis un timestamp"""
    backend = current_app.config['backend']
    
    try:
        since = request.args.get('since', '0')
        timestamp = float(since)
        
        # Récupérer les changements du cache
        changes = backend.cache.get_changes_since(timestamp)
        
        backend.stats_manager.increment('changes_detected', len(changes))
        
        return jsonify({
            "changes": changes,
            "count": len(changes),
            "timestamp": time.time()
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_changes')
        return jsonify({"error": str(e)}), 500


@page_bp.route('/clear_cache', methods=['POST'])
def clear_cache():
    """Vide le cache et force une resynchronisation"""
    backend = current_app.config['backend']
    
    try:
        # Vider le cache
        backend.cache.clear()
        backend.polling_manager.page_checksums.clear()
        
        # Forcer une resync
        if backend.polling_manager.running:
            backend.polling_manager.force_sync()
        
        return jsonify({
            "success": True,
            "message": "Cache vidé et resynchronisation en cours"
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'clear_cache')
        return jsonify({"error": str(e)}), 500