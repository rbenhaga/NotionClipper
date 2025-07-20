"""
Module de cache optimisé pour Notion Clipper Pro
Gestion efficace avec LRU cache et persistance
"""

import json
import time
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any
from collections import OrderedDict
from functools import lru_cache
import threading
from backend.utils.helpers import extract_notion_page_title, normalize_notion_date


class NotionCache:
    """Cache intelligent avec gestion LRU et persistance"""
    
    def __init__(self, app_dir: Path, max_size: int = 2000):
        self.app_dir = Path(app_dir)
        self.max_size = max_size
        
        # Cache LRU en mémoire
        self.pages_cache = OrderedDict()
        self.page_hashes = {}
        self.last_modified = {}
        
        # Fichiers de persistance
        self.cache_file = self.app_dir / "notion_cache.json"
        self.meta_file = self.app_dir / "notion_meta.json"
        
        # Thread safety
        self.lock = threading.RLock()
        
        # Charger depuis le disque
        self.load_from_disk()
    
    def get_all_pages(self) -> List[Dict]:
        """Retourne toutes les pages du cache"""
        with self.lock:
            return list(self.pages_cache.values())
    
    def get_page(self, page_id: str) -> Optional[Dict]:
        """Récupère une page spécifique"""
        with self.lock:
            if page_id in self.pages_cache:
                # Mettre à jour l'ordre LRU
                self.pages_cache.move_to_end(page_id)
                return self.pages_cache[page_id]
            return None
    
    def update_page(self, page_data: Dict) -> bool:
        """Met à jour une page dans le cache"""
        with self.lock:
            page_id = page_data.get('id')
            if not page_id:
                return False
            
            # Formater les données de la page pour l'API
            formatted_page = page_data
            
            # Calculer le hash pour détecter les changements
            new_hash = self._calculate_hash(formatted_page)
            old_hash = self.page_hashes.get(page_id)
            
            # Si aucun changement, juste mettre à jour l'ordre LRU
            if old_hash == new_hash:
                if page_id in self.pages_cache:
                    self.pages_cache.move_to_end(page_id)
                return False
            
            # Mettre à jour le cache avec les données formatées
            self.pages_cache[page_id] = formatted_page
            self.pages_cache.move_to_end(page_id)
            self.page_hashes[page_id] = new_hash
            self.last_modified[page_id] = time.time()
            
            # Limiter la taille du cache
            if len(self.pages_cache) > self.max_size:
                # Supprimer les plus anciennes
                for _ in range(len(self.pages_cache) - self.max_size):
                    oldest_id, _ = self.pages_cache.popitem(last=False)
                    self.page_hashes.pop(oldest_id, None)
                    self.last_modified.pop(oldest_id, None)
            
            return True
    def remove_page(self, page_id: str):
        """Supprime une page du cache"""
        with self.lock:
            self.pages_cache.pop(page_id, None)
            self.page_hashes.pop(page_id, None)
            self.last_modified.pop(page_id, None)
    
    def get_changes_since(self, timestamp: float) -> List[Dict]:
        """Récupère les pages modifiées depuis un timestamp"""
        with self.lock:
            changes = []
            for page_id, last_mod in self.last_modified.items():
                if last_mod > timestamp and page_id in self.pages_cache:
                    changes.append({
                        'page': self.pages_cache[page_id],
                        'timestamp': last_mod
                    })
            
            # Trier par timestamp
            changes.sort(key=lambda x: x['timestamp'], reverse=True)
            return changes
    
    def save_to_disk(self):
        """Sauvegarde le cache sur disque"""
        try:
            with self.lock:
                cache_data = {
                    'pages': dict(self.pages_cache),
                    'hashes': self.page_hashes,
                    'modified': self.last_modified,
                    'last_sync': self.last_sync
                }
                self.cache_file.write_text(json.dumps(cache_data, indent=2))
        except Exception as e:
            print(f"Erreur sauvegarde cache: {e}")
    
    def load_from_disk(self):
        """Charge le cache depuis le disque"""
        try:
            if self.cache_file.exists():
                cache_data = json.loads(self.cache_file.read_text())
                self.pages_cache = OrderedDict(cache_data.get('pages', {}))
                self.page_hashes = cache_data.get('hashes', {})
                self.last_modified = cache_data.get('modified', {})
                self.last_sync = cache_data.get('last_sync')
        except Exception as e:
            print(f"Erreur chargement cache: {e}")
    
    def _calculate_hash(self, data: Dict) -> str:
        """Calcule un hash pour détecter les changements"""
        content = json.dumps(data, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne des statistiques sur le cache"""
        with self.lock:
            total_size = sum(
                len(json.dumps(page).encode()) 
                for page in self.pages_cache.values()
            )
            
            return {
                'pages_count': len(self.pages_cache),
                'size_bytes': total_size,
                'size_mb': round(total_size / (1024 * 1024), 2),
                'oldest_page': min(self.last_modified.values()) if self.last_modified else None,
                'newest_page': max(self.last_modified.values()) if self.last_modified else None
            }
    
    def search_pages(self, query: str) -> List[Dict]:
        """Recherche dans les pages en cache"""
        with self.lock:
            query_lower = query.lower()
            results = []
            
            for page in self.pages_cache.values():
                title = page.get('title', '').lower()
                if query_lower in title:
                    results.append(page)
            
            return results
    
    @lru_cache(maxsize=100)
    def get_page_hierarchy(self) -> Dict[str, List[str]]:
        """Construit la hiérarchie des pages (avec cache LRU)"""
        hierarchy = {}
        
        with self.lock:
            for page in self.pages_cache.values():
                page_id = page.get('id')
                parent_type = page.get('parent_type', 'page')
                
                if parent_type not in hierarchy:
                    hierarchy[parent_type] = []
                
                hierarchy[parent_type].append(page_id)
        
        return hierarchy
    
    def clear(self):
        """Vide complètement le cache"""
        with self.lock:
            self.pages_cache.clear()
            self.page_hashes.clear()
            self.last_modified.clear()
            self.get_page_hierarchy.cache_clear()
            
            # Supprimer les fichiers
            if self.cache_file.exists():
                self.cache_file.unlink()
            if self.meta_file.exists():
                self.meta_file.unlink()

class SmartPollingManager:
    def __init__(self, notion_client_wrapper, cache: NotionCache):
        self.client = notion_client_wrapper
        self.cache = cache
        self.running = False
        self.thread = None
        self.check_interval = 30  # secondes
        self.sync_interval = 300  # 5 minutes
        self.last_sync = 0
        self.page_checksums = {}

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._poll_loop, daemon=True)
            self.thread.start()

    def stop(self):
        self.running = False

    def _poll_loop(self):
        while self.running:
            try:
                current_time = time.time()
                
                # Vérification rapide toutes les 30 secondes
                if self._quick_check():
                    self._incremental_sync()
                    
                # Synchronisation complète toutes les 5 minutes
                if current_time - self.last_sync > self.sync_interval:
                    self.full_sync()
                    self.last_sync = current_time
                    
                time.sleep(self.check_interval)
                
            except Exception as e:
                print(f"Erreur polling: {e}")
                # En cas d'erreur, attendre plus longtemps avant de réessayer
                time.sleep(60)

    def _quick_check(self) -> bool:
        """Vérification rapide des changements"""
        if not self.client or not hasattr(self.client, 'notion'):
            return False
            
        try:
            # Rechercher uniquement la page la plus récemment modifiée
            response = self.client.notion.search(
                filter={"property": "object", "value": "page"},
                page_size=1,
                sort={"timestamp": "last_edited_time", "direction": "descending"}
            )
            
            if response and response.get("results"):
                latest = response["results"][0]
                latest_id = latest.get("id")
                latest_time = latest.get("last_edited_time")
                
                # Calculer un checksum simple basé sur le temps de modification
                if latest_id in self.page_checksums:
                    old_time = self.page_checksums[latest_id]
                    if old_time != latest_time:
                        self.page_checksums[latest_id] = latest_time
                        return True
                else:
                    self.page_checksums[latest_id] = latest_time
                    return True
                    
            return False
            
        except Exception as e:
            print(f"Erreur quick check: {e}")
            return False

    def _incremental_sync(self):
        if not self.client or not hasattr(self.client, 'notion'):
            return
        try:
            response = self.client.notion.search(
                filter={"property": "object", "value": "page"},
                page_size=50,
                sort={"timestamp": "last_edited_time", "direction": "descending"}
            )
            updated_count = 0
            if response and response.get("results"):
                for page in response.get("results", []):
                    checksum = self._calculate_checksum(page)
                    page_id = page["id"]
                    if page_id not in self.page_checksums or self.page_checksums[page_id] != checksum:
                        self.page_checksums[page_id] = checksum
                        self.cache.update_page(self._process_page(page))
                        updated_count += 1
            if updated_count > 0:
                self.cache.save_to_disk()
        except Exception as e:
            print(f"Erreur sync incrémentale: {e}")

    def full_sync(self):
        if not self.client or not hasattr(self.client, 'notion'):
            return
        try:
            all_pages = []
            cursor = None
            has_more = True
            while has_more and len(all_pages) < 2000:
                params = {
                    "filter": {"property": "object", "value": "page"},
                    "page_size": 100,
                    "sort": {"timestamp": "last_edited_time", "direction": "descending"}
                }
                if cursor:
                    params["start_cursor"] = cursor
                response = self.client.notion.search(**params)
                if isinstance(response, dict) and response.get("results"):
                    for page in response.get("results", []):
                        processed = self._process_page(page)
                        all_pages.append(processed)
                        self.cache.update_page(processed)
                        self.page_checksums[page["id"]] = self._calculate_checksum(page)
                    has_more = response.get("has_more", False)
                    cursor = response.get("next_cursor")
                else:
                    has_more = False
                time.sleep(0.3)
            self.cache.save_to_disk()
        except Exception as e:
            print(f"Erreur sync complète: {e}")

    def update_single_page(self, page_id: str):
        if not self.client or not hasattr(self.client, 'notion'):
            return
        try:
            page = self.client.notion.pages.retrieve(page_id)
            processed = self._process_page(page)
            self.cache.update_page(processed)
            self.page_checksums[page_id] = self._calculate_checksum(page)
            self.cache.save_to_disk()
        except Exception:
            pass

    def _process_page(self, page_data: dict) -> dict:
        title = extract_notion_page_title(page_data)
        return {
            "id": page_data["id"],
            "title": title,
            "icon": page_data.get("icon"),
            "url": page_data.get("url"),
            "last_edited": normalize_notion_date(page_data.get("last_edited_time", "")),
            "created_time": normalize_notion_date(page_data.get("created_time", "")),
            "parent_type": page_data.get("parent", {}).get("type", "page")
        }

    def _calculate_checksum(self, page: dict) -> str:
        content = json.dumps({
            "title": extract_notion_page_title(page),
            "last_edited": page.get("last_edited_time"),
            "icon": page.get("icon"),
            "archived": page.get("archived", False)
        }, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()