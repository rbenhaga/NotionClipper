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
            content_type = clipboard_data.get('type', 'text')
        
        if not content:
            return jsonify({
                "success": False,
                "error": "Aucun contenu à prévisualiser"
            }), 400
        
        # Traiter le contenu
        blocks = backend.process_content(
            content=content,
            content_type=content_type,
            parse_markdown=True,
            use_advanced_parser=True
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
        
        # Mettre à jour la page
        success = backend.update_preview_page(preview_page_id, blocks)
        
        if success:
            backend.stats_manager.increment('successful_sends')
            
            return jsonify({
                "success": True,
                "message": "Preview mise à jour",
                "blocksCount": len(blocks)
            })
        else:
            backend.stats_manager.increment('failed_sends')
            
            return jsonify({
                "success": False,
                "error": "Erreur lors de la mise à jour"
            }), 500
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'update_clipboard_preview')
        return jsonify({"error": str(e)}), 500