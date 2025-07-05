"""
Routes API pour la gestion des pages Notion
"""

import time
from datetime import datetime, timedelta
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
        
        # Enrichir chaque page avec son titre et icône
        enriched_pages = []
        for page in pages:
            page_copy = page.copy()
            
            # Extraire le titre depuis les propriétés
            title = "Sans titre"
            if 'properties' in page:
                # Titre depuis property "title" ou "Name"
                title_prop = page['properties'].get('title') or page['properties'].get('Name')
                if title_prop and 'title' in title_prop and len(title_prop['title']) > 0:
                    title = title_prop['title'][0].get('plain_text', 'Sans titre')
            
            page_copy['title'] = title
            
            # S'assurer que l'icône est présente
            if 'icon' not in page_copy:
                page_copy['icon'] = None
                
            enriched_pages.append(page_copy)
        
        # Trier par date de modification
        enriched_pages.sort(key=lambda x: x.get("last_edited", ""), reverse=True)
        
        return jsonify({
            "pages": enriched_pages,
            "count": len(enriched_pages),
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
            return jsonify(ensure_sync_response(cached_page))
        
        # Sinon récupérer depuis Notion
        page = backend.notion_client.pages.retrieve(page_id)
        page = ensure_dict(page)
        backend.stats_manager.increment('api_calls')
        
        # Mettre en cache
        backend.cache.set_page(page_id, page)
        
        return jsonify(ensure_sync_response(page))
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_page_info')
        return jsonify({"error": str(e)}), 500


@page_bp.route('/pages/<page_id>/check-database')
def check_if_database(page_id):
    """Vérifie si une page est une base de données"""
    backend = current_app.config['backend']
    
    try:
        if not backend.notion_client:
            return jsonify({"error": "Notion non configuré"}), 400
        
        # Essayer de récupérer comme base de données
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
        
        # Rechercher dans le cache d'abord
        pages = backend.cache.get_all_pages()
        query_lower = query.lower()
        
        # Filtrer les pages par le titre
        filtered_pages = []
        for page in pages:
            # Extraire le titre depuis les propriétés
            title = "Sans titre"
            if 'properties' in page:
                title_prop = page['properties'].get('title') or page['properties'].get('Name')
                if title_prop and 'title' in title_prop and len(title_prop['title']) > 0:
                    title = title_prop['title'][0].get('plain_text', 'Sans titre')
            
            # Vérifier si le titre correspond à la recherche
            if query_lower in title.lower():
                page_copy = page.copy()
                page_copy['title'] = title
                page_copy['icon'] = page.get('icon')
                filtered_pages.append(page_copy)
        
        # Limiter à 20 résultats
        filtered_pages = filtered_pages[:20]
        
        return jsonify({
            "pages": filtered_pages,
            "count": len(filtered_pages),
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


@page_bp.route('/pages/suggestions')
def get_suggestions():
    """Récupère des suggestions de pages basées sur l'activité récente"""
    backend = current_app.config['backend']
    
    try:
        # Récupérer toutes les pages
        all_pages = backend.cache.get_all_pages()
        
        # Pour les suggestions, on prend les pages modifiées récemment
        suggestions = []
        
        # Filtrer les pages modifiées dans les 7 derniers jours
        seven_days_ago = datetime.now() - timedelta(days=7)
        
        for page in all_pages:
            try:
                # Parser la date de dernière modification
                last_edited = page.get('last_edited_time', '')
                if last_edited:
                    # Convertir en datetime (format ISO)
                    page_date = datetime.fromisoformat(last_edited.replace('Z', '+00:00'))
                    
                    # Si modifiée récemment
                    if page_date > seven_days_ago:
                        # Enrichir avec le titre
                        page_copy = page.copy()
                        title = "Sans titre"
                        if 'properties' in page:
                            title_prop = page['properties'].get('title') or page['properties'].get('Name')
                            if title_prop and 'title' in title_prop and len(title_prop['title']) > 0:
                                title = title_prop['title'][0].get('plain_text', 'Sans titre')
                        page_copy['title'] = title
                        page_copy['icon'] = page.get('icon')
                        suggestions.append(page_copy)
            except Exception as e:
                print(f"Erreur parsing date pour page {page.get('id')}: {e}")
                continue
        
        # Trier par date de modification (plus récent en premier)
        suggestions.sort(key=lambda x: x.get('last_edited_time', ''), reverse=True)
        
        # Limiter à 10 suggestions
        suggestions = suggestions[:10]
        
        return jsonify({
            "pages": suggestions,
            "count": len(suggestions)
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_suggestions')
        return jsonify({"error": str(e)}), 500


@page_bp.route('/pages/recent')
def get_recent():
    """Récupère les pages récemment modifiées"""
    backend = current_app.config['backend']
    
    try:
        # Récupérer toutes les pages
        all_pages = backend.cache.get_all_pages()
        
        # Trier par date de modification
        all_pages.sort(key=lambda x: x.get('last_edited_time', ''), reverse=True)
        
        # Prendre les 20 plus récentes et les enrichir
        recent_pages = []
        for page in all_pages[:20]:
            page_copy = page.copy()
            title = "Sans titre"
            if 'properties' in page:
                title_prop = page['properties'].get('title') or page['properties'].get('Name')
                if title_prop and 'title' in title_prop and len(title_prop['title']) > 0:
                    title = title_prop['title'][0].get('plain_text', 'Sans titre')
            page_copy['title'] = title
            page_copy['icon'] = page.get('icon')
            recent_pages.append(page_copy)
        
        return jsonify({
            "pages": recent_pages,
            "count": len(recent_pages)
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_recent')
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