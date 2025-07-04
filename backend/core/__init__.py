"""
Module core de Notion Clipper Pro
Contient la logique métier principale
"""

from backend.core.notion_clipper import NotionClipperBackend
from backend.core.polling_manager import SmartPollingManager
from backend.core.stats_manager import StatsManager
from backend.core.format_handlers import FormatHandlerRegistry
from backend.core.cache import NotionCache
from backend.core.config import SecureConfig

__all__ = [
    'NotionClipperBackend',
    'SmartPollingManager',
    'StatsManager',
    'FormatHandlerRegistry',
    'NotionCache',
    'SecureConfig'
]

# Version du module
__version__ = '3.0.0'