"""
Gestionnaire de polling optimisé pour Notion Clipper Pro
Détection intelligente des changements et synchronisation incrémentale
"""

import time
import threading
import hashlib
import json
from typing import Dict, Optional, List, TYPE_CHECKING

from backend.utils.helpers import ensure_sync_response, ensure_dict, extract_notion_page_title

if TYPE_CHECKING:
    from core.notion_clipper import NotionClipperBackend


class SmartPollingManager:
    """Gestionnaire de polling optimisé avec détection intelligente"""
    
    def __init__(self, backend: 'NotionClipperBackend'):
        self.backend = backend
        self.running = False
        self.thread = None
        
        # Configuration du polling
        self.check_interval = 60  # secondes entre chaque vérification (au lieu de 30)
        self.sync_interval = 300  # 5 minutes pour sync complète
        self.last_sync = 0
        
        # Cache des checksums pour détecter les changements
        self.page_checksums = {}
        
        # Statistiques du polling
        self.stats = {
            'checks_performed': 0,
            'changes_detected': 0,
            'syncs_completed': 0,
            'errors': 0
        }
    
    def start(self):
        """Démarre le polling dans un thread séparé"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(
                target=self._poll_loop,
                daemon=True,
                name="NotionPolling"
            )
            self.thread.start()
            print("📡 Polling démarré")
    
    def stop(self):
        """Arrête le polling proprement"""
        if self.running:
            self.running = False
            print("⏹️ Arrêt du polling...")
    
    def _poll_loop(self):
        """Boucle principale de polling"""
        while self.running:
            try:
                current_time = time.time()
                
                # Vérification rapide des changements
                if self._quick_check():
                    self._incremental_sync()
                
                # Synchronisation complète périodique
                if current_time - self.last_sync > self.sync_interval:
                    self._full_sync()
                    self.last_sync = current_time
                
                # Incrémenter les stats
                self.stats['checks_performed'] += 1
                
                # Attendre avant la prochaine vérification
                time.sleep(self.check_interval)
                
            except Exception as e:
                print(f"❌ Erreur polling: {e}")
                self.stats['errors'] += 1
                time.sleep(60)  # Attendre plus longtemps en cas d'erreur
    
    def _quick_check(self) -> bool:
        """
        Vérification rapide pour détecter s'il y a des changements
        Retourne True si des changements sont détectés
        """
        if not self.backend.notion_client:
            return False
        
        try:
            # Récupérer la page la plus récemment modifiée
            response = self.backend.notion_client.search(
                filter={"property": "object", "value": "page"},
                page_size=1,
                sort={"timestamp": "last_edited_time", "direction": "descending"}
            )
            response = ensure_sync_response(response)
            response = ensure_dict(response)
            
            if response and response.get("results"):
                latest = response["results"][0]
                checksum = self._calculate_checksum(latest)
                
                # Vérifier si la page a changé
                if (latest["id"] not in self.page_checksums or 
                    self.page_checksums[latest["id"]] != checksum):
                    self.stats['changes_detected'] += 1
                    return True
            
            return False
            
        except Exception as e:
            print(f"Erreur quick_check: {e}")
            return False
    
    def _incremental_sync(self):
        """Synchronisation incrémentale des pages modifiées"""
        if not self.backend.notion_client:
            return
        
        try:
            print("🔄 Synchronisation incrémentale...")
            
            # Récupérer les pages modifiées récemment
            response = self.backend.notion_client.search(
                filter={"property": "object", "value": "page"},
                page_size=10,
                sort={"timestamp": "last_edited_time", "direction": "descending"}
            )
            response = ensure_sync_response(response)
            response = ensure_dict(response)
            
            updated_count = 0
            
            for page in response.get("results", []):
                checksum = self._calculate_checksum(page)
                
                # Si la page a changé ou est nouvelle
                if (page["id"] not in self.page_checksums or 
                    self.page_checksums[page["id"]] != checksum):
                    
                    # Mettre à jour le cache
                    self.backend.cache.update_page(page)
                    self.page_checksums[page["id"]] = checksum
                    updated_count += 1
            
            if updated_count > 0:
                self.backend.cache.save_to_disk()
                print(f"✅ {updated_count} pages mises à jour")
            
        except Exception as e:
            print(f"❌ Erreur sync incrémentale: {e}")
            self.stats['errors'] += 1
    
    def _full_sync(self):
        """Synchronisation complète de toutes les pages"""
        if not self.backend.notion_client:
            return
        
        try:
            print("🔄 Synchronisation complète en cours...")
            start_time = time.time()
            
            # Réinitialiser les checksums
            self.page_checksums.clear()
            
            # Parcourir toutes les pages
            has_more = True
            next_cursor = None
            total_pages = 0
            
            while has_more:
                params = {
                    "filter": {"property": "object", "value": "page"},
                    "page_size": 100
                }
                
                if next_cursor:
                    params["start_cursor"] = next_cursor
                
                response = self.backend.notion_client.search(**params)
                response = ensure_sync_response(response)
                response = ensure_dict(response)
                
                # Traiter les résultats
                for page in response.get("results", []):
                    self.backend.cache.update_page(page)
                    self.page_checksums[page["id"]] = self._calculate_checksum(page)
                    total_pages += 1
                
                # Vérifier s'il y a d'autres pages
                has_more = response.get("has_more", False)
                next_cursor = response.get("next_cursor")
            
            # Sauvegarder le cache
            self.backend.cache.save_to_disk()
            
            # Statistiques
            elapsed = time.time() - start_time
            self.stats['syncs_completed'] += 1
            
            print(f"✅ Sync complète: {total_pages} pages en {elapsed:.2f}s")
            
        except Exception as e:
            print(f"❌ Erreur sync complète: {e}")
            self.stats['errors'] += 1
    
    def update_single_page(self, page_id: str):
        """Met à jour une seule page dans le cache"""
        if not self.backend.notion_client:
            return
        
        try:
            # Récupérer les infos de la page
            page = self.backend.notion_client.pages.retrieve(page_id)
            page = ensure_sync_response(page)
            page = ensure_dict(page)
            
            # Mettre à jour le cache et le checksum
            self.backend.cache.update_page(page)
            
            # Sauvegarder
            self.backend.cache.save_to_disk()
            
        except Exception as e:
            print(f"Erreur mise à jour page {page_id}: {e}")
    
    def _calculate_checksum(self, page: Dict) -> str:
        """
        Calcule un checksum pour détecter les changements d'une page
        Utilise les champs importants pour la détection
        """
        content = json.dumps({
            "title": extract_notion_page_title(page),
            "last_edited": page.get("last_edited_time"),
            "icon": page.get("icon"),
            "archived": page.get("archived", False)
        }, sort_keys=True)
        
        return hashlib.sha256(content.encode()).hexdigest()
    
    def get_stats(self) -> Dict[str, int]:
        """Retourne les statistiques du polling"""
        return self.stats.copy()
    
    def force_sync(self):
        """Force une synchronisation immédiate"""
        threading.Thread(
            target=self._full_sync,
            daemon=True,
            name="ForceSync"
        ).start()