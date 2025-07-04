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


@config_bp.route('/validate-notion-token', methods=['POST'])
def validate_notion_token():
    """Valide un token Notion"""
    backend = current_app.config['backend']
    
    try:
        data = request.json
        token = data.get('token', '')
        
        if not token:
            return jsonify({
                'valid': False,
                'message': 'Token manquant'
            }), 400
        
        # Tester le token en créant un client temporaire
        from notion_client import Client
        test_client = Client(auth=token)
        
        try:
            # Tester avec une recherche simple
            response = test_client.search(
                filter={"property": "object", "value": "page"},
                page_size=5
            )
            
            pages_count = len(response.get('results', []))
            
            return jsonify({
                'valid': True,
                'pages_count': pages_count,
                'message': f'Connexion réussie ! {pages_count} pages trouvées.'
            })
            
        except Exception as e:
            error_msg = str(e).lower()
            if 'unauthorized' in error_msg or 'invalid' in error_msg:
                return jsonify({
                    'valid': False,
                    'message': 'Token invalide ou expiré'
                })
            else:
                return jsonify({
                    'valid': False,
                    'message': f'Erreur de connexion: {str(e)}'
                })
                
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 500


@config_bp.route('/validate-notion-page', methods=['POST'])
def validate_notion_page():
    """Valide qu'une page Notion est publique"""
    backend = current_app.config['backend']
    
    try:
        data = request.json
        page_url = data.get('pageUrl', '')
        page_id = data.get('pageId', '')
        
        if not page_url or not page_id:
            return jsonify({
                'valid': False,
                'message': 'URL ou ID de page manquant'
            }), 400
        
        # Vérifier si la page est accessible publiquement
        import requests
        
        try:
            # Tester l'accès à la page publique
            response = requests.get(f'https://notion.so/{page_id}', timeout=10)
            
            if response.status_code == 200:
                return jsonify({
                    'valid': True,
                    'message': 'Page Notion valide et publique !'
                })
            else:
                return jsonify({
                    'valid': False,
                    'message': 'La page n\'est pas publique. Rendez-la publique dans les paramètres de partage.'
                })
                
        except requests.exceptions.RequestException:
            return jsonify({
                'valid': False,
                'message': 'Impossible de vérifier la page. Assurez-vous qu\'elle est publique.'
            })
            
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 500


@config_bp.route('/onboarding/complete', methods=['POST'])
def complete_onboarding():
    """Marque l'onboarding comme complété"""
    backend = current_app.config['backend']
    
    try:
        # Charger la config actuelle
        current_config = backend.secure_config.load_config()
        
        # Marquer comme complété
        current_config['onboardingCompleted'] = True
        
        # Sauvegarder
        backend.secure_config.save_config(current_config)
        
        return jsonify({
            'success': True,
            'message': 'Onboarding complété'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@config_bp.route('/clear-cache', methods=['POST'])
def clear_cache():
    """Vide le cache"""
    backend = current_app.config['backend']
    
    try:
        # Vider le cache des pages
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