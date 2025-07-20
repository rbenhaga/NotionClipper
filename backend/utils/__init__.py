"""
Module utilitaires pour Notion Clipper Pro
Fonctions et classes utilitaires partagées
"""

# Import depuis helpers.py (déjà existant)
from backend.utils.helpers import (
    ensure_dict,
    ensure_sync_response,
    sanitize_filename,
    calculate_checksum,
    truncate_text,
    format_file_size,
    is_valid_url,
    extract_domain,
    base64_encode_file,
    create_notion_text_block,
    merge_dicts,
    batch_list,
    safe_json_loads,
    get_timestamp,
    format_timestamp
)

# Import depuis clipboard.py (nouveau)
from backend.utils.clipboard import (
    ClipboardManager,
    clipboard_manager
)

__all__ = [
    # Depuis helpers
    'ensure_dict',
    'ensure_sync_response',
    'sanitize_filename',
    'calculate_checksum',
    'truncate_text',
    'format_file_size',
    'is_valid_url',
    'extract_domain',
    'base64_encode_file',
    'create_notion_text_block',
    'merge_dicts',
    'batch_list',
    'safe_json_loads',
    'get_timestamp',
    'format_timestamp',
    # Depuis clipboard
    'ClipboardManager',
    'clipboard_manager'
]

# Version du module
__version__ = '3.0.0'