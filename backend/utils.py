"""
Module utilitaire optimisé pour Notion Clipper Pro
Gestion du presse-papiers multi-format et fonctions helpers
"""

import os
import sys
import base64
import mimetypes
import tempfile
from io import BytesIO
from typing import Dict, Optional, Any, Union, Tuple
from pathlib import Path

# Import conditionnel des modules système
try:
    import pyperclip
except ImportError:
    pyperclip = None

try:
    from PIL import ImageGrab, Image
except ImportError:
    ImageGrab = None
    Image = None

try:
    import win32clipboard
    import win32con
    WINDOWS = True
except ImportError:
    win32clipboard = None
    WINDOWS = False

# Import optionnel pour le typage statique (évite l'erreur de linter)
MACOS = False
AppKit = None
Foundation = None

if sys.platform == "darwin":
    try:
        import importlib
        AppKit = importlib.import_module("AppKit")
        Foundation = importlib.import_module("Foundation")
        MACOS = True
    except ImportError:
        AppKit = None
        Foundation = None
        MACOS = False


class ClipboardManager:
    """Gestionnaire de presse-papiers multi-plateforme et multi-format"""
    
    def __init__(self):
        self.platform = self._detect_platform()
        self.max_size = 10 * 1024 * 1024  # 10MB max
    
    def _detect_platform(self) -> str:
        """Détecte la plateforme"""
        if sys.platform.startswith('win'):
            return 'windows'
        elif sys.platform.startswith('darwin'):
            return 'macos'
        else:
            return 'linux'
    
    def get_content(self) -> Dict[str, Any]:
        """Récupère le contenu du presse-papiers avec détection du type"""
        try:
            # Essayer d'abord l'image
            image_content = self._get_image()
            if image_content:
                return image_content
            
            # Ensuite les fichiers
            file_content = self._get_files()
            if file_content:
                return file_content
            
            # Enfin le texte
            text_content = self._get_text()
            if text_content:
                return text_content
            
            return {
                "type": "empty",
                "content": "",
                "message": "Presse-papiers vide"
            }
            
        except Exception as e:
            return {
                "type": "error",
                "content": "",
                "error": str(e)
            }
    
    def _get_text(self) -> Optional[Dict[str, Any]]:
        """Récupère le texte du presse-papiers"""
        try:
            if pyperclip:
                text = pyperclip.paste()
                if text:
                    # Détecter le type de texte
                    content_type = self._detect_text_type(text)
                    return {
                        "type": content_type,
                        "content": text[:self.max_size],  # Limiter la taille
                        "truncated": len(text) > self.max_size,
                        "original_length": len(text)
                    }
            # Fallback Windows
            if WINDOWS and win32clipboard:
                win32clipboard.OpenClipboard()
                try:
                    if win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
                        text = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
                        if text:
                            content_type = self._detect_text_type(text)
                            return {
                                "type": content_type,
                                "content": text[:self.max_size],
                                "truncated": len(text) > self.max_size
                            }
                finally:
                    win32clipboard.CloseClipboard()
            return None
        except Exception as e:
            print(e)
            return None
    
    def _get_image(self) -> Optional[Dict[str, Any]]:
        """Récupère une image du presse-papiers"""
        try:
            if ImageGrab and hasattr(ImageGrab, 'grabclipboard'):
                img = ImageGrab.grabclipboard()
                if img and Image and isinstance(img, Image.Image):
                    # Convertir en base64
                    buffered = BytesIO()
                    
                    # Optimiser le format
                    format = 'PNG' if img.mode in ('RGBA', 'LA') else 'JPEG'
                    img.save(buffered, format=format, quality=85, optimize=True)
                    
                    img_data = buffered.getvalue()
                    
                    # Vérifier la taille
                    if len(img_data) > self.max_size:
                        # Redimensionner si trop grand
                        img = self._resize_image(img)
                        buffered = BytesIO()
                        img.save(buffered, format=format, quality=75, optimize=True)
                        img_data = buffered.getvalue()
                    
                    base64_data = base64.b64encode(img_data).decode()
                    
                    return {
                        "type": "image",
                        "content": f"data:image/{format.lower()};base64,{base64_data}",
                        "format": format.lower(),
                        "size": len(img_data),
                        "dimensions": img.size
                    }
            
            # macOS spécifique
            if MACOS and AppKit:
                pb = AppKit.NSPasteboard.generalPasteboard()
                types = pb.types()
                
                if AppKit.NSPasteboardTypePNG in types:
                    data = pb.dataForType_(AppKit.NSPasteboardTypePNG)
                    if data:
                        img_data = bytes(data)
                        base64_data = base64.b64encode(img_data).decode()
                        return {
                            "type": "image",
                            "content": f"data:image/png;base64,{base64_data}",
                            "format": "png",
                            "size": len(img_data)
                        }
            
            return None
            
        except Exception as e:
            print(e)
            return None
    
    def _get_files(self) -> Optional[Dict[str, Any]]:
        """Récupère les fichiers du presse-papiers"""
        try:
            if WINDOWS and win32clipboard:
                win32clipboard.OpenClipboard()
                try:
                    if win32clipboard.IsClipboardFormatAvailable(win32con.CF_HDROP):
                        files = win32clipboard.GetClipboardData(win32con.CF_HDROP)
                        if files:
                            file_list = []
                            for file_path in files:
                                if os.path.exists(file_path):
                                    file_info = self._get_file_info(file_path)
                                    file_list.append(file_info)
                            
                            if file_list:
                                return {
                                    "type": "files",
                                    "content": file_list[0]['path'] if len(file_list) == 1 else str(file_list),
                                    "files": file_list,
                                    "count": len(file_list)
                                }
                finally:
                    win32clipboard.CloseClipboard()
            
            return None
            
        except Exception as e:
            print(e)
            return None
    
    def _detect_text_type(self, text: str) -> str:
        """Détecte le type de contenu textuel"""
        text_lower = text.lower().strip()
        
        # URL
        if text_lower.startswith(('http://', 'https://')):
            if any(pattern in text_lower for pattern in ['youtube.com', 'youtu.be']):
                return 'video'
            elif any(ext in text_lower for ext in ['.jpg', '.png', '.gif', '.webp']):
                return 'image'
            else:
                return 'url'
        
        # Tableau
        lines = text.strip().split('\n')
        if len(lines) > 1 and any(sep in lines[0] for sep in ['\t', '|', ',']):
            return 'table'
        
        # Code
        if text.strip().startswith('```') or any(
            keyword in text for keyword in ['function', 'def ', 'class ', 'import ']
        ):
            return 'code'
        
        # Markdown
        if any(pattern in text for pattern in ['# ', '## ', '**', '[](', '```']):
            return 'markdown'
        
        return 'text'
    
    def _get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Récupère les informations d'un fichier"""
        path = Path(file_path)
        mime_type, _ = mimetypes.guess_type(str(path))
        
        return {
            'path': str(path),
            'name': path.name,
            'extension': path.suffix,
            'mime_type': mime_type,
            'size': path.stat().st_size if path.exists() else 0,
            'exists': path.exists()
        }
    
    def _resize_image(self, img: Any, max_dimension: int = 2048) -> Any:
        """Redimensionne une image si nécessaire"""
        if img.width > max_dimension or img.height > max_dimension:
            # Fallback pour compatibilité Pillow < 9.1.0
            resample = getattr(getattr(Image, 'Resampling', Image), 'LANCZOS', getattr(Image, 'LANCZOS', 1))
            img.thumbnail((max_dimension, max_dimension), resample)
        return img


class FileHandler:
    """Gestionnaire de fichiers avec support étendu"""
    
    def __init__(self):
        self.supported_formats = {
            # Images
            '.jpg': 'image', '.jpeg': 'image', '.png': 'image',
            '.gif': 'image', '.webp': 'image', '.svg': 'image',
            '.bmp': 'image', '.ico': 'image',
            
            # Vidéos
            '.mp4': 'video', '.avi': 'video', '.mov': 'video',
            '.wmv': 'video', '.flv': 'video', '.mkv': 'video',
            
            # Audio
            '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio',
            '.m4a': 'audio', '.flac': 'audio', '.aac': 'audio',
            
            # Documents
            '.pdf': 'document', '.doc': 'document', '.docx': 'document',
            '.xls': 'document', '.xlsx': 'document', '.ppt': 'document',
            '.pptx': 'document', '.odt': 'document', '.ods': 'document',
            
            # Code
            '.py': 'code', '.js': 'code', '.java': 'code',
            '.cpp': 'code', '.c': 'code', '.cs': 'code',
            '.php': 'code', '.rb': 'code', '.go': 'code',
            '.rs': 'code', '.swift': 'code', '.kt': 'code',
            
            # Données
            '.json': 'code', '.xml': 'code', '.yaml': 'code',
            '.csv': 'table', '.tsv': 'table',
            
            # Texte
            '.txt': 'text', '.md': 'markdown', '.rst': 'text',
            '.log': 'text', '.ini': 'text', '.cfg': 'text'
        }
    
    def get_file_type(self, file_path: str) -> str:
        """Détermine le type d'un fichier"""
        path = Path(file_path)
        extension = path.suffix.lower()
        
        # Type connu
        if extension in self.supported_formats:
            return self.supported_formats[extension]
        
        # Détection par MIME type
        mime_type, _ = mimetypes.guess_type(str(path))
        if mime_type:
            if mime_type.startswith('image/'):
                return 'image'
            elif mime_type.startswith('video/'):
                return 'video'
            elif mime_type.startswith('audio/'):
                return 'audio'
            elif mime_type.startswith('text/'):
                return 'text'
        
        return 'file'
    
    def read_file_content(self, file_path: str, max_size: int = 5 * 1024 * 1024) -> Optional[str]:
        """Lit le contenu d'un fichier de manière sûre"""
        try:
            path = Path(file_path)
            
            if not path.exists() or not path.is_file():
                return None
            
            # Vérifier la taille
            if path.stat().st_size > max_size:
                return None
            
            # Lire selon le type
            file_type = self.get_file_type(file_path)
            
            if file_type in ['text', 'markdown', 'code']:
                # Fichiers texte
                encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
                for encoding in encodings:
                    try:
                        return path.read_text(encoding=encoding)
                    except UnicodeDecodeError:
                        continue
            
            elif file_type == 'image':
                # Images en base64
                with open(path, 'rb') as f:
                    data = f.read()
                
                mime_type, _ = mimetypes.guess_type(str(path))
                if not mime_type:
                    mime_type = 'image/png'
                
                base64_data = base64.b64encode(data).decode()
                return f"data:{mime_type};base64,{base64_data}"
            
            return None
            
        except Exception as e:
            print(e)
            return None
    
    def create_temp_file(self, content: bytes, extension: str = '') -> Optional[str]:
        """Crée un fichier temporaire"""
        try:
            with tempfile.NamedTemporaryFile(
                mode='wb',
                suffix=extension,
                delete=False
            ) as tmp:
                tmp.write(content)
                return tmp.name
        except Exception as e:
            print(e)
            return None


# Instance globale
clipboard_manager = ClipboardManager()
file_handler = FileHandler()


def get_clipboard_content() -> Dict[str, Any]:
    """Fonction principale pour récupérer le contenu du presse-papiers"""
    return clipboard_manager.get_content()


def detect_content_format(content: str, file_path: Optional[str] = None) -> str:
    """Détecte le format d'un contenu"""
    if file_path:
        return file_handler.get_file_type(file_path)
    
    # Utiliser la détection du clipboard manager
    return clipboard_manager._detect_text_type(content)


def optimize_content_for_notion(content: str, content_type: str) -> Tuple[str, str]:
    """Optimise le contenu pour Notion"""
    # Limites Notion
    MAX_TEXT_LENGTH = 2000
    MAX_URL_LENGTH = 2000
    
    if content_type == 'text' and len(content) > MAX_TEXT_LENGTH:
        # Tronquer intelligemment
        truncated = content[:MAX_TEXT_LENGTH-3] + "..."
        return truncated, content_type
    
    elif content_type == 'url' and len(content) > MAX_URL_LENGTH:
        # URL trop longue
        return content[:MAX_URL_LENGTH], content_type
    
    elif content_type == 'table':
        # Vérifier que c'est bien un tableau
        lines = content.strip().split('\n')
        if len(lines) < 2:
            return content, 'text'
    
    return content, content_type


def sanitize_for_json(obj: Any) -> Any:
    """Nettoie un objet pour la sérialisation JSON"""
    if isinstance(obj, bytes):
        return base64.b64encode(obj).decode()
    elif isinstance(obj, Path):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(item) for item in obj]
    else:
        return obj