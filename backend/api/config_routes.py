"""
Routes API pour la gestion de la configuration
"""

from flask import Blueprint, request, jsonify, current_app

config_bp = Blueprint('config', __name__)


@config_bp.route('/config', methods=['GET'])
def get_config():
    """Récupère la configuration actuelle"""
    backend = current_app.config['backend']
    
    try:
        config = backend.secure_config.load_config()
        
        # Masquer les données sensibles
        safe_config = config.copy()
        for field in ['notionToken', 'imgbbKey']:
            if field in safe_config and safe_config[field]:
                safe_config[field] = '*' * 8 + safe_config[field][-4:]
        
        return jsonify({
            "success": True,
            "config": safe_config,
            "connected": backend.notion_client is not None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config', methods=['POST'])
def update_config():
    """Met à jour la configuration"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        
        # Valider les données
        if not isinstance(data, dict):
            return jsonify({"error": "Format invalide"}), 400
        
        # Mettre à jour la configuration
        result = backend.update_config(data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config/reset', methods=['POST'])
def reset_config():
    """Réinitialise la configuration"""
    backend = current_app.config['backend']
    
    try:
        # Réinitialiser la configuration
        backend.secure_config.reset_config()
        
        # Réinitialiser les services
        backend.notion_client = None
        backend.imgbb_key = None
        backend.polling_manager.stop()
        
        return jsonify({
            "success": True,
            "message": "Configuration réinitialisée"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config/preferences', methods=['GET'])
def get_preferences():
    """Récupère les préférences utilisateur"""
    backend = current_app.config['backend']
    
    try:
        preferences = backend.secure_config.load_preferences()
        
        return jsonify({
            "success": True,
            "preferences": preferences
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config/preferences', methods=['POST'])
def update_preferences():
    """Met à jour les préférences utilisateur"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        
        # Sauvegarder les préférences
        backend.secure_config.save_preferences(data)
        
        return jsonify({
            "success": True,
            "message": "Préférences mises à jour"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@config_bp.route('/check_updates', methods=['GET'])
def check_updates():
    """Vérifie les mises à jour disponibles"""
    # TODO: Implémenter la vérification réelle des mises à jour
    return jsonify({
        "updateAvailable": False,
        "currentVersion": "3.0.0",
        "latestVersion": "3.0.0"
    })