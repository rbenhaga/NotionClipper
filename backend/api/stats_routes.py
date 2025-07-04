"""
Routes API pour les statistiques et logs
"""

import json
from flask import Blueprint, request, jsonify, current_app

stats_bp = Blueprint('stats', __name__)


@stats_bp.route('/stats')
def get_stats():
    """Récupère les statistiques d'utilisation"""
    backend = current_app.config['backend']
    
    try:
        # Récupérer toutes les statistiques
        stats = backend.stats_manager.get_all_stats()
        
        # Ajouter les stats du polling
        if backend.polling_manager:
            stats['polling'] = backend.polling_manager.get_stats()
        
        return jsonify({
            "success": True,
            "stats": stats
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@stats_bp.route('/stats/summary')
def get_stats_summary():
    """Récupère un résumé des statistiques principales"""
    backend = current_app.config['backend']
    
    try:
        summary = backend.stats_manager.get_summary()
        
        return jsonify({
            "success": True,
            "summary": summary
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@stats_bp.route('/stats/hourly')
def get_hourly_stats():
    """Récupère les statistiques par heure"""
    backend = current_app.config['backend']
    
    try:
        stats = backend.stats_manager.get_all_stats()
        hourly_data = stats.get('hourly_data', [])
        
        return jsonify({
            "success": True,
            "hourly": hourly_data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@stats_bp.route('/stats/export')
def export_stats():
    """Exporte toutes les statistiques"""
    backend = current_app.config['backend']
    
    try:
        # Exporter les stats complètes
        export_data = backend.stats_manager.export_stats()
        
        # Ajouter des métadonnées
        export_data['app_version'] = '3.0.0'
        export_data['export_format'] = 'json'
        
        return jsonify({
            "success": True,
            "data": export_data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@stats_bp.route('/stats/reset', methods=['POST'])
def reset_stats():
    """Réinitialise les statistiques"""
    backend = current_app.config['backend']
    
    try:
        # Réinitialiser le gestionnaire de stats
        backend.stats_manager = backend.stats_manager.__class__()
        
        return jsonify({
            "success": True,
            "message": "Statistiques réinitialisées"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@stats_bp.route('/logs', methods=['GET'])
def get_logs():
    """Récupère les logs récents pour le debugging"""
    backend = current_app.config['backend']
    
    try:
        # Récupérer les erreurs récentes des stats
        stats = backend.stats_manager.get_all_stats()
        recent_errors = stats.get('recent_errors', [])
        
        # Récupérer les logs système si disponibles
        system_logs = backend.get_recent_logs()
        
        return jsonify({
            "success": True,
            "logs": {
                "errors": recent_errors,
                "system": system_logs
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@stats_bp.route('/logs/errors')
def get_error_logs():
    """Récupère uniquement les logs d'erreur"""
    backend = current_app.config['backend']
    
    try:
        stats = backend.stats_manager.get_all_stats()
        
        return jsonify({
            "success": True,
            "errors": stats.get('recent_errors', []),
            "total_errors": stats.get('counters', {}).get('errors', 0)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500