"""
Routes API pour la gestion du presse-papiers
"""

import time
from flask import Blueprint, request, jsonify, current_app

clipboard_bp = Blueprint('clipboard', __name__)


@clipboard_bp.route('/clipboard')
def get_clipboard():
    """Récupère le contenu actuel du presse-papiers"""
    backend = current_app.config['backend']
    
    try:
        clipboard_data = backend.get_clipboard_content()
        
        if clipboard_data:
            backend.stats_manager.increment('clipboard_reads')
            
            # Déterminer le type de contenu
            content_type = 'text'
            if isinstance(clipboard_data, dict):
                if 'image' in clipboard_data:
                    content_type = 'image'
                elif 'files' in clipboard_data:
                    content_type = 'files'
            
            # Pour le texte, détecter le type spécifique
            if content_type == 'text' and isinstance(clipboard_data, str):
                # Détecter tableau
                if '\t' in clipboard_data and '\n' in clipboard_data:
                    lines = clipboard_data.split('\n')
                    if len(lines) > 1:
                        first_tabs = lines[0].count('\t')
                        if all(line.count('\t') == first_tabs for line in lines if line):
                            content_type = 'table'
                
                # Détecter JSON
                if clipboard_data.strip().startswith('{') or clipboard_data.strip().startswith('['):
                    try:
                        import json
                        json.loads(clipboard_data)
                        content_type = 'json'
                    except:
                        pass
                
                # Détecter code
                code_patterns = [
                    'function ', 'const ', 'let ', 'var ', 'class ',
                    'import ', 'export ', 'def ', 'if ', 'for '
                ]
                if any(pattern in clipboard_data for pattern in code_patterns):
                    content_type = 'code'
            
            # Calculer les infos de blocs
            blocks_info = backend.calculate_blocks_info(
                clipboard_data if isinstance(clipboard_data, str) else str(clipboard_data),
                content_type
            )
            
            return jsonify({
                "clipboard": {
                    "content": clipboard_data,
                    "type": content_type,
                    "timestamp": time.time(),
                    "length": len(str(clipboard_data)),
                    "blocks_info": blocks_info
                }
            })
        else:
            return jsonify({
                "clipboard": None,
                "message": "Presse-papiers vide"
            })
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_clipboard')
        return jsonify({"error": str(e)}), 500


@clipboard_bp.route('/clipboard/clear', methods=['POST'])
def clear_clipboard():
    """Vide le presse-papiers"""
    backend = current_app.config['backend']
    
    try:
        backend.clear_clipboard()
        backend.stats_manager.increment('clipboard_clears')
        
        return jsonify({
            "success": True,
            "message": "Presse-papiers vidé"
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'clear_clipboard')
        return jsonify({"error": str(e)}), 500


@clipboard_bp.route('/clipboard/calculate-blocks', methods=['POST'])
def calculate_blocks():
    """Calcule le nombre de blocs nécessaires pour le contenu"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        content = data.get('content', '')
        content_type = data.get('contentType', 'text')
        
        # Utiliser la méthode existante
        blocks_info = backend.calculate_blocks_info(content, content_type)
        
        return jsonify({
            "success": True,
            **blocks_info
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@clipboard_bp.route('/clipboard/upload-image', methods=['POST'])
def upload_clipboard_image():
    """Upload une image du presse-papiers vers ImgBB"""
    backend = current_app.config['backend']
    
    try:
        if not backend.imgbb_key:
            return jsonify({
                "error": "ImgBB non configuré"
            }), 400
        
        # Récupérer l'image du presse-papiers
        clipboard_data = backend.get_clipboard_content()
        
        if not clipboard_data or not isinstance(clipboard_data, dict) or 'image' not in clipboard_data:
            return jsonify({
                "error": "Aucune image dans le presse-papiers"
            }), 400
        
        # Upload vers ImgBB
        image_url = backend.upload_image_to_imgbb(clipboard_data['image'])
        
        if image_url:
            backend.stats_manager.increment('images_uploaded')
            
            return jsonify({
                "success": True,
                "url": image_url
            })
        else:
            return jsonify({
                "error": "Échec de l'upload"
            }), 500
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'upload_clipboard_image')
        return jsonify({"error": str(e)}), 500


@clipboard_bp.route('/clipboard/preview', methods=['POST'])
def update_clipboard_preview():
    """Met à jour la page de preview avec le contenu fourni"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        
        # Utiliser le contenu envoyé par le frontend
        content = data.get('content')
        content_type = data.get('contentType', 'text')
        parse_as_markdown = data.get('parseAsMarkdown', True)
        
        # Si aucun contenu n'est fourni, utiliser le presse-papiers
        if not content:
            clipboard_data = backend.get_clipboard_content()
            if isinstance(clipboard_data, str):
                content = clipboard_data
            else:
                return jsonify({
                    "success": False,
                    "error": "Aucun contenu à prévisualiser"
                }), 400
        
        # Récupérer l'ID de la page de preview
        config = backend.secure_config.load_config()
        preview_page_id = config.get('previewPageId')
        
        if not preview_page_id:
            return jsonify({
                "success": False,
                "error": "Aucune page de prévisualisation configurée"
            }), 400
        
        # Traiter le contenu avec les paramètres fournis
        blocks = backend.process_content(
            content=content,
            content_type=content_type,
            parse_markdown=parse_as_markdown
        )
        
        # Mettre à jour la page de preview
        success = backend.update_preview_page(preview_page_id, blocks)
        
        if success:
            backend.stats_manager.increment('preview_updates')
            return jsonify({
                "success": True,
                "message": "Prévisualisation mise à jour",
                "blocksCount": len(blocks)
            })
        else:
            return jsonify({
                "success": False,
                "error": "Erreur lors de la mise à jour de la prévisualisation"
            }), 500
            
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'update_clipboard_preview')
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@clipboard_bp.route('/clipboard/history')
def get_clipboard_history():
    """Récupère l'historique du presse-papiers (si disponible)"""
    backend = current_app.config['backend']
    
    try:
        # Pour l'instant, retourner juste le contenu actuel
        # Une vraie implémentation pourrait stocker un historique
        current = backend.get_clipboard_content()
        
        history = []
        if current:
            history.append({
                "content": current,
                "timestamp": time.time(),
                "type": "text" if isinstance(current, str) else "other"
            })
        
        return jsonify({
            "history": history,
            "count": len(history)
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_clipboard_history')
        return jsonify({"error": str(e)}), 500