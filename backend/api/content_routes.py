"""
Routes API pour l'envoi de contenu vers Notion
"""

import json
from flask import Blueprint, request, jsonify, current_app
import threading

content_bp = Blueprint('content', __name__)


@content_bp.route('/send', methods=['POST', 'OPTIONS'])
def send_to_notion():
    """Route principale pour envoyer du contenu vers Notion"""
    # Gérer les requêtes OPTIONS pour CORS
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, x-notion-token')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        
        # Extraire les paramètres
        page_id = data.get('page_id') or data.get('pageId')
        content = data.get('content', '')
        content_type = data.get('contentType', 'text')
        parse_as_markdown = data.get('parseAsMarkdown', True)
        source_url = data.get('sourceUrl')
        title = data.get('title')
        tags = data.get('tags', [])
        
        if not page_id:
            return jsonify({"error": "page_id requis"}), 400
        
        if not content:
            return jsonify({"error": "Contenu vide"}), 400
        
        # Traiter le contenu
        blocks = backend.process_content(
            content=content,
            content_type=content_type,
            parse_markdown=parse_as_markdown
        )
        
        # Ajouter un titre si fourni
        if title:
            title_block = {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": title}
                    }]
                }
            }
            blocks.insert(0, title_block)
        
        # Ajouter la source si fournie
        if source_url:
            source_block = {
                "object": "block",
                "type": "callout",
                "callout": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": f"Source: {source_url}"}
                    }],
                    "icon": {"emoji": "🔗"}
                }
            }
            blocks.append(source_block)
        
        # Envoyer à Notion
        result = backend.send_to_notion(page_id, blocks)
        
        if result['success']:
            backend.stats_manager.increment('successful_sends')
            
            # Tout en arrière-plan
            def update_async():
                try:
                    # Update cache
                    backend.polling_manager.update_single_page(page_id)
                    # Update preview si configurée
                    config = backend.secure_config.load_config()
                    preview_page_id = config.get('previewPageId')
                    if preview_page_id:
                        backend.update_preview_page(preview_page_id, blocks)
                except:
                    pass
            thread = threading.Thread(target=update_async, daemon=True)
            thread.start()
            
            # Retour immédiat
            return jsonify({
                "success": True,
                "message": "Contenu envoyé avec succès",
                "blocksCount": result.get('blocksCount', len(blocks))
            })
        else:
            backend.stats_manager.increment('failed_sends')
            
            return jsonify({
                "success": False,
                "error": result.get('error', 'Erreur inconnue')
            }), 500
            
    except Exception as e:
        backend.stats_manager.increment('failed_sends')
        backend.stats_manager.record_error(str(e), 'send_to_notion')
        
        return jsonify({"error": str(e)}), 500

@content_bp.route('/preview', methods=['POST'])
def update_preview():
    """Met à jour la page de prévisualisation avec le contenu actuel"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        content = data.get('content', '')
        content_type = data.get('contentType', 'text')
        parse_as_markdown = data.get('parseAsMarkdown', True)
        
        # Récupérer l'ID de la page de preview depuis la config
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if not preview_page_id:
            return jsonify({
                "success": False,
                "error": "Aucune page de prévisualisation configurée"
            }), 400
        
        # Traiter le contenu
        blocks = backend.process_content(
            content=content,
            content_type=content_type,
            parse_markdown=parse_as_markdown
        )
        
        # Mettre à jour la page de preview
        success = backend.update_preview_page(preview_page_id, blocks)
        
        if success:
            return jsonify({
                "success": True,
                "message": "Prévisualisation mise à jour"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Erreur lors de la mise à jour de la prévisualisation"
            }), 500
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'update_preview')
        return jsonify({"error": str(e)}), 500


@content_bp.route('/preview/url', methods=['GET'])
def get_preview_url():
    """Retourne l'URL de la page de prévisualisation"""
    backend = current_app.config['backend']
    
    try:
        # Récupérer l'URL depuis la requête
        url = request.args.get('url')
        
        # Charger la configuration pour vérifier si une page de preview existe
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if preview_page_id and url:
            return jsonify({
                "success": True,
                "url": url  # Utiliser "url" au lieu de "previewUrl"
            })
        else:
            return jsonify({
                "success": False,
                "url": None,
                "message": "Aucune page de preview configurée"
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@content_bp.route('/clear-cache', methods=['POST'])
def clear_cache_alias():
    """Alias pour /clear_cache pour compatibilité frontend"""
    backend = current_app.config['backend']
    
    try:
        # Vider le cache
        backend.cache.clear()
        
        # Forcer une resynchronisation
        if backend.polling_manager:
            backend.polling_manager.force_sync()
        
        backend.stats_manager.increment('cache_cleared')
        
        return jsonify({
            'success': True,
            'message': 'Cache vidé avec succès'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@content_bp.route('/process', methods=['POST'])
def process_content():
    """Traite du contenu sans l'envoyer (pour preview)"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        content = data.get('content', '')
        content_type = data.get('contentType', 'text')
        parse_as_markdown = data.get('parseAsMarkdown', True)
        
        # Traiter le contenu
        blocks = backend.process_content(
            content=content,
            content_type=content_type,
            parse_markdown=parse_as_markdown
        )
        
        return jsonify({
            "success": True,
            "blocks": blocks,
            "count": len(blocks)
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'process_content')
        return jsonify({"error": str(e)}), 500