"""
Routes API pour les événements et Server-Sent Events
"""

import json
import time
from datetime import datetime
from flask import Blueprint, request, jsonify, Response, current_app
from typing import Generator

event_bp = Blueprint('event', __name__)


@event_bp.route('/events/stream')
def event_stream():
    """Server-Sent Events pour les changements en temps réel"""
    backend = current_app.config['backend']
    
    def generate() -> Generator[str, None, None]:
        """Générateur d'événements SSE"""
        # Envoyer un ping initial
        yield format_sse_event({
            'type': 'connected',
            'timestamp': time.time(),
            'message': 'Connexion établie'
        })
        
        # Variables pour le suivi
        last_check = time.time()
        check_interval = 5  # Vérifier toutes les 5 secondes
        last_page_count = len(backend.cache.get_all_pages())
        
        while True:
            try:
                current_time = time.time()
                
                # Vérifier les changements
                if current_time - last_check >= check_interval:
                    # Vérifier si des pages ont été ajoutées/modifiées
                    current_page_count = len(backend.cache.get_all_pages())
                    
                    if current_page_count != last_page_count:
                        yield format_sse_event({
                            'type': 'pages_updated',
                            'timestamp': current_time,
                            'page_count': current_page_count,
                            'change': current_page_count - last_page_count
                        })
                        last_page_count = current_page_count
                    
                    # Envoyer les stats actuelles
                    stats_summary = backend.stats_manager.get_summary()
                    yield format_sse_event({
                        'type': 'stats_update',
                        'timestamp': current_time,
                        'stats': stats_summary
                    })
                    
                    last_check = current_time
                
                # Envoyer un ping toutes les 30 secondes
                if int(current_time) % 30 == 0:
                    yield format_sse_event({
                        'type': 'ping',
                        'timestamp': current_time
                    })
                
                time.sleep(1)
                
            except GeneratorExit:
                # Connexion fermée par le client
                break
            except Exception as e:
                print(f"SSE error: {e}")
                yield format_sse_event({
                    'type': 'error',
                    'timestamp': time.time(),
                    'error': str(e)
                })
                break
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',  # Désactiver le buffering nginx
            'Connection': 'keep-alive'
        }
    )


@event_bp.route('/events/recent')
def get_recent_events():
    """Récupère les événements récents"""
    backend = current_app.config['backend']
    
    try:
        # Pour l'instant, retourner un résumé des changements récents
        stats = backend.stats_manager.get_all_stats()
        
        events = []
        
        # Ajouter les erreurs récentes comme événements
        for error in stats.get('recent_errors', [])[-10:]:
            events.append({
                'type': 'error',
                'timestamp': error.get('timestamp'),
                'details': error
            })
        
        # Ajouter les changements détectés
        if stats['counters']['changes_detected'] > 0:
            events.append({
                'type': 'changes_detected',
                'timestamp': datetime.now().isoformat(),
                'count': stats['counters']['changes_detected']
            })
        
        return jsonify({
            "success": True,
            "events": sorted(events, key=lambda x: x.get('timestamp', ''), reverse=True),
            "count": len(events)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@event_bp.route('/onboarding/complete', methods=['POST'])
def complete_onboarding():
    """Marque l'onboarding comme complété"""
    backend = current_app.config['backend']
    
    try:
        onboarding_file = backend.app_dir / "notion_onboarding.json"
        onboarding_data = {
            "completed": True,
            "timestamp": time.time(),
            "date": datetime.now().isoformat(),
            "version": "3.0.0"
        }
        
        with open(onboarding_file, 'w', encoding='utf-8') as f:
            json.dump(onboarding_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "success": True,
            "message": "Onboarding complété"
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'complete_onboarding')
        return jsonify({"error": str(e)}), 500


@event_bp.route('/onboarding/status')
def get_onboarding_status():
    """Récupère le statut de l'onboarding"""
    backend = current_app.config['backend']
    
    try:
        onboarding_file = backend.app_dir / "notion_onboarding.json"
        
        if onboarding_file.exists():
            with open(onboarding_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return jsonify({
                    "success": True,
                    "completed": data.get('completed', False),
                    "data": data
                })
        
        return jsonify({
            "success": True,
            "completed": False,
            "data": None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def format_sse_event(data: dict) -> str:
    """Formate les données en événement SSE"""
    return f"data: {json.dumps(data)}\n\n"