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
        page_ids = data.get('pageIds')
        page_id = data.get('pageId')

        # Récupérer les propriétés si fournies
        properties = data.get('properties', {})
        page_properties = data.get('pageProperties', {})

        # Logger pour debug
        print(f"Properties reçues: {properties}")
        print(f"Page properties: {page_properties}")

        if page_ids:
            # Envoi multiple
            results = []
            for pid in page_ids:
                single_data = data.copy()
                single_data['pageId'] = pid
                blocks = backend.process_content(
                    content=single_data.get('content', ''),
                    content_type=single_data.get('contentType', 'text'),
                    parse_markdown=single_data.get('parseAsMarkdown', True),
                    properties=properties  # Ajouter les propriétés
                )
                result = backend.send_to_notion(pid, blocks, properties=properties, page_properties=page_properties)
                results.append({
                    'pageId': pid,
                    'success': result['success'],
                    'error': result.get('error')
                })
            successful = sum(1 for r in results if r['success'])
            return jsonify({
                "success": successful > 0,
                "results": results,
                "message": f"Envoyé vers {successful}/{len(page_ids)} pages"
            })
        elif page_id:
            # Envoi simple
            blocks = backend.process_content(
                content=data.get('content', ''),
                content_type=data.get('contentType', 'text'),
                parse_markdown=data.get('parseAsMarkdown', True),
                properties=properties  # Ajouter les propriétés
            )
            result = backend.send_to_notion(page_id, blocks, properties=properties, page_properties=page_properties)  # Transmettre les propriétés
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
        else:
            return jsonify({"error": "pageId ou pageIds requis"}), 400
    except Exception as e:
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
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if not preview_page_id:
            return jsonify({
                "success": False,
                "error": "Aucune page de prévisualisation configurée"
            })
        
        # Construire l'URL publique Notion (format notion.site si possible)
        # Si l'utilisateur a fourni une URL publique, l'utiliser
        preview_page_url = config.get('previewPageUrl')
        if preview_page_url and preview_page_url.startswith('http'):
            preview_url = preview_page_url
        else:
            # Fallback : utiliser le format www.notion.so/<pageid>
            page_id_formatted = preview_page_id.replace('-', '')
            preview_url = f"https://www.notion.so/{page_id_formatted}"
        
        return jsonify({
            "success": True,
            "url": preview_url,
            "pageId": preview_page_id
        })
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_preview_url')
        return jsonify({"error": str(e)}), 500

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