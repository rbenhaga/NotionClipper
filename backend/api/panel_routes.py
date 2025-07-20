from flask import Blueprint, jsonify

panel_bp = Blueprint('panel', __name__)

@panel_bp.route('/panel/stats')
def get_panel_stats():
    """Retourne les statistiques du panneau"""
    return jsonify({
        "stats": {
            "total_clips": 0,
            "today_clips": 0
        }
    }) 