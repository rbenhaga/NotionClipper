"""Module de cache pour Notion Clipper Pro."""
import json
import threading
from collections import OrderedDict
from pathlib import Path
import hashlib
from datetime import datetime

class NotionCache:
    """Gère le cache multi-niveaux des pages Notion."""
    
    def __init__(self, cache_dir: Path):
        self.cache_file = cache_dir / "notion_cache.json"
        self.delta_file = cache_dir / "notion_delta.json"
        self.pages_cache = OrderedDict()
        self.page_hashes = {}
        self.last_modified = {}
        self.lock = threading.Lock()
        self.max_items = 2000
        self.load_from_disk()
    
    def load_from_disk(self):
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for page in data.get("pages", []):
                        self.pages_cache[page["id"]] = page
                        self.last_modified[page["id"]] = page.get("last_edited", "")
            except Exception as e:
                print(f"Erreur chargement cache: {e}")
    def save_to_disk(self):
        with self.lock:
            data = {
                "pages": list(self.pages_cache.values()),
                "timestamp": datetime.now().timestamp(),
                "count": len(self.pages_cache)
            }
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    def compute_page_hash(self, page_data):
        content = f"{page_data.get('title', '')}{page_data.get('last_edited', '')}"
        return hashlib.md5(content.encode()).hexdigest()
    def has_changed(self, page_id, new_data):
        new_hash = self.compute_page_hash(new_data)
        old_hash = self.page_hashes.get(page_id)
        return new_hash != old_hash
    def update_page(self, page_data):
        page_id = page_data["id"]
        changed = self.has_changed(page_id, page_data)
        with self.lock:
            self.pages_cache[page_id] = page_data
            self.page_hashes[page_id] = self.compute_page_hash(page_data)
            self.last_modified[page_id] = page_data.get("last_edited", "")
            self.pages_cache.move_to_end(page_id)
            while len(self.pages_cache) > self.max_items:
                oldest_id = next(iter(self.pages_cache))
                del self.pages_cache[oldest_id]
                if oldest_id in self.page_hashes:
                    del self.page_hashes[oldest_id]
        return changed
    def get_all_pages(self):
        with self.lock:
            return list(self.pages_cache.values())
    def get_changes_since(self, timestamp):
        with self.lock:
            changed_pages = []
            for page in self.pages_cache.values():
                last_edited = page.get("last_edited", "")
                if last_edited:
                    try:
                        page_time = datetime.fromisoformat(last_edited.replace('Z', '+00:00')).timestamp()
                        if page_time > timestamp:
                            changed_pages.append(page)
                    except:
                        pass
            return changed_pages 