"""
Gestionnaire de statistiques pour Notion Clipper Pro
Collecte et agrège les métriques d'utilisation
"""

import time
import threading
from typing import Dict, Any, List
from collections import defaultdict
from datetime import datetime, timedelta, timezone


class StatsManager:
    """Gestionnaire centralisé des statistiques d'utilisation"""
    
    def __init__(self):
        self.start_time = time.time()
        self._lock = threading.Lock()
        
        # Compteurs principaux
        self.counters = {
            'api_calls': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'images_uploaded': 0,
            'content_processed': 0,
            'errors': 0,
            'changes_detected': 0,
            'successful_sends': 0,
            'failed_sends': 0
        }
        
        # Statistiques par type de contenu
        self.content_type_stats = defaultdict(int)
        
        # Statistiques par heure (pour graphiques)
        self.hourly_stats = defaultdict(lambda: defaultdict(int))
        
        # Historique des erreurs
        self.error_log = []
        self.max_error_log_size = 100
        
        # Métriques de performance
        self.performance_metrics = {
            'avg_processing_time': 0.0,
            'avg_api_response_time': 0.0,
            'total_processing_time': 0.0,
            'processing_count': 0
        }
    
    def increment(self, metric: str, value: int = 1):
        """Incrémente un compteur de manière thread-safe"""
        with self._lock:
            if metric in self.counters:
                self.counters[metric] += value
                
                # Enregistrer dans les stats horaires
                hour = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:00")
                self.hourly_stats[hour][metric] += value
    
    def record_content_type(self, content_type: str):
        """Enregistre l'utilisation d'un type de contenu"""
        with self._lock:
            self.content_type_stats[content_type] += 1
    
    def record_error(self, error: str, context: str = ""):
        """Enregistre une erreur avec son contexte"""
        with self._lock:
            self.increment('errors')
            
            error_entry = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'error': str(error),
                'context': context
            }
            
            self.error_log.append(error_entry)
            
            # Limiter la taille du log
            if len(self.error_log) > self.max_error_log_size:
                self.error_log = self.error_log[-self.max_error_log_size:]
    
    def record_processing_time(self, duration: float):
        """Enregistre le temps de traitement"""
        with self._lock:
            self.performance_metrics['total_processing_time'] = float(self.performance_metrics['total_processing_time']) + float(duration)
            self.performance_metrics['processing_count'] = int(self.performance_metrics['processing_count']) + 1
            
            # Calculer la moyenne mobile
            count = self.performance_metrics['processing_count']
            self.performance_metrics['avg_processing_time'] = float(self.performance_metrics['total_processing_time']) / count if count else 0.0
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Retourne toutes les statistiques"""
        with self._lock:
            uptime = time.time() - self.start_time
            
            return {
                'uptime': uptime,
                'uptime_formatted': self._format_uptime(uptime),
                'counters': self.counters.copy(),
                'content_types': dict(self.content_type_stats),
                'performance': self.performance_metrics.copy(),
                'hourly_data': self._get_hourly_summary(),
                'error_count': len(self.error_log),
                'recent_errors': self.error_log[-10:],
                'success_rate': self._calculate_success_rate()
            }
    
    def get_summary(self) -> Dict[str, Any]:
        """Retourne un résumé des statistiques principales"""
        with self._lock:
            total_sends = (self.counters['successful_sends'] + 
                          self.counters['failed_sends'])
            
            return {
                'total_api_calls': self.counters['api_calls'],
                'total_content_processed': self.counters['content_processed'],
                'cache_hit_rate': self._calculate_cache_hit_rate(),
                'success_rate': self._calculate_success_rate(),
                'total_sends': total_sends,
                'total_errors': self.counters['errors'],
                'uptime_hours': (time.time() - self.start_time) / 3600
            }
    
    def reset_hourly_stats(self):
        """Réinitialise les statistiques horaires (garde 24h)"""
        with self._lock:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            cutoff_str = cutoff.strftime("%Y-%m-%d %H:00")
            
            # Supprimer les anciennes entrées
            old_hours = [h for h in self.hourly_stats if h < cutoff_str]
            for hour in old_hours:
                del self.hourly_stats[hour]
    
    def _calculate_cache_hit_rate(self) -> float:
        """Calcule le taux de succès du cache"""
        total = self.counters['cache_hits'] + self.counters['cache_misses']
        if total == 0:
            return 0.0
        return (self.counters['cache_hits'] / total) * 100
    
    def _calculate_success_rate(self) -> float:
        """Calcule le taux de succès des envois"""
        total = self.counters['successful_sends'] + self.counters['failed_sends']
        if total == 0:
            return 100.0
        return (self.counters['successful_sends'] / total) * 100
    
    def _format_uptime(self, seconds: float) -> str:
        """Formate le temps de fonctionnement en format lisible"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m {secs}s"
        elif minutes > 0:
            return f"{minutes}m {secs}s"
        else:
            return f"{secs}s"
    
    def _get_hourly_summary(self) -> List[Dict[str, Any]]:
        """Retourne un résumé des stats par heure (dernières 24h)"""
        summary = []
        now = datetime.now(timezone.utc)
        
        for i in range(24):
            hour_time = now - timedelta(hours=i)
            hour_str = hour_time.strftime("%Y-%m-%d %H:00")
            
            if hour_str in self.hourly_stats:
                stats = self.hourly_stats[hour_str]
                summary.append({
                    'hour': hour_str,
                    'api_calls': stats.get('api_calls', 0),
                    'content_processed': stats.get('content_processed', 0),
                    'errors': stats.get('errors', 0)
                })
        
        return sorted(summary, key=lambda x: x['hour'])
    
    def export_stats(self) -> Dict[str, Any]:
        """Exporte les statistiques complètes pour sauvegarde"""
        with self._lock:
            return {
                'export_time': datetime.now(timezone.utc).isoformat(),
                'start_time': self.start_time,
                'counters': self.counters.copy(),
                'content_types': dict(self.content_type_stats),
                'hourly_stats': dict(self.hourly_stats),
                'performance': self.performance_metrics.copy(),
                'error_log': self.error_log.copy()
            }
    
    def import_stats(self, data: Dict[str, Any]):
        """Importe des statistiques sauvegardées"""
        with self._lock:
            if 'counters' in data:
                self.counters.update(data['counters'])
            
            if 'content_types' in data:
                self.content_type_stats.update(data['content_types'])
            
            if 'hourly_stats' in data:
                self.hourly_stats.update(data['hourly_stats'])
            
            if 'performance' in data:
                self.performance_metrics.update(data['performance'])
            
            if 'error_log' in data:
                self.error_log = data['error_log'][-self.max_error_log_size:]