# backend/utils/clipboard.py
"""
Gestionnaire de presse-papier multiplateforme amélioré
Gestion robuste avec fallback et détection automatique
"""

import platform
import subprocess
import base64
import tempfile
import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from PIL import Image
import io


class ClipboardManager:
    """Gestionnaire multiplateforme du presse-papiers avec détection robuste"""
    
    def __init__(self):
        self.system = platform.system()
        self.last_content = None
        self.last_check = 0
        self.check_interval = 0.5  # Vérifier toutes les 500ms
        self._init_clipboard_backend()
    
    def _init_clipboard_backend(self):
        """Initialise le backend approprié selon l'OS"""
        self.clipboard_backend = None
        
        if self.system == "Windows":
            try:
                import win32clipboard
                self.clipboard_backend = "win32"
                print("✅ Backend Windows (win32clipboard) initialisé")
            except ImportError:
                try:
                    import pyperclip
                    self.clipboard_backend = "pyperclip"
                    print("✅ Backend pyperclip initialisé")
                except ImportError:
                    self.clipboard_backend = "powershell"
                    print("⚠️ Utilisation de PowerShell comme fallback")
        
        elif self.system == "Darwin":  # macOS
            self.clipboard_backend = "pbpaste"
            print("✅ Backend macOS (pbpaste) initialisé")
        
        else:  # Linux
            # Tester les différents gestionnaires de presse-papier
            for cmd in ['xclip', 'xsel', 'wl-paste']:
                if self._command_exists(cmd):
                    self.clipboard_backend = cmd
                    print(f"✅ Backend Linux ({cmd}) initialisé")
                    break
            
            if not self.clipboard_backend:
                try:
                    import pyperclip
                    self.clipboard_backend = "pyperclip"
                    print("✅ Backend pyperclip initialisé")
                except ImportError:
                    print("❌ Aucun backend de presse-papier disponible")
    
    def _command_exists(self, cmd: str) -> bool:
        """Vérifie si une commande existe"""
        try:
            subprocess.run(['which', cmd], capture_output=True, check=True)
            return True
        except:
            return False
    
    def get_content(self) -> Dict[str, Any]:
        """Récupère le contenu du presse-papiers avec gestion d'erreurs robuste"""
        current_time = time.time()
        
        # Limiter la fréquence des vérifications
        if current_time - self.last_check < self.check_interval:
            return self.last_content or {"type": "empty", "content": "", "source": "clipboard"}
        
        self.last_check = current_time
        
        try:
            # D'abord essayer de récupérer une image
            image_content = self._get_clipboard_image()
            if image_content:
                self.last_content = image_content
                return image_content
            
            # Sinon récupérer le texte
            text = self._get_clipboard_text()
            if text:
                content_type = self._detect_text_type(text)
                content = {
                    "type": content_type,
                    "content": text,
                    "source": "clipboard",
                    "timestamp": current_time
                }
                self.last_content = content
                return content
            
            return {
                "type": "empty",
                "content": "",
                "source": "clipboard",
                "timestamp": current_time
            }
            
        except Exception as e:
            print(f"⚠️ Erreur lecture presse-papiers: {e}")
            return {
                "type": "error",
                "content": "",
                "error": str(e),
                "timestamp": current_time
            }
    
    def _get_clipboard_text(self) -> Optional[str]:
        """Récupère le texte du presse-papiers selon l'OS et le backend"""
        try:
            if self.system == "Windows":
                if self.clipboard_backend == "win32":
                    return self._get_win32_text()
                elif self.clipboard_backend == "pyperclip":
                    import pyperclip
                    return pyperclip.paste()
                else:  # PowerShell fallback
                    return self._get_powershell_text()
            
            elif self.system == "Darwin":  # macOS
                result = subprocess.run(
                    ['pbpaste'],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                return result.stdout if result.returncode == 0 else None
            
            else:  # Linux
                if self.clipboard_backend == "xclip":
                    result = subprocess.run(
                        ['xclip', '-selection', 'clipboard', '-o'],
                        capture_output=True,
                        text=True,
                        timeout=2
                    )
                    return result.stdout if result.returncode == 0 else None
                
                elif self.clipboard_backend == "xsel":
                    result = subprocess.run(
                        ['xsel', '--clipboard', '--output'],
                        capture_output=True,
                        text=True,
                        timeout=2
                    )
                    return result.stdout if result.returncode == 0 else None
                
                elif self.clipboard_backend == "wl-paste":
                    result = subprocess.run(
                        ['wl-paste'],
                        capture_output=True,
                        text=True,
                        timeout=2
                    )
                    return result.stdout if result.returncode == 0 else None
                
                elif self.clipboard_backend == "pyperclip":
                    import pyperclip
                    return pyperclip.paste()
            
            return None
            
        except Exception as e:
            print(f"Erreur _get_clipboard_text: {e}")
            return None
    
    def _get_win32_text(self) -> Optional[str]:
        """Récupère le texte avec win32clipboard"""
        try:
            import win32clipboard
            import win32con
            
            win32clipboard.OpenClipboard()
            try:
                if win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
                    data = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
                    return data
                elif win32clipboard.IsClipboardFormatAvailable(win32con.CF_TEXT):
                    data = win32clipboard.GetClipboardData(win32con.CF_TEXT)
                    return data.decode('utf-8', errors='ignore')
                return None
            finally:
                win32clipboard.CloseClipboard()
        except Exception as e:
            print(f"Erreur win32clipboard: {e}")
            return None
    
    def _get_powershell_text(self) -> Optional[str]:
        """Récupère le texte avec PowerShell (Windows fallback)"""
        try:
            result = subprocess.run(
                ['powershell', '-command', 'Get-Clipboard'],
                capture_output=True,
                text=True,
                timeout=2,
                shell=True
            )
            return result.stdout.strip() if result.returncode == 0 else None
        except Exception as e:
            print(f"Erreur PowerShell: {e}")
            return None
    
    def _get_clipboard_image(self) -> Optional[Dict[str, Any]]:
        """Récupère une image du presse-papiers"""
        try:
            if self.system == "Windows" and self.clipboard_backend == "win32":
                import win32clipboard
                import win32con
                from PIL import ImageGrab
                
                # Essayer avec PIL d'abord
                try:
                    result = ImageGrab.grabclipboard()
                    if isinstance(result, Image.Image):
                        return self._process_image(result)
                    # Si c'est une liste de chemins, essayer d'ouvrir la première image
                    elif isinstance(result, list) and result:
                        try:
                            img = Image.open(result[0])
                            return self._process_image(img)
                        except Exception as e:
                            print(f"Erreur ouverture image depuis chemin: {e}")
                except Exception as e:
                    print(f"Erreur ImageGrab.grabclipboard: {e}")
                    pass
                
                # Fallback sur win32clipboard
                win32clipboard.OpenClipboard()
                try:
                    if win32clipboard.IsClipboardFormatAvailable(win32con.CF_DIB):
                        data = win32clipboard.GetClipboardData(win32con.CF_DIB)
                        # Convertir DIB en image
                        img = self._dib_to_image(data)
                        if img:
                            return self._process_image(img)
                finally:
                    win32clipboard.CloseClipboard()
            
            elif self.system == "Darwin":  # macOS
                # Utiliser osascript pour détecter une image
                script = '''
                tell application "System Events"
                    try
                        set hasImage to (clipboard info for «class PNGf») is not {}
                        if not hasImage then
                            set hasImage to (clipboard info for «class TIFF») is not {}
                        end if
                        return hasImage
                    on error
                        return false
                    end try
                end tell
                '''
                result = subprocess.run(
                    ['osascript', '-e', script],
                    capture_output=True,
                    text=True
                )
                
                if result.stdout.strip() == "true":
                    # Extraire l'image
                    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                        subprocess.run(['osascript', '-e', 
                            f'write (the clipboard as «class PNGf») to (POSIX file "{tmp.name}")'])
                        if Path(tmp.name).exists():
                            img = Image.open(tmp.name)
                            result = self._process_image(img)
                            Path(tmp.name).unlink()
                            return result
            
            elif self.system == "Linux" and self.clipboard_backend == "xclip":
                # Vérifier si une image est disponible
                result = subprocess.run(
                    ['xclip', '-selection', 'clipboard', '-t', 'TARGETS', '-o'],
                    capture_output=True,
                    text=True
                )
                
                if 'image/png' in result.stdout or 'image/jpeg' in result.stdout:
                    # Extraire l'image
                    img_format = 'image/png' if 'image/png' in result.stdout else 'image/jpeg'
                    result = subprocess.run(
                        ['xclip', '-selection', 'clipboard', '-t', img_format, '-o'],
                        capture_output=True
                    )
                    
                    if result.returncode == 0 and result.stdout:
                        img = Image.open(io.BytesIO(result.stdout))
                        return self._process_image(img)
            
            return None
            
        except Exception as e:
            print(f"Erreur récupération image: {e}")
            return None
    
    def _process_image(self, img: Image.Image) -> Dict[str, Any]:
        """Traite une image PIL et la convertit en base64"""
        try:
            # Redimensionner si trop grande
            max_size = (1920, 1080)
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convertir en PNG
            buffer = io.BytesIO()
            img.save(buffer, format='PNG', optimize=True)
            img_data = buffer.getvalue()
            
            # Encoder en base64
            img_base64 = base64.b64encode(img_data).decode('utf-8')
            
            return {
                "type": "image",
                "content": f"data:image/png;base64,{img_base64}",
                "source": "clipboard",
                "metadata": {
                    "width": img.size[0],
                    "height": img.size[1],
                    "format": "PNG",
                    "size": len(img_data)
                }
            }
            
        except Exception as e:
            print(f"Erreur traitement image: {e}")
            return {
                "type": "error",
                "content": "",
                "error": str(e),
                "source": "clipboard"
            }
    
    def _detect_text_type(self, text: str) -> str:
        """Détecte le type de contenu textuel"""
        if not text:
            return "text"
        
        text = text.strip()
        
        # URL
        if text.startswith(('http://', 'https://', 'www.')):
            return "url"
        
        # Code (heuristiques simples)
        code_indicators = [
            'function', 'def ', 'class ', 'import ', 'const ', 'let ', 'var ',
            '{', '}', '()', '=>', 'return ', 'if ', 'for ', 'while '
        ]
        if any(indicator in text for indicator in code_indicators):
            return "code"
        
        # Markdown
        markdown_indicators = ['# ', '## ', '- ', '* ', '```', '[', ']', '**', '__']
        if any(text.startswith(indicator) for indicator in markdown_indicators):
            return "markdown"
        
        return "text"

    def _dib_to_image(self, data) -> Optional[Image.Image]:
        """
        Convertit un flux DIB (BITMAPINFOHEADER + palette + pixels) en image PIL,
        en construisant un en-tête BITMAPFILEHEADER pour que PIL puisse l'ouvrir.
        """
        import struct
        import io
        from PIL import Image

        # data est un bytes-like : [BITMAPINFOHEADER][palette?][pixel data]
        # Lecture de la taille du header BITMAPINFOHEADER (devrait être 40)
        header_size = struct.unpack_from('<I', data, 0)[0]

        # Récupérer biBitCount (offset 14) et biClrUsed (offset 32) pour la palette
        bit_count = struct.unpack_from('<H', data, 14)[0]
        clr_used  = struct.unpack_from('<I', data, 32)[0]

        # Calculer la taille de la palette
        if clr_used:
            palette_size = clr_used * 4
        else:
            palette_size = (1 << bit_count) * 4 if bit_count <= 8 else 0

        # Offset absolu au début des pixels dans le fichier BMP
        bfOffBits = 14 + header_size + palette_size

        # Taille totale du fichier BMP = en‑tête (14) + contenu DIB
        bfSize = 14 + len(data)

        # Construire le BITMAPFILEHEADER (<2s I H H I>)
        # - 'BM' (2s)
        # - bfSize (I)
        # - bfReserved1 (H) = 0
        # - bfReserved2 (H) = 0
        # - bfOffBits (I)
        bmp_header = struct.pack('<2sIHHI', b'BM', bfSize, 0, 0, bfOffBits)

        # Concaténer l'en‑tête + le flux DIB existant
        bmp_bytes = bmp_header + data

        # Charger l'image via PIL
        try:
            img = Image.open(io.BytesIO(bmp_bytes))
            # Convertir en RGB si nécessaire
            return img.convert('RGBA') if img.mode in ('P','RGBa') else img.copy()
        except Exception as e:
            print(f"Erreur conversion DIB → Image: {e}")
            return None


# Instance singleton pour utilisation globale
clipboard_manager = ClipboardManager()