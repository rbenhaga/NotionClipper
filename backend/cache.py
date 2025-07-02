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
            
            # Calculer le hash pour détecter les changements
            new_hash = self._calculate_hash(page_data)
            old_hash = self.page_hashes.get(page_id)
            
            # Si aucun changement, juste mettre à jour l'ordre LRU
            if old_hash == new_hash:
                if page_id in self.pages_cache:
                    self.pages_cache.move_to_end(page_id)
                return False
            
            # Mettre à jour le cache
            self.pages_cache[page_id] = page_data
            self.page_hashes[page_id] = new_hash
            self.last_modified[page_id] = time.time()
            
            # Si on dépasse la taille max, supprimer les plus anciens
            if len(self.pages_cache) > self.max_size:
                # Supprimer le premier élément (le plus ancien)
                oldest_id = next(iter(self.pages_cache))
                del self.pages_cache[oldest_id]
                del self.page_hashes[oldest_id]
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
        with self.lock:
            try:
                # Sauvegarder les pages
                cache_data = {
                    'version': '2.0',
                    'timestamp': time.time(),
                    'pages': list(self.pages_cache.values()),
                    'count': len(self.pages_cache)
                }
                
                # Écriture atomique
                temp_file = self.cache_file.with_suffix('.tmp')
                with open(temp_file, 'w', encoding='utf-8') as f:
                    json.dump(cache_data, f, ensure_ascii=False, separators=(',', ':'))
                
                temp_file.replace(self.cache_file)
                
                # Sauvegarder les métadonnées
                meta_data = {
                    'hashes': self.page_hashes,
                    'last_modified': self.last_modified
                }
                
                temp_meta = self.meta_file.with_suffix('.tmp')
                with open(temp_meta, 'w', encoding='utf-8') as f:
                    json.dump(meta_data, f, separators=(',', ':'))
                
                temp_meta.replace(self.meta_file)
                
            except Exception as e:
                print(f"Erreur sauvegarde cache: {e}")
    
    def load_from_disk(self):
        """Charge le cache depuis le disque"""
        with self.lock:
            try:
                # Charger les pages
                if self.cache_file.exists():
                    with open(self.cache_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    if data.get('version') == '2.0':
                        pages = data.get('pages', [])
                        for page in pages:
                            if 'id' in page:
                                self.pages_cache[page['id']] = page
                
                # Charger les métadonnées
                if self.meta_file.exists():
                    with open(self.meta_file, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                    
                    self.page_hashes = meta.get('hashes', {})
                    self.last_modified = meta.get('last_modified', {})
                
                # Nettoyer les métadonnées orphelines
                valid_ids = set(self.pages_cache.keys())
                self.page_hashes = {k: v for k, v in self.page_hashes.items() if k in valid_ids}
                self.last_modified = {k: v for k, v in self.last_modified.items() if k in valid_ids}
                
            except Exception as e:
                print(f"Erreur chargement cache: {e}")
    
    def _calculate_hash(self, page_data: Dict) -> str:
        """Calcule un hash pour détecter les changements"""
        # Extraire les champs importants
        content = {
            'title': page_data.get('title', ''),
            'last_edited': page_data.get('last_edited', ''),
            'icon': str(page_data.get('icon', '')),
            'parent_type': page_data.get('parent_type', '')
        }
        
        # Créer un hash SHA256
        json_str = json.dumps(content, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()
    
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