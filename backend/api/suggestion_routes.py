# backend/api/suggestion_routes.py
"""
Routes API pour les suggestions intelligentes
"""

from flask import Blueprint, request, jsonify, current_app

# Importer le service (créer l'instance au niveau du module)
try:
    from backend.services.semantic_suggestions import suggestion_service
except ImportError:
    suggestion_service = None

suggestion_bp = Blueprint('suggestions', __name__)


@suggestion_bp.route('/suggestions/hybrid', methods=['POST'])
def get_hybrid_suggestions():
    """
    Obtient des suggestions hybrides (lexical + sémantique optionnel)
    """
    if not suggestion_service:
        return jsonify({
            "error": "Service de suggestions non disponible",
            "fallback": True
        }), 501
    
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        clipboard_content = data.get('clipboardContent', '').strip()
        
        if not clipboard_content:
            return jsonify({
                "suggestions": [],
                "method": "none"
            })
        
        # Obtenir toutes les pages
        all_pages = backend.cache.get_all_pages()
        if not all_pages:
            return jsonify({
                "suggestions": [],
                "method": "no_pages"
            })
        
        # Obtenir les favoris
        favorites = data.get('favorites', [])
        
        # Paramètres de configuration
        use_semantic = data.get('useSemantic', True)
        semantic_threshold = data.get('semanticThreshold', 20)  # Mots minimum
        
        # Obtenir les suggestions
        results = suggestion_service.get_suggestions(
            clipboard_content=clipboard_content,
            pages=all_pages,
            favorites=favorites,
            use_semantic=use_semantic,
            semantic_threshold=semantic_threshold
        )
        
        # Formater la réponse
        suggestions = []
        for result in results:
            page = result['page']
            suggestions.append({
                "id": page.get('id'),
                "title": page.get('title', 'Sans titre'),
                "parent_title": page.get('parent_title'),
                "last_edited_time": page.get('last_edited_time'),
                "score": result['score'],
                "match_type": result['match_type']
            })
        
        # Déterminer la méthode utilisée
        stats = suggestion_service.get_stats()
        method = "hybrid" if stats['semantic_calls'] > 0 else "lexical"
        
        return jsonify({
            "suggestions": suggestions,
            "method": method,
            "stats": stats
        })
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "fallback": True
        }), 500


@suggestion_bp.route('/suggestions/stats', methods=['GET'])
def get_suggestion_stats():
    """Obtient les statistiques du service de suggestions"""
    if not suggestion_service:
        return jsonify({"error": "Service non disponible"}), 501
    
    return jsonify(suggestion_service.get_stats())


@suggestion_bp.route('/suggestions/cache/clear', methods=['POST'])
def clear_suggestion_cache():
    """Nettoie le cache des suggestions"""
    if not suggestion_service:
        return jsonify({"error": "Service non disponible"}), 501
    
    try:
        data = request.get_json() or {}
        older_than_hours = data.get('olderThanHours', 24)
        
        suggestion_service.clear_cache(older_than_hours)
        
        return jsonify({
            "success": True,
            "message": f"Cache nettoyé (entrées > {older_than_hours}h)"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500