"""
Gestionnaire du presse-papiers avec support multi-plateforme
"""

import platform
import subprocess
import base64
import tempfile
import os
from pathlib import Path
from typing import Optional, Union, Dict, Any

# Import conditionnel des bibliothèques selon l'OS
try:
    if platform.system() == "Windows":
        try:
            import win32clipboard
            from PIL import Image, ImageGrab
            import io
            WIN_CLIPBOARD_AVAILABLE = True
        except ImportError:
            WIN_CLIPBOARD_AVAILABLE = False
    elif platform.system() == "Darwin":  # macOS
        MAC_CLIPBOARD_AVAILABLE = True  # On ne force pas pasteboard
    else:  # Linux
        LINUX_CLIPBOARD_AVAILABLE = True
except ImportError as e:
    print(f"Avertissement: Bibliothèques presse-papiers non disponibles: {e}")
    WIN_CLIPBOARD_AVAILABLE = False
    MAC_CLIPBOARD_AVAILABLE = False
    LINUX_CLIPBOARD_AVAILABLE = False


class ClipboardManager:
    """Gestionnaire unifié du presse-papiers multi-plateforme"""
    
    def __init__(self):
        self.system = platform.system()
        self._last_content = None
        self._last_content_hash = None
    
    def get_content(self) -> Optional[Union[str, Dict[str, Any]]]:
        """
        Récupère le contenu du presse-papiers
        Retourne soit une string (texte) soit un dict avec type et données
        """
        try:
            if self.system == "Windows":
                if not WIN_CLIPBOARD_AVAILABLE:
                    print("win32clipboard ou PIL non disponible sur ce système.")
                    return None
                return self._get_windows_clipboard()
            elif self.system == "Darwin":
                # pasteboard non utilisé, fallback sur pbpaste
                return self._get_macos_clipboard()
            else:
                return self._get_linux_clipboard()
        except Exception as e:
            print(f"Erreur lecture presse-papiers: {e}")
            return None
    
    def _get_windows_clipboard(self) -> Optional[Union[str, Dict[str, Any]]]:
        """Récupère le contenu du presse-papiers sous Windows"""
        try:
            import win32clipboard
            from PIL import ImageGrab
            import io
            win32clipboard.OpenClipboard()
            
            # Vérifier d'abord si c'est une image
            if win32clipboard.IsClipboardFormatAvailable(win32clipboard.CF_DIB):
                img = ImageGrab.grabclipboard()
                # Correction robuste : img peut être une image, une liste d'images, une chaîne ou None
                if isinstance(img, list):
                    # On prend le premier élément si c'est une image
                    if img and not isinstance(img[0], str) and hasattr(img[0], 'save'):
                        img = img[0]
                    else:
                        img = None  # Liste de chaînes ou vide, on ignore
                # On vérifie que ce n'est ni une string ni None, et que .save existe
                if img and hasattr(img, 'save') and not isinstance(img, str):
                    buffer = io.BytesIO()
                    img.save(buffer, format='PNG')
                    img_base64 = base64.b64encode(buffer.getvalue()).decode()
                    win32clipboard.CloseClipboard()
                    return {
                        'type': 'image',
                        'format': 'png',
                        'data': img_base64,
                        'image': img_base64
                    }
            
            # Sinon, essayer le texte
            if win32clipboard.IsClipboardFormatAvailable(win32clipboard.CF_UNICODETEXT):
                data = win32clipboard.GetClipboardData(win32clipboard.CF_UNICODETEXT)
                win32clipboard.CloseClipboard()
                return data
            
            win32clipboard.CloseClipboard()
            return None
            
        except Exception as e:
            try:
                win32clipboard.CloseClipboard()
            except:
                pass
            print(f"Erreur Windows clipboard: {e}")
            return None
    
    def _get_macos_clipboard(self) -> Optional[str]:
        """Récupère le contenu du presse-papiers sous macOS"""
        try:
            # Utiliser pbpaste pour le texte
            result = subprocess.run(['pbpaste'], 
                                  capture_output=True, 
                                  text=True, 
                                  encoding='utf-8')
            
            if result.returncode == 0 and result.stdout:
                return result.stdout
            
            # TODO: Gérer les images sur macOS
            return None
            
        except Exception as e:
            print(f"Erreur macOS clipboard: {e}")
            return None
    
    def _get_linux_clipboard(self) -> Optional[str]:
        """Récupère le contenu du presse-papiers sous Linux"""
        try:
            # Essayer xclip d'abord
            result = subprocess.run(['xclip', '-selection', 'clipboard', '-o'],
                                  capture_output=True,
                                  text=True,
                                  encoding='utf-8')
            
            if result.returncode == 0 and result.stdout:
                return result.stdout
            
            # Fallback sur xsel
            result = subprocess.run(['xsel', '--clipboard', '--output'],
                                  capture_output=True,
                                  text=True,
                                  encoding='utf-8')
            
            if result.returncode == 0 and result.stdout:
                return result.stdout
            
            return None
            
        except Exception as e:
            print(f"Erreur Linux clipboard: {e}")
            return None
    
    def clear(self) -> bool:
        """Vide le presse-papiers"""
        try:
            if self.system == "Windows":
                win32clipboard.OpenClipboard()
                win32clipboard.EmptyClipboard()
                win32clipboard.CloseClipboard()
                return True
            elif self.system == "Darwin":
                subprocess.run(['pbcopy'], input='', text=True)
                return True
            else:
                subprocess.run(['xclip', '-selection', 'clipboard'], input='', text=True, check=True)
                return True
        except Exception as e:
            print(f"Erreur vidage presse-papiers: {e}")
            return False
    
    def set_content(self, content: str) -> bool:
        """Définit le contenu du presse-papiers"""
        try:
            if self.system == "Windows":
                win32clipboard.OpenClipboard()
                win32clipboard.EmptyClipboard()
                win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT, content)
                win32clipboard.CloseClipboard()
                return True
            elif self.system == "Darwin":
                process = subprocess.Popen(['pbcopy'], 
                                         stdin=subprocess.PIPE,
                                         text=True)
                process.communicate(input=content)
                return process.returncode == 0
            else:
                process = subprocess.Popen(['xclip', '-selection', 'clipboard'],
                                         stdin=subprocess.PIPE,
                                         text=True)
                process.communicate(input=content)
                return process.returncode == 0
        except Exception as e:
            print(f"Erreur écriture presse-papiers: {e}")
            return False
    
    def has_changed(self) -> bool:
        """Vérifie si le contenu du presse-papiers a changé"""
        current = self.get_content()
        
        # Calculer un hash simple pour comparaison
        if current is None:
            current_hash = None
        elif isinstance(current, str):
            current_hash = hash(current)
        else:
            # Pour les contenus complexes (images), hash de la représentation
            current_hash = hash(str(current))
        
        changed = current_hash != self._last_content_hash
        
        if changed:
            self._last_content = current
            self._last_content_hash = current_hash
        
        return changed
    
    def get_content_type(self, content: Union[str, Dict]) -> str:
        """Détermine le type de contenu"""
        if isinstance(content, dict):
            return content.get('type', 'unknown')
        
        if not isinstance(content, str):
            return 'unknown'
        
        # Détecter le type pour du texte
        content = content.strip()
        
        # Tableau TSV/CSV
        if '\t' in content and '\n' in content:
            lines = content.split('\n')
            if len(lines) > 1:
                tabs_per_line = [line.count('\t') for line in lines if line]
                if tabs_per_line and all(t == tabs_per_line[0] for t in tabs_per_line):
                    return 'table'
        
        # JSON
        if content.startswith(('{', '[')) and content.endswith(('}', ']')):
            try:
                import json
                json.loads(content)
                return 'json'
            except:
                pass
        
        # Code
        code_indicators = [
            'function ', 'const ', 'let ', 'var ', 'class ',
            'import ', 'export ', 'def ', 'if ', 'for ',
            '#include', 'public static', 'private ', 'protected '
        ]
        if any(indicator in content for indicator in code_indicators):
            return 'code'
        
        # Markdown
        md_indicators = [
            '\n# ', '\n## ', '\n### ',  # Headers
            '\n- ', '\n* ', '\n+ ',      # Lists
            '\n> ',                      # Quotes
            '```',                       # Code blocks
            '**', '__',                  # Bold
            '[](', '![]()'              # Links/Images
        ]
        if any(indicator in content for indicator in md_indicators):
            return 'markdown'
        
        return 'text'


# Instance globale
clipboard_manager = ClipboardManager()