"""Routes API pour Notion Clipper Pro."""
from flask import Blueprint, request, jsonify
from .cache import NotionCache
from .utils import get_clipboard_content
from .config import SecureConfig
import time
import os
import json
from datetime import datetime
from pathlib import Path

api = Blueprint('api', __name__)

# Initialisation des modules globaux (à adapter selon l'usage réel)
secure_config = SecureConfig()
cache_dir = secure_config.app_dir
notion_cache = NotionCache(cache_dir)

@api.route('/health')
def health_check():
    cache_pages = notion_cache.get_all_pages()
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "cache_stats": {
            "total_pages": len(cache_pages)
        }
    })

@api.route('/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'POST':
        data = request.get_json()
        secure_config.save_config({
            "notionToken": data.get("notionToken", ""),
            "imgbbKey": data.get("imgbbKey", "")
        })
        return jsonify({"success": True, "message": "Configuration mise à jour"})
    else:
        config = secure_config.load_config()
        return jsonify(config)

@api.route('/clipboard')
def clipboard():
    return jsonify(get_clipboard_content())

@api.route('/onboarding/complete', methods=['POST'])
def complete_onboarding():
    onboarding_file = cache_dir / "notion_onboarding.json"
    onboarding_data = {
        "completed": True,
        "timestamp": time.time(),
        "date": datetime.now().isoformat()
    }
    with open(onboarding_file, 'w', encoding='utf-8') as f:
        json.dump(onboarding_data, f, ensure_ascii=False, indent=2)
    return jsonify({"success": True, "message": "Onboarding complété"}) 