from flask import Blueprint, request, jsonify, current_app as app
from backend.cache import NotionCache, SmartPollingManager
from backend.notion_client_wrapper import NotionClientWrapper
from backend.config import load_config, save_config
from pathlib import Path
import os

api_bp = Blueprint("api", __name__)

# Initialisation des composants globaux
config = load_config()
notion_token = config.get("notionToken", "")
app_dir = config.get("appDir") or os.getenv("NOTION_CLIPPER_APPDIR") or os.getcwd()
notion_client = NotionClientWrapper(notion_token) if notion_token else None
cache = NotionCache(Path(app_dir))
polling_manager = SmartPollingManager(notion_client, cache)

@api_bp.route('/config', methods=['GET', 'POST'])
def config_route():
    if request.method == 'POST':
        # Logique du correctif #6 (validation + save)
        data = request.get_json() or {}
        notion_token = data.get("notionToken", "").strip()
        imgbb_key    = data.get("imgbbKey", "").strip()
        from notion_client import Client as NotionClient
        try:
            test_client = NotionClient(auth=notion_token)
            test_client.users.me()
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid Notion token: {str(e)}"}), 400
        try:
            save_config({"notionToken": notion_token, "imgbbKey": imgbb_key})
            return jsonify({"success": True}), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
    # GET: logique du correctif #4
    try:
        cfg = load_config()
        return jsonify({
            "success": True,
            "notionToken": cfg.get("notionToken", ""),
            "imgbbKey": cfg.get("imgbbKey", "")
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route('/health', methods=['GET'])
def health():
    # Logique du correctif #5
    status = {"status": "healthy"}
    try:
        cfg = load_config()
        notion_token = cfg.get("notionToken", "")
        imgbb_key = cfg.get("imgbbKey", "")
        first_run = not (notion_token and imgbb_key)
        onboarding_completed = bool(notion_token and imgbb_key)
    except Exception:
        first_run = True
        onboarding_completed = False
    status.update({
        "firstRun": first_run,
        "onboardingCompleted": onboarding_completed
    })
    return jsonify(status), 200

@api_bp.route('/pages', methods=['GET'])
def get_pages():
    # Logique du correctif #7
    args = request.args or {}
    force_refresh = args.get('force_refresh', 'false').lower() in ('true', '1')
    if force_refresh:
        try:
            polling_manager.full_sync()
        except Exception as e:
            app.logger.warning(f"full_sync échouée : {e}")
    pages = cache.get_all_pages()
    pages.sort(key=lambda x: x.get("last_edited", ""), reverse=True)
    return jsonify({
        "pages": pages,
        "count": len(pages),
        "cached": True
    })

@api_bp.route('/send', methods=['POST'])
def send_one():
    # Wrapper vers NotionClientWrapper.send_one
    data = request.get_json() or {}
    page_id = data.get('pageId') or data.get('page_id')
    content = data.get('content', '')
    content_type = data.get('contentType')
    parse_markdown = data.get('parseAsMarkdown', True)
    if not notion_client:
        return jsonify({"success": False, "error": "Notion client not configured"}), 400
    result = notion_client.send_one(page_id, content, contentType=content_type, parseAsMarkdown=parse_markdown)
    return jsonify(result), 200

@api_bp.route('/send_multiple', methods=['POST'])
def send_multiple():
    # Wrapper vers NotionClientWrapper.send_multiple
    data = request.get_json() or {}
    items = data.get('items', [])
    if not notion_client:
        return jsonify({"successCount": 0, "failureCount": len(items), "failed": items}), 400
    result = notion_client.send_multiple(items)
    return jsonify(result), 200 