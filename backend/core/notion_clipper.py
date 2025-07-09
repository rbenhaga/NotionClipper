"""
Classe principale du backend Notion Clipper Pro
Gère la logique métier et l'orchestration des services
"""

import os
import time
from typing import Dict, Optional, Any, List, Union
from pathlib import Path

from notion_client import Client

from backend.utils.clipboard import ClipboardManager
from backend.core.config import SecureConfig
from backend.core.cache import NotionCache
from backend.parsers.enhanced_content_parser import EnhancedContentParser

from backend.core.polling_manager import SmartPollingManager
from backend.core.stats_manager import StatsManager
from backend.core.format_handlers import FormatHandlerRegistry
from backend.utils.helpers import ensure_dict, ensure_sync_response, extract_notion_page_title

import logging
logger = logging.getLogger(__name__)


class NotionClipperBackend:
    """Classe principale gérant toute la logique backend"""
    
    def __init__(self):
        # Configuration
        self.secure_config = SecureConfig()
        self.app_dir = self.secure_config.config_dir
        
        # Services externes
        self.notion_client: Optional[Client] = None
        self.imgbb_key: Optional[str] = None
        
        # Services internes
        self.cache = NotionCache(self.app_dir)
        self.clipboard_manager = ClipboardManager()
        self.content_parser = None
        
        # Gestionnaires
        self.polling_manager = SmartPollingManager(self)
        self.stats_manager = StatsManager()
        self.format_handlers = FormatHandlerRegistry(self)
        
        # Détecteurs de format
        self.format_detectors = [
            (self._is_image, 'image'),
            (self._is_video, 'video'),
            (self._is_audio, 'audio'),
            (self._is_table, 'table'),
            (self._is_code, 'code'),
            (self._is_url, 'url'),
            (self._is_markdown, 'markdown'),
            (self._is_document, 'document')
        ]
        
        # Limites de l'API Notion
        self.NOTION_MAX_CHARS_PER_BLOCK = 2000
        self.NOTION_MAX_BLOCKS_PER_REQUEST = 100
    
    def initialize(self) -> bool:
        """Initialise la configuration et les services"""
        try:
            config = self.secure_config.load_config()
            notion_token = config.get('notionToken') or os.getenv('NOTION_TOKEN')
            self.imgbb_key = config.get('imgbbKey') or os.getenv('IMGBB_API_KEY')
            
            if notion_token:
                self.notion_client = Client(auth=notion_token)
                # Initialiser le parser avec la clé ImgBB
                self.content_parser = EnhancedContentParser(imgbb_key=self.imgbb_key)
                # Démarrer le polling
                self.polling_manager.start()
                
                # Test de connexion
                try:
                    self.notion_client.users.me()
                    return True
                except Exception as e:
                    print(f"Erreur connexion Notion: {e}")
                    self.notion_client = None
                    return False
            
            return False
        except Exception as e:
            print(f"Erreur initialisation: {e}")
            return False
    
    def update_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        """Met à jour la configuration et vérifie la validité du token Notion"""
        try:
            current_config = self.secure_config.load_config()
            updated_config = {**current_config, **new_config}
            self.secure_config.save_config(updated_config)

            # Réinitialiser si les clés ont changé
            if (
                new_config.get('notionToken') != current_config.get('notionToken') or
                new_config.get('imgbbKey') != current_config.get('imgbbKey')
            ):
                # initialize() tente déjà une connexion à Notion
                ok = self.initialize()
                if not ok and updated_config.get('notionToken'):
                    return {"success": False, "error": "Token Notion invalide ou non autorisé"}

            return {"success": True, "message": "Configuration mise à jour"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def detect_content_type(self, content: str) -> str:
        """Détecte automatiquement le type de contenu"""
        content = content.strip()
        
        # Parcourir les détecteurs dans l'ordre
        for detector, content_type in self.format_detectors:
            if detector(content):
                return content_type
        
        # Par défaut, texte simple
        return 'text'
    
    def process_content(self, content: str, content_type: Optional[str] = None,
                       parse_markdown: bool = True, **kwargs) -> List[Dict]:
        """Traite le contenu avec le parser approprié"""
        try:
            # Incrémenter les stats
            self.stats_manager.increment('content_processed')
            
            # Si un type de bloc spécifique est fourni
            notion_block_types = [
                'heading_1', 'heading_2', 'heading_3', 'quote', 'callout',
                'toggle', 'bulleted_list_item', 'numbered_list_item', 'to_do',
                'divider', 'code', 'table', 'bookmark', 'image'
            ]
            
            if content_type in notion_block_types:
                # Utiliser le handler de blocs Notion
                handler = self.format_handlers.get_handler('notion_block')
                return handler.handle(content, content_type)
            
            # Détection automatique si nécessaire
            if not content_type or content_type == 'mixed':
                content_type = self.detect_content_type(content)
            if not content_type:
                content_type = 'text'
            
            # Utiliser le parser avancé si disponible
            if kwargs.get('use_advanced_parser') and self.content_parser:
                from backend.parsers.enhanced_content_parser import parse_content_for_notion
                return parse_content_for_notion(
                    content=content,
                    content_type=content_type,
                    imgbb_key=self.imgbb_key
                )
            
            # Sinon, utiliser les handlers de format
            handler = self.format_handlers.get_handler(content_type)
            return handler(content, parse_markdown)
            
        except Exception as e:
            # En cas d'erreur, retourner un bloc d'erreur au lieu de crasher
            logger.error(f"Erreur process_content: {e}")
            return [{
                'type': 'callout',
                'callout': {
                    'rich_text': [{
                        'type': 'text',
                        'text': {'content': f'⚠️ Erreur de traitement: {str(e)}'}
                    }],
                    'icon': {'type': 'emoji', 'emoji': '❌'},
                    'color': 'red_background'
                }
            }]

    def calculate_blocks_info(self, content: str, content_type: str = 'text') -> dict:
        """Calcule le nombre de blocs nécessaires et les limitations"""
        if content_type in ['image', 'video', 'audio', 'file']:
            return {
                'blocks_needed': 1,
                'chars_total': len(content),
                'within_limits': True,
                'message': None
            }
        # Pour le texte et markdown
        chars_total = len(content)
        blocks_needed = max(1, (chars_total + self.NOTION_MAX_CHARS_PER_BLOCK - 1) // self.NOTION_MAX_CHARS_PER_BLOCK)
        within_limits = blocks_needed <= self.NOTION_MAX_BLOCKS_PER_REQUEST
        message = None
        if not within_limits:
            message = f"Le contenu nécessite {blocks_needed} blocs mais la limite est de {self.NOTION_MAX_BLOCKS_PER_REQUEST}"
        elif blocks_needed > 10:
            message = f"Attention : le contenu sera divisé en {blocks_needed} blocs"
        return {
            'blocks_needed': blocks_needed,
            'chars_total': chars_total,
            'within_limits': within_limits,
            'message': message,
            'chars_per_block': self.NOTION_MAX_CHARS_PER_BLOCK
        }
    
    def send_to_notion(self, page_id: str, blocks: List[Dict], properties: Dict = {}, page_properties: Dict = {}) -> Dict:
        """Envoie les blocs vers une page Notion avec propriétés optionnelles"""
        if not self.notion_client:
            return {"success": False, "error": "Client Notion non configuré"}

        try:
            # Logger pour debug
            logger.info(f"Envoi vers page {page_id}")
            logger.info(f"Properties DB: {properties}")
            logger.info(f"Page properties: {page_properties}")
            
            # Gérer les propriétés de page seulement si elles sont fournies
            if page_properties and any(page_properties.values()):  # Vérifier qu'il y a des valeurs non vides
                update_payload = {}
                # Icône - seulement si fournie
                if page_properties.get('icon'):
                    icon_value = page_properties['icon']
                    # Déterminer si c'est un emoji ou une URL
                    if icon_value.startswith('http'):
                        update_payload['icon'] = {
                            'type': 'external',
                            'external': {'url': icon_value}
                        }
                    else:
                        # C'est un emoji
                        update_payload['icon'] = {
                            'type': 'emoji',
                            'emoji': icon_value
                        }
                # Cover - seulement si fourni
                if page_properties.get('cover'):
                    update_payload['cover'] = {
                        'type': 'external',
                        'external': {'url': page_properties['cover']}
                    }
                # Appliquer les mises à jour seulement s'il y a quelque chose à mettre à jour
                if update_payload:
                    try:
                        logger.info(f"Mise à jour page avec: {update_payload}")
                        self.notion_client.pages.update(
                            page_id=page_id,
                            **update_payload
                        )
                    except Exception as e:
                        logger.warning(f"Erreur mise à jour propriétés page: {e}")
            
            # Gérer les propriétés de base de données si présentes
            if properties:
                try:
                    # Récupérer les infos de la page pour vérifier si c'est une DB
                    page_info = ensure_sync_response(self.notion_client.pages.retrieve(page_id))
                    if page_info.get('parent', {}).get('type') == 'database_id':
                        database_id = page_info['parent']['database_id']
                        db_info = ensure_sync_response(self.notion_client.databases.retrieve(database_id))
                        db_schema = db_info.get('properties', {})
                        
                        formatted_props = self._format_database_properties(properties, db_schema)
                        if formatted_props:
                            self.notion_client.pages.update(
                                page_id=page_id,
                                properties=formatted_props
                            )
                except Exception as e:
                    logger.warning(f"Erreur mise à jour propriétés DB: {e}")
            
            # Envoyer les blocs de contenu
            result = self.notion_client.blocks.children.append(
                block_id=page_id,
                children=blocks
            )
            
            return {
                "success": True,
                "blocksCount": len(blocks),
                "result": result
            }
            
        except Exception as e:
            logger.error(f"Erreur envoi Notion: {str(e)}")
            return {"success": False, "error": str(e)}

    def _format_database_properties(self, properties: Dict, db_schema: Dict) -> Dict:
        """Formate les propriétés selon le schéma de la base de données"""
        formatted = {}
        
        for prop_name, prop_value in properties.items():
            # Chercher la propriété dans le schéma (case insensitive)
            schema_prop = None
            for schema_name, schema_config in db_schema.items():
                if schema_name.lower() == prop_name.lower():
                    schema_prop = (schema_name, schema_config)
                    break
            
            if not schema_prop:
                logger.warning(f"Propriété '{prop_name}' non trouvée dans le schéma")
                continue
            
            actual_name, prop_config = schema_prop
            prop_type = prop_config.get('type')
            
            # Ignorer les valeurs vides/null
            if prop_value is None or prop_value == '' or (isinstance(prop_value, list) and len(prop_value) == 0):
                continue
            
            try:
                if prop_type == 'title':
                    formatted[actual_name] = {
                        'title': [{'text': {'content': str(prop_value)}}]
                    }
                elif prop_type == 'rich_text':
                    formatted[actual_name] = {
                        'rich_text': [{'text': {'content': str(prop_value)}}]
                    }
                elif prop_type == 'number':
                    if isinstance(prop_value, list):
                        logger.warning(f"Propriété number '{actual_name}' reçue comme liste: {prop_value}")
                        continue
                    formatted[actual_name] = {
                        'number': float(prop_value) if prop_value else None
                    }
                elif prop_type == 'checkbox':
                    formatted[actual_name] = {
                        'checkbox': bool(prop_value)
                    }
                elif prop_type == 'select':
                    formatted[actual_name] = {
                        'select': {'name': str(prop_value)} if prop_value else None
                    }
                elif prop_type == 'multi_select':
                    values = prop_value if isinstance(prop_value, list) else [prop_value]
                    formatted[actual_name] = {
                        'multi_select': [{'name': str(v)} for v in values if v]
                    }
                elif prop_type == 'date':
                    formatted[actual_name] = {
                        'date': {'start': prop_value} if prop_value else None
                    }
                elif prop_type == 'url':
                    formatted[actual_name] = {
                        'url': str(prop_value) if prop_value else None
                    }
                elif prop_type == 'email':
                    formatted[actual_name] = {
                        'email': str(prop_value) if prop_value else None
                    }
                elif prop_type == 'phone_number':
                    formatted[actual_name] = {
                        'phone_number': str(prop_value) if prop_value else None
                    }
                elif prop_type == 'people':
                    logger.info(f"Type 'people' non supporté pour l'instant")
                elif prop_type == 'files':
                    if isinstance(prop_value, str) and prop_value.startswith('http'):
                        formatted[actual_name] = {
                            'files': [{'type': 'external', 'external': {'url': prop_value}}]
                        }
                elif prop_type == 'relation':
                    # Les relations nécessitent des IDs de pages
                    if isinstance(prop_value, list):
                        formatted[actual_name] = {
                            'relation': [{'id': page_id} for page_id in prop_value if page_id]
                        }
                    else:
                        logger.info(f"Type 'relation' nécessite une liste d'IDs de pages")
                elif prop_type == 'formula':
                    logger.info(f"Type 'formula' est en lecture seule")
                elif prop_type == 'rollup':
                    logger.info(f"Type 'rollup' est en lecture seule")
                # Ajout du support pour status
                elif prop_type == 'status':
                    options = prop_config.get('status', {}).get('options', [])
                    valid_names = [opt['name'] for opt in options]
                    if str(prop_value) in valid_names:
                        formatted[actual_name] = {
                            'status': {'name': str(prop_value)}
                        }
                    else:
                        logger.warning(f"Status '{prop_value}' non valide. Options: {valid_names}")
                elif prop_type == 'created_time':
                    pass  # Lecture seule
                elif prop_type == 'created_by':
                    pass  # Lecture seule
                elif prop_type == 'last_edited_time':
                    pass  # Lecture seule
                elif prop_type == 'last_edited_by':
                    pass  # Lecture seule
                else:
                    logger.warning(f"Type de propriété non supporté: {prop_type}")
            except Exception as e:
                logger.error(f"Erreur formatage propriété {prop_name}: {e}")
        return formatted

    def _validate_required_properties(self, properties: Dict, db_schema: Dict) -> List[str]:
        """Valide que les propriétés requises sont présentes"""
        errors = []
        for prop_name, prop_config in db_schema.items():
            if prop_config.get('type') == 'title' and not properties.get(prop_name):
                errors.append(f"La propriété titre '{prop_name}' est requise")
        return errors
    
    def search_pages(self, query: str) -> List[Dict]:
        """Recherche des pages dans Notion"""
        if not self.notion_client:
            return []
        
        try:
            response = self.notion_client.search(
                query=query,
                filter={"property": "object", "value": "page"},
                page_size=20
            )
            response = ensure_sync_response(response)
            response = ensure_dict(response)
            
            pages = []
            for page in response.get("results", []):
                pages.append(self._format_page_data(page))
            
            self.stats_manager.increment('api_calls')
            return pages
            
        except Exception as e:
            print(f"Erreur recherche: {e}")
            self.stats_manager.increment('errors')
            return []
    
    def get_databases(self) -> List[Dict]:
        """Récupère toutes les bases de données accessibles"""
        if not self.notion_client:
            return []
        
        try:
            response = self.notion_client.search(
                filter={"property": "object", "value": "database"}
            )
            response = ensure_sync_response(response)
            response = ensure_dict(response)
            
            databases = []
            for db in response.get("results", []):
                databases.append({
                    "id": db["id"],
                    "title": self._get_database_title(db),
                    "icon": db.get("icon"),
                    "url": db.get("url"),
                    "properties": db.get("properties", {})
                })
            
            self.stats_manager.increment('api_calls')
            return databases
            
        except Exception as e:
            print(f"Erreur récupération bases de données: {e}")
            self.stats_manager.increment('errors')
            return []
    
    def update_preview_page(self, preview_page_id: str, blocks: List[Dict]) -> bool:
        """Met à jour la page de preview avec les nouveaux blocs"""
        if not self.notion_client or not preview_page_id:
            return False
        
        try:
            # Méthode optimisée : supprimer tous les blocs en une seule requête
            # au lieu de les supprimer un par un
            try:
                # Récupérer le premier bloc enfant
                response = self.notion_client.blocks.children.list(
                    preview_page_id, 
                    page_size=1
                )
                response = ensure_sync_response(response)
                response = ensure_dict(response)
                
                if response.get("results"):
                    first_block_id = response["results"][0]["id"]
                    
                    # Remplacer tout le contenu en une fois
                    # en utilisant le premier bloc comme point d'ancrage
                    self.notion_client.blocks.update(
                        first_block_id,
                        archived=True
                    )
                    
                    # Créer un nouveau contenu vide rapidement
                    self.notion_client.blocks.children.append(
                        block_id=preview_page_id,
                        children=[{
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{
                                    "type": "text",
                                    "text": {"content": ""}
                                }]
                            }
                        }]
                    )
            except:
                # Si échec, continuer avec la méthode normale
                pass
            
            # Ajouter les nouveaux blocs
            if blocks:
                from backend.parsers.markdown_parser import validate_notion_blocks
                validated_blocks = validate_notion_blocks(blocks)
                
                # Envoyer par batch de 100 blocs maximum
                for i in range(0, len(validated_blocks), 100):
                    batch = validated_blocks[i:i+100]
                    self.notion_client.blocks.children.append(
                        block_id=preview_page_id,
                        children=batch
                    )
            else:
                # Si pas de blocs, ajouter un paragraphe vide
                self.notion_client.blocks.children.append(
                    block_id=preview_page_id,
                    children=[{
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{
                                "type": "text",
                                "text": {"content": "Aucun contenu"}
                            }]
                        }
                    }]
                )
            
            return True
            
        except Exception as e:
            print(f"Erreur mise à jour preview: {e}")
            return False
    
    # Méthodes de détection de format
    def _is_image(self, content: str) -> bool:
        """Détecte si le contenu est une image"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'}
        content_lower = content.lower()
        
        if content.startswith('data:image/'):
            return True
        
        if content.startswith(('http://', 'https://')):
            for ext in image_extensions:
                if ext in content_lower:
                    return True
        
        return any(content_lower.endswith(ext) for ext in image_extensions)
    
    def _is_video(self, content: str) -> bool:
        """Détecte si le contenu est une vidéo"""
        video_domains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com']
        video_extensions = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'}
        
        return (any(domain in content for domain in video_domains) or
                any(content.lower().endswith(ext) for ext in video_extensions))
    
    def _is_audio(self, content: str) -> bool:
        """Détecte si le contenu est un fichier audio"""
        audio_domains = ['soundcloud.com', 'spotify.com']
        audio_extensions = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'}
        
        return (any(domain in content for domain in audio_domains) or
                any(content.lower().endswith(ext) for ext in audio_extensions))
    
    def _is_table(self, content: str) -> bool:
        """Détecte si le contenu est un tableau"""
        lines = content.strip().split('\n')
        if len(lines) < 2:
            return False
        
        # Détecter les séparateurs de tableau
        separators = ['|', '\t', ',', ';']
        for sep in separators:
            if all(sep in line for line in lines[:3]):
                return True
        
        return False
    
    def _is_code(self, content: str) -> bool:
        """Détecte si le contenu est du code"""
        code_indicators = [
            'function', 'def ', 'class ', 'import ', 'from ',
            'const ', 'let ', 'var ', 'return ', 'if (',
            'for (', 'while (', '```', '{', '}', '=>'
        ]
        
        # Compter les indicateurs
        count = sum(1 for indicator in code_indicators if indicator in content)
        return count >= 2
    
    def _is_url(self, content: str) -> bool:
        """Détecte si le contenu est une URL"""
        content = content.strip()
        return (content.startswith(('http://', 'https://', 'ftp://')) and
                ' ' not in content and '\n' not in content)
    
    def _is_markdown(self, content: str) -> bool:
        """Détecte si le contenu est du Markdown"""
        markdown_patterns = [
            r'^#{1,6}\s',  # Headers
            r'\*\*[\w\s]+\*\*',  # Bold
            r'\*[\w\s]+\*',  # Italic
            r'\[[\w\s]+\]\([\w\s]+\)',  # Links
            r'^\s*[-*+]\s',  # Lists
            r'^\s*\d+\.\s',  # Numbered lists
            r'^>\s',  # Quotes
            r'```[\w]*\n',  # Code blocks
        ]
        
        import re
        for pattern in markdown_patterns:
            if re.search(pattern, content, re.MULTILINE):
                return True
        
        return False
    
    def _is_document(self, content: str) -> bool:
        """Détecte si le contenu est un document"""
        doc_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'}
        return any(content.lower().endswith(ext) for ext in doc_extensions)
    
    # Méthodes utilitaires
    def _format_page_data(self, page_data: Dict) -> Dict:
        """Formate les données d'une page pour l'API"""
        title = extract_notion_page_title(page_data)
        icon = None
        
        # Extraire l'icône (emoji ou URL)
        if "icon" in page_data and page_data["icon"]:
            icon_data = page_data["icon"]
            if isinstance(icon_data, dict):
                if icon_data.get("type") == "emoji":
                    icon = icon_data.get("emoji")
                elif icon_data.get("type") == "external":
                    icon = icon_data.get("external", {}).get("url")
                elif icon_data.get("type") == "file":
                    icon = icon_data.get("file", {}).get("url")
            elif isinstance(icon_data, str):
                icon = icon_data
        
        return {
            "id": page_data["id"],
            "title": title,
            "icon": icon,
            "url": page_data.get("url"),
            "last_edited": page_data.get("last_edited_time"),
            "created_time": page_data.get("created_time"),
            "parent_type": page_data.get("parent", {}).get("type", "page"),
            "properties": page_data.get("properties", {}),
            "cover": page_data.get("cover")
        }

    def _get_database_title(self, db: Dict) -> str:
        """Extrait le titre d'une base de données"""
        if "title" in db and db["title"]:
            return db["title"][0].get("plain_text", "Base de données")
        return "Base de données"
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques globales"""
        stats = self.stats_manager.get_all_stats()
        cache_stats = self.cache.get_stats()
        stats.update({
            "cache": {
                "pages_count": cache_stats.get("pages_count", 0),
                "size_bytes": cache_stats.get("size_bytes", 0),
                "size_mb": cache_stats.get("size_mb", 0.0)
            }
        })
        return stats
    
    def get_recent_logs(self) -> List[str]:
        """Retourne les logs récents"""
        # TODO: Implémenter un système de logging
        return ["Système de logs à implémenter"]

    def get_clipboard_content(self):
        """
        Récupère le contenu du presse-papiers de manière simple
        """
        try:
            import platform
            system = platform.system()
            
            if system == "Windows":
                # Windows - méthode simple avec tkinter
                try:
                    import tkinter as tk
                    root = tk.Tk()
                    root.withdraw()  # Cacher la fenêtre
                    clipboard_content = root.clipboard_get()
                    root.destroy()
                    return clipboard_content
                except:
                    # Fallback avec win32clipboard si disponible
                    try:
                        import win32clipboard
                        win32clipboard.OpenClipboard()
                        data = win32clipboard.GetClipboardData(win32clipboard.CF_UNICODETEXT)
                        win32clipboard.CloseClipboard()
                        return data
                    except:
                        return None
                        
            elif system == "Darwin":  # macOS
                # Utiliser pbpaste
                import subprocess
                result = subprocess.run(['pbpaste'], 
                                      capture_output=True, 
                                      text=True, 
                                      encoding='utf-8')
                if result.returncode == 0:
                    return result.stdout
                return None
                
            else:  # Linux
                # Essayer xclip
                import subprocess
                try:
                    result = subprocess.run(['xclip', '-selection', 'clipboard', '-o'],
                                          capture_output=True,
                                          text=True,
                                          encoding='utf-8')
                    if result.returncode == 0:
                        return result.stdout
                except:
                    pass
                
                # Fallback sur xsel
                try:
                    result = subprocess.run(['xsel', '--clipboard', '--output'],
                                          capture_output=True,
                                          text=True,
                                          encoding='utf-8')
                    if result.returncode == 0:
                        return result.stdout
                except:
                    pass
                
                return None
                
        except Exception as e:
            print(f"Erreur lecture presse-papiers: {e}")
            return None

    def clear_clipboard(self):
        """
        Vide le presse-papiers
        """
        try:
            import platform
            system = platform.system()
            
            if system == "Windows":
                try:
                    import tkinter as tk
                    root = tk.Tk()
                    root.withdraw()
                    root.clipboard_clear()
                    root.clipboard_append("")
                    root.destroy()
                    return True
                except:
                    return False
                    
            elif system == "Darwin":  # macOS
                import subprocess
                subprocess.run(['pbcopy'], input='', text=True)
                return True
                
            else:  # Linux
                import subprocess
                try:
                    subprocess.run(['xclip', '-selection', 'clipboard'], 
                                 input='', text=True)
                    return True
                except:
                    return False
                
        except Exception as e:
            print(f"Erreur vidage presse-papiers: {e}")
            return False

    def set_clipboard_content(self, content):
        """
        Définit le contenu du presse-papiers
        """
        try:
            import platform
            system = platform.system()
            
            if system == "Windows":
                try:
                    import tkinter as tk
                    root = tk.Tk()
                    root.withdraw()
                    root.clipboard_clear()
                    root.clipboard_append(content)
                    root.destroy()
                    return True
                except:
                    return False
                    
            elif system == "Darwin":  # macOS
                import subprocess
                process = subprocess.Popen(['pbcopy'], 
                                         stdin=subprocess.PIPE,
                                         text=True)
                process.communicate(input=content)
                return process.returncode == 0
                
            else:  # Linux
                import subprocess
                try:
                    process = subprocess.Popen(['xclip', '-selection', 'clipboard'],
                                             stdin=subprocess.PIPE,
                                             text=True)
                    process.communicate(input=content)
                    return process.returncode == 0
                except:
                    return False
                
        except Exception as e:
            print(f"Erreur écriture presse-papiers: {e}")
            return False

    def initialize_notion_client(self, token: str) -> bool:
        """Initialise ou réinitialise le client Notion avec un nouveau token"""
        try:
            self.notion_client = Client(auth=token)
            # Tester la connexion
            self.notion_client.users.me()
            
            # Réinitialiser le parser si nécessaire
            if self.imgbb_key:
                self.content_parser = EnhancedContentParser(imgbb_key=self.imgbb_key)
            
            # Redémarrer le polling
            if self.polling_manager and self.polling_manager.running:
                self.polling_manager.stop()
                self.polling_manager.start()
            
            return True
        except Exception as e:
            print(f"Erreur initialisation client Notion: {e}")
            self.notion_client = None
            return False