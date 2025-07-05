"""
Routes API pour la configuration et préférences
"""

import os
import json
import requests
from flask import Blueprint, request, jsonify, current_app

config_bp = Blueprint('config', __name__)


@config_bp.route('/config', methods=['GET'])
def get_config():
    """Récupère la configuration actuelle"""
    backend = current_app.config['backend']
    
    try:
        config = backend.secure_config.load_config()
        
        # Masquer les tokens dans la réponse
        safe_config = config.copy()
        if 'notionToken' in safe_config and safe_config['notionToken']:
            safe_config['notionToken'] = '***' + safe_config['notionToken'][-4:]
        if 'imgbbKey' in safe_config and safe_config['imgbbKey']:
            safe_config['imgbbKey'] = '***' + safe_config['imgbbKey'][-4:]
        
        return jsonify({
            "config": safe_config,
            "hasNotionToken": bool(config.get('notionToken')),
            "hasImgbbKey": bool(config.get('imgbbKey')),
            "onboardingCompleted": config.get('onboardingCompleted', False)
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'get_config')
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config', methods=['POST'])
def update_config():
    """Met à jour la configuration"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        
        # Charger la config actuelle
        current_config = backend.secure_config.load_config()
        
        # Mettre à jour seulement les champs fournis
        if 'notionToken' in data:
            new_token = data['notionToken']
            # Ne pas écraser avec un token masqué
            if not new_token.startswith('***'):
                current_config['notionToken'] = new_token
                # Réinitialiser le client Notion
                backend.initialize_notion_client(new_token)
        
        if 'imgbbKey' in data:
            new_key = data['imgbbKey']
            if not new_key.startswith('***'):
                current_config['imgbbKey'] = new_key
                backend.imgbb_key = new_key
        
        if 'defaultParentPageId' in data:
            current_config['defaultParentPageId'] = data['defaultParentPageId']
        
        if 'autoSync' in data:
            current_config['autoSync'] = data['autoSync']
        
        if 'syncInterval' in data:
            current_config['syncInterval'] = data['syncInterval']
        
        if 'onboardingCompleted' in data:
            current_config['onboardingCompleted'] = data['onboardingCompleted']
        
        # Sauvegarder
        backend.secure_config.save_config(current_config)
        
        # Forcer une synchronisation si le token a changé
        if 'notionToken' in data and backend.polling_manager:
            backend.polling_manager.force_sync()
        
        return jsonify({
            "success": True,
            "message": "Configuration mise à jour"
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'update_config')
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config/reset', methods=['POST'])
def reset_config():
    """Réinitialise la configuration"""
    backend = current_app.config['backend']
    
    try:
        # Réinitialiser avec config par défaut
        default_config = {
            'notionToken': '',
            'imgbbKey': '',
            'defaultParentPageId': '',
            'autoSync': True,
            'syncInterval': 30,
            'onboardingCompleted': False
        }
        
        backend.secure_config.save_config(default_config)
        
        return jsonify({
            "success": True,
            "message": "Configuration réinitialisée"
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'reset_config')
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config/preferences', methods=['GET', 'POST'])
def manage_preferences():
    """Gère les préférences utilisateur (incluant les favoris)"""
    backend = current_app.config['backend']
    
    if request.method == 'GET':
        try:
            # Charger les préférences depuis un fichier séparé
            prefs_file = backend.app_dir / "preferences.json"
            
            if prefs_file.exists():
                with open(prefs_file, 'r', encoding='utf-8') as f:
                    preferences = json.load(f)
            else:
                preferences = {
                    'favorites': [],
                    'recentPages': [],
                    'theme': 'light',
                    'language': 'fr'
                }
            
            return jsonify({
                "success": True,
                "preferences": preferences
            })
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    else:  # POST
        try:
            data = request.get_json() or {}
            prefs_file = backend.app_dir / "preferences.json"
            
            # Charger les préférences existantes
            if prefs_file.exists():
                with open(prefs_file, 'r', encoding='utf-8') as f:
                    preferences = json.load(f)
            else:
                preferences = {}
            
            # Mettre à jour
            if 'favorites' in data:
                preferences['favorites'] = data['favorites']
            if 'recentPages' in data:
                preferences['recentPages'] = data['recentPages']
            if 'theme' in data:
                preferences['theme'] = data['theme']
            if 'language' in data:
                preferences['language'] = data['language']
            
            # Sauvegarder
            with open(prefs_file, 'w', encoding='utf-8') as f:
                json.dump(preferences, f, ensure_ascii=False, indent=2)
            
            return jsonify({
                "success": True,
                "message": "Préférences mises à jour"
            })
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@config_bp.route('/config/favorites', methods=['GET', 'POST'])
def manage_favorites():
    """Gestion spécifique des favoris"""
    backend = current_app.config['backend']
    
    if request.method == 'GET':
        try:
            prefs_file = backend.app_dir / "preferences.json"
            
            if prefs_file.exists():
                with open(prefs_file, 'r', encoding='utf-8') as f:
                    preferences = json.load(f)
                    favorites = preferences.get('favorites', [])
            else:
                favorites = []
            
            return jsonify({
                "success": True,
                "favorites": favorites
            })
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    else:  # POST - Toggle favorite
        try:
            data = request.get_json() or {}
            page_id = data.get('pageId')
            
            if not page_id:
                return jsonify({"error": "pageId requis"}), 400
            
            prefs_file = backend.app_dir / "preferences.json"
            
            # Charger les préférences
            if prefs_file.exists():
                with open(prefs_file, 'r', encoding='utf-8') as f:
                    preferences = json.load(f)
            else:
                preferences = {'favorites': []}
            
            favorites = preferences.get('favorites', [])
            
            # Toggle
            if page_id in favorites:
                favorites.remove(page_id)
                is_favorite = False
            else:
                favorites.append(page_id)
                is_favorite = True
            
            preferences['favorites'] = favorites
            
            # Sauvegarder
            with open(prefs_file, 'w', encoding='utf-8') as f:
                json.dump(preferences, f, ensure_ascii=False, indent=2)
            
            return jsonify({
                "success": True,
                "isFavorite": is_favorite,
                "favorites": favorites
            })
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@config_bp.route('/check_updates')
def check_updates():
    """Vérifie les mises à jour disponibles"""
    backend = current_app.config['backend']
    
    try:
        # Version actuelle
        current_version = "1.0.0"  # À récupérer depuis package.json
        
        # Pour l'instant, retourner qu'on est à jour
        return jsonify({
            "updateAvailable": False,
            "currentVersion": current_version,
            "latestVersion": current_version
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'check_updates')
        return jsonify({"error": str(e)}), 500


@config_bp.route('/test_page/<page_id>')
def test_page_access(page_id):
    """Teste l'accès à une page Notion"""
    backend = current_app.config['backend']
    
    try:
        if not backend.notion_client:
            return jsonify({
                'valid': False,
                'message': 'Client Notion non configuré'
            }), 400
        
        # Essayer de récupérer la page
        try:
            page = backend.notion_client.pages.retrieve(page_id)
            
            # Vérifier si la page est publique
            if page.get('public_url'):
                return jsonify({
                    'valid': True,
                    'public': True,
                    'url': page['public_url']
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
        
        # Créer aussi le fichier marqueur
        onboarding_file = backend.app_dir / "notion_onboarding.json"
        with open(onboarding_file, 'w') as f:
            json.dump({"completed": True}, f)
        
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


@config_bp.route('/config/preview', methods=['GET', 'POST'])
def manage_preview_page():
    """Gère la page de prévisualisation"""
    backend = current_app.config['backend']
    
    if request.method == 'GET':
        try:
            config = backend.secure_config.load_config()
            preview_page_id = config.get('previewPageId')
            
            return jsonify({
                'success': True,
                'previewPageId': preview_page_id,
                'hasPreviewPage': bool(preview_page_id)
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else:  # POST
        try:
            data = request.get_json() or {}
            preview_page_id = data.get('previewPageId')
            
            # Charger la config actuelle
            current_config = backend.secure_config.load_config()
            
            # Mettre à jour
            current_config['previewPageId'] = preview_page_id
            
            # Sauvegarder
            backend.secure_config.save_config(current_config)
            
            return jsonify({
                'success': True,
                'message': 'Page de prévisualisation configurée'
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500


@config_bp.route('/config', methods=['OPTIONS'])
def options_config():
    """Gère les requêtes OPTIONS pour CORS sur /config"""
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-notion-token, Accept, Origin')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response