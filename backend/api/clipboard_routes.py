"""
Routes API pour la gestion du presse-papiers
"""

import time
from flask import Blueprint, request, jsonify, current_app

from backend.utils.helpers import ensure_dict, ensure_sync_response

clipboard_bp = Blueprint('clipboard', __name__)


@clipboard_bp.route('/clipboard')
def get_clipboard():
    """Récupère le contenu du presse-papiers"""
    backend = current_app.config['backend']
    
    try:
        content = backend.clipboard_manager.get_content()
        
        # Incrémenter les stats si du contenu est trouvé
        if content.get('content'):
            backend.stats_manager.increment('content_processed')
            backend.stats_manager.record_content_type(content.get('type', 'text'))
        
        return jsonify(content)
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_clipboard')
        return jsonify({"error": str(e)}), 500


@clipboard_bp.route('/preview/url', methods=['GET'])
def get_preview_url():
    """Récupère l'URL de la page preview"""
    backend = current_app.config['backend']
    
    try:
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if not preview_page_id:
            return jsonify({"error": "Page preview non configurée"}), 404
        
        # Récupérer les infos de la page pour avoir l'URL
        if backend.notion_client:
            try:
                page = backend.notion_client.pages.retrieve(preview_page_id)
                page = ensure_sync_response(page)
                page = ensure_dict(page)
                
                backend.stats_manager.increment('api_calls')
                
                return jsonify({
                    "success": True,
                    "pageId": preview_page_id,
                    "url": page.get("url", f"https://www.notion.so/{preview_page_id.replace('-', '')}")
                })
                
            except Exception as e:
                print(f"Erreur récupération page: {e}")
                # URL par défaut si on ne peut pas récupérer la page
                return jsonify({
                    "success": True,
                    "pageId": preview_page_id,
                    "url": f"https://www.notion.so/{preview_page_id.replace('-', '')}"
                })
        
        # Si pas de client Notion, retourner l'URL par défaut
        return jsonify({
            "success": True,
            "pageId": preview_page_id,
            "url": f"https://www.notion.so/{preview_page_id.replace('-', '')}"
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_preview_url')
        return jsonify({"error": str(e)}), 500


@clipboard_bp.route('/preview/update', methods=['POST'])
def update_clipboard_preview():
    """Met à jour la page de preview avec le contenu du presse-papiers"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        
        # Récupérer la configuration
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if not preview_page_id:
            return jsonify({
                "success": False,
                "error": "Page preview non configurée"
            }), 400
        
        # Récupérer le contenu
        content = data.get('content')
        content_type = data.get('contentType', 'mixed')
        
        if not content:
            # Si pas de contenu fourni, utiliser le presse-papiers
            clipboard_data = backend.clipboard_manager.get_content()
            content = clipboard_data.get('content', '')
            content_type = clipboard_data.get('type', 'mixed')
            
            if not content:
                return jsonify({
                    "success": False,
                    "error": "Aucun contenu à prévisualiser"
                }), 400
        
        # Vider d'abord la page preview
        try:
            # Récupérer les blocs existants
            blocks = backend.notion_client.blocks.children.list(preview_page_id)
            blocks = ensure_sync_response(blocks)
            blocks = ensure_dict(blocks)
            
            # Supprimer tous les blocs existants
            for block in blocks.get('results', []):
                try:
                    backend.notion_client.blocks.delete(block['id'])
                except Exception as e:
                    print(f"Erreur suppression bloc: {e}")
                    
        except Exception as e:
            print(f"Erreur lors du nettoyage de la page preview: {e}")
        
        # Traiter le nouveau contenu
        blocks = backend.process_content(
            content=content,
            content_type=content_type,
            parse_markdown=True
        )
        
        # Ajouter un header avec timestamp
        header_block = {
            "type": "callout",
            "callout": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": f"📋 Preview - {time.strftime('%Y-%m-%d %H:%M:%S')}"}
                }],
                "icon": {"emoji": "📋"},
                "color": "blue_background"
            }
        }
        blocks.insert(0, header_block)
        
        # Envoyer à la page preview
        result = backend.send_to_notion(preview_page_id, blocks)
        
        if result['success']:
            backend.stats_manager.increment('preview_updates')
            
            # Forcer la mise à jour du cache pour cette page
            if backend.notion_client:
                try:
                    page = backend.notion_client.pages.retrieve(preview_page_id)
                    page = ensure_sync_response(page)
                    page = ensure_dict(page)
                    formatted = backend._format_page_data(page)
                    backend.cache.update_page(preview_page_id, formatted)
                except Exception as e:
                    print(f"Erreur mise à jour cache preview: {e}")
            
            return jsonify({
                "success": True,
                "pageId": preview_page_id,
                "blocksCount": result.get('blocksCount', len(blocks)),
                "timestamp": time.time()
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Erreur lors de la mise à jour')
            }), 500
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'update_preview')
        return jsonify({"error": str(e)}), 500

@clipboard_bp.route('/clipboard/preview', methods=['POST'])
def update_preview():
    """Met à jour le contenu de la page preview"""
    backend = current_app.config['backend']
    
    try:
        # Récupérer le contenu actuel du presse-papiers
        clipboard_content = backend.clipboard_manager.get_content()
        
        if not clipboard_content.get('content'):
            return jsonify({
                "success": False,
                "error": "Aucun contenu dans le presse-papiers"
            }), 400
        
        # Récupérer l'ID de la page preview
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if not preview_page_id:
            return jsonify({
                "success": False,
                "error": "Page preview non configurée"
            }), 404
        
        # Préparer le contenu pour Notion
        content_type = clipboard_content.get('type', 'text')
        content = clipboard_content.get('content', '')
        
        # Traiter le contenu
        blocks = backend.process_content(
            content=content,
            content_type=content_type,
            parse_markdown=True
        )
        
        # Envoyer à la page preview
        result = backend.send_to_notion(preview_page_id, blocks)
        
        if result['success']:
            backend.stats_manager.increment('preview_updates')
            return jsonify({
                "success": True,
                "pageId": preview_page_id,
                "blocksCount": result.get('blocksCount', len(blocks))
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Erreur lors de la mise à jour')
            }), 500
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'update_preview')
        return jsonify({"error": str(e)}), 500