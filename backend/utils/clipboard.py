"""
Gestionnaire du presse-papiers pour Notion Clipper Pro
Extrait de l'ancien utils.py
"""

import platform
import subprocess
import base64
import tempfile
import mimetypes
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from PIL import Image


class ClipboardManager:
    """Gestionnaire multiplateforme du presse-papiers"""
    
    def __init__(self):
        self.system = platform.system()
    
    def get_content(self) -> Dict[str, Any]:
        """Récupère le contenu du presse-papiers"""
        try:
            # D'abord essayer de récupérer une image
            image_content = self._get_clipboard_image()
            if image_content:
                return image_content
            
            # Sinon récupérer le texte
            text = self._get_clipboard_text()
            if text:
                content_type = self._detect_text_type(text)
                return {
                    "type": content_type,
                    "content": text,
                    "source": "clipboard"
                }
            
            return {
                "type": "empty",
                "content": "",
                "source": "clipboard"
            }
            
        except Exception as e:
            print(f"Erreur lecture presse-papiers: {e}")
            return {
                "type": "error",
                "content": "",
                "error": str(e)
            }
    
    def _get_clipboard_text(self) -> Optional[str]:
        """Récupère le texte du presse-papiers selon l'OS"""
        try:
            if self.system == "Windows":
                import win32clipboard
                import win32con
                win32clipboard.OpenClipboard()
                try:
                    data = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
                    return data
                finally:
                    win32clipboard.CloseClipboard()
            
            elif self.system == "Darwin":  # macOS
                result = subprocess.run(
                    ['pbpaste'],
                    capture_output=True,
                    text=True
                )
                return result.stdout
            
            else:  # Linux
                # Essayer xclip d'abord
                try:
                    result = subprocess.run(
                        ['xclip', '-selection', 'clipboard', '-o'],
                        capture_output=True,
                        text=True
                    )
                    return result.stdout
                except:
                    # Fallback vers xsel
                    result = subprocess.run(
                        ['xsel', '--clipboard', '--output'],
                        capture_output=True,
                        text=True
                    )
                    return result.stdout
                    
        except Exception as e:
            print(f"Erreur lecture texte: {e}")
            # Fallback vers pyperclip
            try:
                import pyperclip
                return pyperclip.paste()
            except:
                return None
    
    def _get_clipboard_image(self) -> Optional[Dict[str, Any]]:
        """Récupère une image du presse-papiers"""
        try:
            if self.system == "Windows":
                import win32clipboard
                import win32con
                win32clipboard.OpenClipboard()
                try:
                    data = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
                    return data
                finally:
                    win32clipboard.CloseClipboard()
            elif self.system == "Darwin":
                return self._get_mac_image()
            else:
                return self._get_linux_image()
        except Exception as e:
            print(f"Pas d'image dans le presse-papiers: {e}")
            return None
    
    def _get_windows_image(self) -> Optional[Dict[str, Any]]:
        """Récupère une image sous Windows"""
        try:
            from PIL import ImageGrab
            img = ImageGrab.grabclipboard()
            
            if img:
                import io
                if isinstance(img, list):
                    # Si c'est une liste de fichiers, tenter d'ouvrir le premier fichier image
                    for file_path in img:
                        try:
                            with Image.open(file_path) as opened_img:
                                buffer = io.BytesIO()
                                opened_img.save(buffer, format='PNG')
                                img_base64 = base64.b64encode(buffer.getvalue()).decode()
                                return {
                                    "type": "image",
                                    "content": f"data:image/png;base64,{img_base64}",
                                    "source": "clipboard",
                                    "format": "base64"
                                }
                        except Exception:
                            continue  # Essayer le fichier suivant si ce n'est pas une image
                elif hasattr(img, 'save'):
                    buffer = io.BytesIO()
                    img.save(buffer, format='PNG')
                    img_base64 = base64.b64encode(buffer.getvalue()).decode()
                    return {
                        "type": "image",
                        "content": f"data:image/png;base64,{img_base64}",
                        "source": "clipboard",
                        "format": "base64"
                    }
        except:
            pass
        return None
    
    def _get_mac_image(self) -> Optional[Dict[str, Any]]:
        """Récupère une image sous macOS"""
        try:
            # Utiliser osascript pour vérifier le type
            script = '''
            on run
                set dataTypes to (clipboard info)
                return dataTypes as string
            end run
            '''
            
            result = subprocess.run(
                ['osascript', '-e', script],
                capture_output=True,
                text=True
            )
            
            if 'TIFF' in result.stdout or 'PNG' in result.stdout:
                # Sauvegarder l'image temporairement
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    subprocess.run([
                        'osascript', '-e',
                        f'write (the clipboard as «class PNGf») to (POSIX file "{tmp.name}")'
                    ])
                    
                    # Lire et convertir en base64
                    with open(tmp.name, 'rb') as f:
                        img_base64 = base64.b64encode(f.read()).decode()
                    
                    # Supprimer le fichier temporaire
                    Path(tmp.name).unlink()
                    
                    return {
                        "type": "image",
                        "content": f"data:image/png;base64,{img_base64}",
                        "source": "clipboard",
                        "format": "base64"
                    }
        except:
            pass
        return None
    
    def _get_linux_image(self) -> Optional[Dict[str, Any]]:
        """Récupère une image sous Linux"""
        try:
            # Vérifier si xclip contient une image
            result = subprocess.run(
                ['xclip', '-selection', 'clipboard', '-t', 'TARGETS', '-o'],
                capture_output=True,
                text=True
            )
            
            if 'image/png' in result.stdout:
                # Récupérer l'image
                result = subprocess.run(
                    ['xclip', '-selection', 'clipboard', '-t', 'image/png', '-o'],
                    capture_output=True
                )
                
                img_base64 = base64.b64encode(result.stdout).decode()
                
                return {
                    "type": "image",
                    "content": f"data:image/png;base64,{img_base64}",
                    "source": "clipboard",
                    "format": "base64"
                }
        except:
            pass
        return None
    
    def _detect_text_type(self, text: str) -> str:
        """Détecte le type de contenu textuel"""
        text = text.strip()
        
        # URL
        if text.startswith(('http://', 'https://', 'ftp://')):
            return 'url'
        
        # Code (détection basique)
        code_indicators = ['def ', 'function ', 'class ', 'import ', 'const ', 'let ', 'var ']
        if any(indicator in text for indicator in code_indicators):
            return 'code'
        
        # Markdown
        if any(pattern in text for pattern in ['# ', '## ', '**', '```', '- [ ]']):
            return 'markdown'
        
        # Table
        lines = text.split('\n')
        if len(lines) > 1 and all('|' in line or '\t' in line for line in lines[:3]):
            return 'table'
        
        # Par défaut
        return 'text'


class FileHandler:
    """Gestionnaire de fichiers (extrait de l'ancien utils.py)"""
    
    def __init__(self):
        self.text_extensions = {
            '.txt', '.md', '.markdown', '.rst', '.log', '.csv', '.json',
            '.xml', '.yaml', '.yml', '.ini', '.cfg', '.conf'
        }
        
        self.code_extensions = {
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
            '.r', '.m', '.h', '.hpp', '.css', '.scss', '.sass', '.less',
            '.html', '.htm', '.vue', '.sql', '.sh', '.bash', '.ps1',
            '.dockerfile', '.makefile'
        }
        
        self.image_extensions = {
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',
            '.ico', '.tiff', '.tif'
        }
        
        self.document_extensions = {
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.odt', '.ods', '.odp'
        }
    
    def get_file_type(self, file_path: str) -> str:
        """Détermine le type d'un fichier"""
        path = Path(file_path)
        ext = path.suffix.lower()
        
        if ext in self.code_extensions:
            return 'code'
        elif ext in self.image_extensions:
            return 'image'
        elif ext in self.document_extensions:
            return 'document'
        elif ext in self.text_extensions:
            return 'text'
        else:
            # Utiliser mimetypes comme fallback
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type:
                if mime_type.startswith('text/'):
                    return 'text'
                elif mime_type.startswith('image/'):
                    return 'image'
                elif mime_type.startswith('video/'):
                    return 'video'
                elif mime_type.startswith('audio/'):
                    return 'audio'
            
            return 'file'
    
    def read_file(self, file_path: str, file_type: Optional[str] = None) -> Optional[str]:
        """Lit le contenu d'un fichier"""
        try:
            path = Path(file_path)
            
            if not path.exists():
                return None
            
            if not file_type:
                file_type = self.get_file_type(file_path)
            
            if file_type in ['text', 'code']:
                # Essayer différents encodages
                encodings = ['utf-8', 'latin-1', 'cp1252']
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
            print(f"Erreur lecture fichier: {e}")
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
            print(f"Erreur création fichier temporaire: {e}")
            return None


# Instances globales
clipboard_manager = ClipboardManager()
file_handler = FileHandler()


# Fonctions de compatibilité avec l'ancien utils.py
def get_clipboard_content() -> Dict[str, Any]:
    """
    Fonction de compatibilité pour récupérer le contenu du presse-papiers
    """
    return clipboard_manager.get_content()


def detect_content_format(content: str, file_path: Optional[str] = None) -> str:
    """Détecte le format d'un contenu"""
    if file_path:
        return file_handler.get_file_type(file_path)
    
    return clipboard_manager._detect_text_type(content)


def optimize_content_for_notion(content: str, content_type: str) -> Tuple[str, str]:
    """Optimise le contenu pour Notion (sans limite de longueur)"""
    if content_type == 'table':
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