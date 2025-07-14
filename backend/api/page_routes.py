"""
Routes API pour la gestion des pages Notion
"""

import time
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin

from backend.utils.helpers import ensure_dict, ensure_sync_response, extract_notion_page_title, normalize_notion_date

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
            title = extract_notion_page_title(page)
            
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
            title = extract_notion_page_title(page)
            
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
        # Utiliser datetime.now() avec timezone pour éviter les erreurs de comparaison
        from datetime import timezone
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        for page in all_pages:
            try:
                # Parser la date de dernière modification
                last_edited = page.get('last_edited_time', '')
                if last_edited:
                    # Normaliser la date pour éviter les erreurs timezone
                    normalized_date = normalize_notion_date(last_edited)
                    page_date = datetime.fromisoformat(normalized_date)
                    
                    # Si modifiée récemment
                    if page_date > seven_days_ago:
                        # Enrichir avec le titre
                        page_copy = page.copy()
                        title = extract_notion_page_title(page)
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
            title = extract_notion_page_title(page)
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


@page_bp.route('/validate-notion-page', methods=['POST', 'OPTIONS'])
@cross_origin(origins=['http://localhost:3000'], methods=['POST', 'OPTIONS'])
def validate_notion_page():
    """Valide qu'une page Notion est accessible et publique"""
    if request.method == 'OPTIONS':
        return '', 204
    
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        page_url = data.get('pageUrl', '').strip()
        page_id = data.get('pageId', '').strip()
        
        # Extraire l'ID de la page depuis l'URL si non fourni
        if not page_id and page_url:
            import re
            patterns = [
                r'notion\.so/[^/]+/([a-f0-9]{32})',
                r'notion\.so/([a-f0-9]{32})',
                r'([a-f0-9]{32})$'
            ]
            for pattern in patterns:
                match = re.search(pattern, page_url)
                if match:
                    page_id = match.group(1)
                    break
        
        if not page_id:
            return jsonify({
                "valid": False,
                "message": "URL invalide. Veuillez fournir une URL de page Notion valide."
            })
        
        # Formater l'ID correctement (ajouter les tirets si nécessaire)
        if len(page_id) == 32 and '-' not in page_id:
            page_id = f"{page_id[:8]}-{page_id[8:12]}-{page_id[12:16]}-{page_id[16:20]}-{page_id[20:]}"
        
        # Vérifier si le client Notion est configuré
        if not backend.notion_client:
            return jsonify({
                "valid": False,
                "message": "Client Notion non configuré. Veuillez d'abord configurer votre token."
            })
        
        # Juste vérifier que l'ID est valide et retourner success
        if page_id and len(page_id) in [32, 36]:  # 32 sans tirets, 36 avec
            return jsonify({
                "valid": True,
                "message": "Page configurée. Assurez-vous qu'elle est publique dans Notion."
            })
        else:
            return jsonify({
                "valid": False,
                "message": "Format d'ID de page invalide"
            })
    except Exception as e:
        return jsonify({
            "valid": False,
            "message": f"Erreur serveur: {str(e)}"
        }), 500

@page_bp.route('/check-page-public/<page_id>')
def check_page_public_status(page_id):
    """Vérifie uniquement si une page est publique"""
    try:
        import requests
        clean_id = page_id.replace('-', '')
        public_url = f"https://notion.so/{clean_id}"
        try:
            response = requests.head(public_url, timeout=3, allow_redirects=True)
            is_public = response.status_code in [200, 301, 302]
            return jsonify({
                "pageId": page_id,
                "isPublic": is_public,
                "publicUrl": public_url if is_public else None
            })
        except:
            return jsonify({
                "pageId": page_id,
                "isPublic": False,
                "error": "Impossible de vérifier le statut public"
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@page_bp.route('/notion/supported-properties')
def get_supported_properties():
    """Retourne les propriétés supportées par l'API Notion"""
    supported_properties = {
        "database_properties": {
            "title": {"type": "title", "description": "Titre de la page"},
            "rich_text": {"type": "rich_text", "description": "Texte enrichi"},
            "number": {"type": "number", "description": "Nombre"},
            "select": {"type": "select", "description": "Sélection unique"},
            "multi_select": {"type": "multi_select", "description": "Sélection multiple"},
            "date": {"type": "date", "description": "Date"},
            "checkbox": {"type": "checkbox", "description": "Case à cocher"},
            "url": {"type": "url", "description": "URL"},
            "email": {"type": "email", "description": "Email"},
            "phone_number": {"type": "phone_number", "description": "Téléphone"},
            "formula": {"type": "formula", "description": "Formule (lecture seule)"},
            "relation": {"type": "relation", "description": "Relation"},
            "rollup": {"type": "rollup", "description": "Rollup (lecture seule)"},
            "created_time": {"type": "created_time", "description": "Date de création (auto)"},
            "created_by": {"type": "created_by", "description": "Créé par (auto)"},
            "last_edited_time": {"type": "last_edited_time", "description": "Dernière modification (auto)"},
            "last_edited_by": {"type": "last_edited_by", "description": "Modifié par (auto)"}
        },
        "page_properties": {
            "icon": {"supported": True, "types": ["emoji", "external_url"]},
            "cover": {"supported": True, "types": ["external_url"]},
            "archived": {"supported": True, "type": "boolean"}
        },
        "unsupported_in_ui": [
            "formula", "rollup", "created_time", "created_by", 
            "last_edited_time", "last_edited_by", "files"
        ]
    }
    return jsonify(supported_properties)

@page_bp.route('/databases/<database_id>/schema')
def get_database_schema(database_id):
    """Récupère le schéma des propriétés d'une base de données"""
    backend = current_app.config['backend']
    try:
        if not backend.notion_client:
            return jsonify({"error": "Notion non configuré"}), 400
        db = backend.notion_client.databases.retrieve(database_id)
        properties = db.get('properties', {})
        # Simplifier le schéma pour le frontend
        schema = {}
        for name, config in properties.items():
            schema[name] = {
                'type': config['type'],
                'name': name,
                'id': config.get('id'),
                'options': config.get(config['type'], {}).get('options', [])
                    if config['type'] in ['select', 'multi_select'] else None
            }
        return jsonify({
            "success": True,
            "schema": schema,
            "title": db.get('title', [{}])[0].get('plain_text', 'Base de données')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@page_bp.route('/pages/<page_id>/type-info')
def get_page_type_info(page_id):
    """Obtient les informations de type pour une page"""
    backend = current_app.config['backend']
    try:
        page = backend.notion_client.pages.retrieve(page_id)
        page = ensure_dict(page)
        parent = page.get('parent', {})
        
        # Vérifier si c'est un item de base de données
        if parent.get('type') == 'database_id':
            database_id = parent['database_id']
            db = backend.notion_client.databases.retrieve(database_id)
            db = ensure_dict(db)
            
            # Formater correctement les propriétés avec leurs options
            formatted_properties = {}
            for prop_name, prop_config in db.get('properties', {}).items():
                prop_type = prop_config.get('type')
                formatted_prop = {
                    'type': prop_type,
                    'name': prop_config.get('name', prop_name),
                    'id': prop_config.get('id')
                }
                # Récupérer les options selon le type
                if prop_type == 'select':
                    formatted_prop['options'] = prop_config.get('select', {}).get('options', [])
                elif prop_type == 'multi_select':
                    formatted_prop['options'] = prop_config.get('multi_select', {}).get('options', [])
                elif prop_type == 'status':
                    formatted_prop['options'] = prop_config.get('status', {}).get('options', [])
                formatted_properties[prop_name] = formatted_prop
            
            return jsonify({
                "type": "database_item",
                "database_id": database_id,
                "database_title": db.get('title', [{}])[0].get('plain_text', ''),
                "properties": formatted_properties,
                "current_values": page.get('properties', {})
            })
        else:
            return jsonify({
                "type": "page",
                "parent_type": parent.get('type'),
                "has_icon": bool(page.get('icon')),
                "has_cover": bool(page.get('cover'))
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500