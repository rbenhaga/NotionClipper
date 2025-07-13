"""
Routes API pour la configuration et préférences
"""

import os
import json
import requests
from flask import Blueprint, request, jsonify, current_app
from notion_client import Client  # Ajouté pour tester la connexion Notion
from backend.utils.security import get_secure_api_key, set_secure_api_key
from backend.utils.config import get_config, set_config

config_bp = Blueprint('config', __name__)


@config_bp.route('/save', methods=['POST', 'OPTIONS'])
def save_config():
    """Sauvegarde la configuration"""
    if request.method == 'OPTIONS':
        # Répondre aux requêtes preflight
        return '', 204
        
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        
        # Charger la config actuelle pour ne pas perdre des données
        current_config = backend.secure_config.load_config()
        
        # Mettre à jour avec les nouvelles données
        if data.get('notionToken'):
            current_config['notionToken'] = data['notionToken']
        if data.get('imgbbKey') is not None:
            current_config['imgbbKey'] = data['imgbbKey']
        if data.get('previewPageId') is not None:
            current_config['previewPageId'] = data['previewPageId']
        if 'onboardingCompleted' in data:
            current_config['onboardingCompleted'] = data['onboardingCompleted']
        
        # Sauvegarder
        backend.secure_config.save_config(current_config)
        
        # Réinitialiser le backend si le token a changé
        if data.get('notionToken') and data.get('notionToken') != current_config.get('notionToken'):
            # Attendre que la config soit bien sauvegardée
            import time
            time.sleep(0.5)
            
            # Réinitialiser le backend
            try:
                backend.initialize()
            except Exception as init_error:
                print(f"Erreur initialisation après save: {init_error}")
                # Ne pas faire échouer la sauvegarde pour autant
            
        return jsonify({
            'success': True,
            'message': 'Configuration sauvegardée'
        })
        
    except Exception as e:
        import traceback
        print(f"Erreur save_config: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@config_bp.route('/test', methods=['GET', 'POST', 'OPTIONS'])
def test_endpoint():
    """Endpoint de test pour vérifier la connectivité"""
    if request.method == 'OPTIONS':
        return '', 204
        
    return jsonify({
        'success': True,
        'message': 'Backend accessible',
        'method': request.method,
        'headers': dict(request.headers)
    })


@config_bp.route('/config', methods=['GET'])
def get_config():
    """Récupère la configuration actuelle"""
    backend = current_app.config['backend']
    
    try:
        config = backend.secure_config.load_config()
        
        # Masquer les tokens dans la réponse
        safe_config = config.copy()
        if 'notionToken' in safe_config and safe_config['notionToken']:
            safe_config['notionToken'] = 'configured'  # Au lieu de '***' + token[-4:]
        
        # Vérifier si la clé ImgBB est configurée de manière sécurisée
        imgbb_key = get_secure_api_key('imgbb_api_key')
        safe_config['imgbbKey'] = 'configured' if imgbb_key else None
        
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
        
        # Validation approfondie des tokens
        notion_token = data.get('notionToken')
        imgbb_key = data.get('imgbbKey')
        if notion_token and not notion_token.startswith(('secret_', 'ntn_')):
            return jsonify({
                "success": False,
                "error": "Token Notion invalide. Il doit commencer par 'secret_' ou 'ntn_'"
            }), 400
        if imgbb_key and len(imgbb_key) < 20:
            return jsonify({
                "success": False,
                "error": "Clé ImgBB invalide. Elle doit contenir au moins 20 caractères"
            }), 400
        # Tester la connexion Notion avant de sauvegarder
        if notion_token:
            test_client = Client(auth=notion_token)
            try:
                test_client.users.me()
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Impossible de se connecter à Notion : {str(e)}"
                }), 400
        
        # Charger la config actuelle
        current_config = backend.secure_config.load_config()
        
        # Mettre à jour seulement les champs fournis
        if 'notionToken' in data and data['notionToken'] != 'configured':
            current_config['notionToken'] = data['notionToken']
            backend.initialize_notion_client(data['notionToken'])
        if 'imgbbKey' in data and data['imgbbKey'] != 'configured':
            # Stocker la clé ImgBB de manière sécurisée
            if set_secure_api_key('imgbb_api_key', data['imgbbKey']):
                current_config['imgbbKey'] = 'configured'
                backend.imgbb_key = data['imgbbKey']
            else:
                return jsonify({
                    "success": False,
                    "error": "Erreur lors du stockage sécurisé de la clé ImgBB"
                }), 500
        
        if 'defaultParentPageId' in data:
            current_config['defaultParentPageId'] = data['defaultParentPageId']
        
        if 'autoSync' in data:
            current_config['autoSync'] = data['autoSync']
        
        if 'syncInterval' in data:
            current_config['syncInterval'] = data['syncInterval']
        
        if 'onboardingCompleted' in data:
            current_config['onboardingCompleted'] = data['onboardingCompleted']
        
        if 'previewPageId' in data:
            current_config['previewPageId'] = data['previewPageId']
        
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

@config_bp.route('/verify-token', methods=['POST', 'OPTIONS'])
def verify_notion_token():
    """Vérifie la validité d'un token Notion"""
    if request.method == 'OPTIONS':
        return '', 204
        
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        token = data.get('token', '').strip()
        
        if not token:
            return jsonify({
                'valid': False,
                'message': 'Token requis'
            })
        
        # Tester le token en créant un client temporaire
        try:
            from backend.utils.helpers import ensure_sync_response, ensure_dict
            test_client = Client(auth=token)
            
            # Tester avec une simple recherche
            response = test_client.search(
                filter={"property": "object", "value": "page"},
                page_size=1
            )
            response = ensure_sync_response(response)
            response = ensure_dict(response)
            
            # Si on arrive ici, le token est valide
            return jsonify({
                'valid': True,
                'message': 'Token valide',
                'user': {
                    'name': 'Utilisateur Notion',
                    'email': ''
                }
            })
            
        except Exception as e:
            error_msg = str(e).lower()
            if 'unauthorized' in error_msg or 'invalid' in error_msg or 'api token' in error_msg:
                return jsonify({
                    'valid': False,
                    'message': 'Token invalide ou non autorisé'
                })
            else:
                import traceback
                print(f"Erreur validation token: {str(e)}")
                print(traceback.format_exc())
                return jsonify({
                    'valid': False,
                    'message': f'Erreur de connexion: {str(e)}'
                })
                
    except Exception as e:
        import traceback
        print(f"Erreur verify_notion_token: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 500

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


@config_bp.route('/config/secure-api-key', methods=['POST'])
def set_secure_api_key_route():
    """Stocke une clé API de manière sécurisée"""
    try:
        data = request.get_json() or {}
        service = data.get('service')
        api_key = data.get('apiKey')
        
        if not service or not api_key:
            return jsonify({
                "success": False,
                "error": "Service et clé API requis"
            }), 400
        
        # Validation de la clé selon le service
        if service == 'imgbb' and len(api_key) < 20:
            return jsonify({
                "success": False,
                "error": "Clé ImgBB invalide. Elle doit contenir au moins 20 caractères"
            }), 400
        
        # Stocker la clé de manière sécurisée
        if set_secure_api_key(f"{service}_api_key", api_key):
            return jsonify({
                "success": True,
                "message": f"Clé API {service} stockée avec succès"
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Erreur lors du stockage de la clé {service}"
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config/secure-api-key/<service>', methods=['GET'])
def get_secure_api_key_route(service):
    """Récupère une clé API de manière sécurisée (retourne seulement si configurée)"""
    try:
        api_key = get_secure_api_key(f"{service}_api_key")
        
        if api_key:
            return jsonify({
                "success": True,
                "configured": True,
                "message": f"Clé API {service} configurée"
            })
        else:
            return jsonify({
                "success": True,
                "configured": False,
                "message": f"Clé API {service} non configurée"
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@config_bp.route('/config/secure-api-key/<service>', methods=['DELETE'])
def remove_secure_api_key_route(service):
    """Supprime une clé API du stockage sécurisé"""
    try:
        from backend.utils.security import remove_secure_api_key
        
        if remove_secure_api_key(f"{service}_api_key"):
            return jsonify({
                "success": True,
                "message": f"Clé API {service} supprimée"
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Erreur lors de la suppression de la clé {service}"
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@config_bp.route('/create-preview-page', methods=['POST', 'OPTIONS'])
def create_preview_page():
    """Crée une nouvelle page de preview"""
    if request.method == 'OPTIONS':
        return '', 204
        
    backend = current_app.config['backend']
    
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        data = request.get_json() or {}
        logger.info(f"create_preview_page appelé avec data: {data}")
        
        # Vérifier l'état du backend
        logger.info(f"Backend notion_client: {backend.notion_client is not None}")
        
        if not backend.notion_client:
            # Log plus détaillé
            config = backend.secure_config.load_config()
            logger.info(f"Config actuelle: {list(config.keys())}")
            logger.info(f"Token présent: {bool(config.get('notionToken'))}")
            
            # Essayer de réinitialiser le backend
            if config.get('notionToken'):
                logger.info("Tentative de réinitialisation du backend")
                backend.initialize()
            else:
                logger.error("Token Notion non configuré")
                return jsonify({
                    'success': False,
                    'error': 'Token Notion non configuré'
                }), 400
        parent_page_id = data.get('parentPageId')
        
        # Créer la page
        logger.info(f"Création de la page preview avec parent: {parent_page_id}")
        preview_page_id = backend.create_preview_page(parent_page_id)
        
        if preview_page_id:
            logger.info(f"Page preview créée avec succès: {preview_page_id}")
            
            # Sauvegarder dans la config
            config = backend.secure_config.load_config()
            config['previewPageId'] = preview_page_id
            backend.secure_config.save_config(config)
            
            # Mettre à jour le cache
            if backend.polling_manager:
                backend.polling_manager.update_single_page(preview_page_id)
            
            return jsonify({
                'success': True,
                'pageId': preview_page_id,
                'message': 'Page de preview créée avec succès'
            })
        else:
            logger.error("Échec de la création de la page preview")
            return jsonify({
                'success': False,
                'error': 'Impossible de créer la page de preview. Vérifiez que vous avez au moins une page dans votre espace Notion.'
            }), 500
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur route create-preview-page: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@config_bp.route('/config', methods=['OPTIONS'])
def options_config():
    """Gère les requêtes OPTIONS pour CORS sur /config"""
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-notion-token, Accept, Origin')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response