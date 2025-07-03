# backend/image_handler.py
"""Gestionnaire d'images pour Notion avec support ImgBB"""

import re
import base64
import requests
from typing import Optional, List, Dict, Any, Tuple
from PIL import Image
from io import BytesIO

class ImageHandler:
    """Gère le traitement et l'upload des images pour Notion"""
    
    def __init__(self, imgbb_key: Optional[str] = None):
        self.imgbb_key = imgbb_key
        self.image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico')
        
    def process_markdown_with_images(self, content: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Traite le contenu markdown et extrait/upload les images
        Retourne le contenu nettoyé et la liste des blocs image
        """
        image_blocks = []
        processed_content = content
        
        # Pattern pour détecter les images markdown
        image_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
        
        # Trouver toutes les images
        matches = list(re.finditer(image_pattern, content))
        
        # Traiter de la fin vers le début pour ne pas décaler les positions
        for match in reversed(matches):
            alt_text = match.group(1)
            image_url = match.group(2)
            
            # Traiter l'image
            processed_url = self.process_image_url(image_url, alt_text)
            
            if processed_url:
                # Créer un bloc image
                image_blocks.append({
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": processed_url}
                    }
                })
                # Remplacer l'image dans le texte par un marqueur
                processed_content = (
                    processed_content[:match.start()] + 
                    f"\n[IMAGE_BLOCK_{len(image_blocks)-1}]\n" + 
                    processed_content[match.end():]
                )
            else:
                # Si l'image ne peut pas être traitée, la convertir en lien
                link_text = alt_text if alt_text else "Voir l'image"
                replacement = f"[{link_text}]({image_url})"
                processed_content = (
                    processed_content[:match.start()] + 
                    replacement + 
                    processed_content[match.end():]
                )
        
        return processed_content, image_blocks
    
    def process_image_url(self, url: str, alt_text: str = "") -> Optional[str]:
        """
        Traite une URL d'image et retourne une URL valide pour Notion
        """
        # Cas 1: Data URL
        if url.startswith('data:image/'):
            if self.imgbb_key:
                uploaded_url = self.upload_data_url_to_imgbb(url)
                if uploaded_url:
                    return uploaded_url
            return None
        
        # Cas 2: Fichier local (commence par file:// ou chemin local)
        if url.startswith('file://') or (not url.startswith('http') and '/' in url):
            # Les fichiers locaux doivent être uploadés
            if self.imgbb_key:
                # Essayer de lire et uploader le fichier
                try:
                    with open(url.replace('file://', ''), 'rb') as f:
                        image_data = f.read()
                        base64_data = base64.b64encode(image_data).decode()
                        return self.upload_to_imgbb(base64_data)
                except:
                    pass
            return None
        
        # Cas 3: URL web
        if self.is_valid_image_url(url):
            return url
        
        # Cas 4: URL non valide mais peut-être une image
        # Essayer de télécharger et réuploader si c'est une image
        if self.imgbb_key:
            downloaded_url = self.download_and_upload_image(url)
            if downloaded_url:
                return downloaded_url
        
        return None
    
    def is_valid_image_url(self, url: str) -> bool:
        """Vérifie si l'URL pointe vers une image valide pour Notion"""
        url_lower = url.lower()
        
        # Vérifier l'extension
        if any(url_lower.endswith(ext) for ext in self.image_extensions):
            return True
        
        # Services d'hébergement d'images connus qui fonctionnent avec Notion
        valid_hosts = [
            'imgur.com', 'i.imgur.com',
            'cloudinary.com', 'res.cloudinary.com',
            'imgbb.com', 'i.ibb.co',
            'postimg.cc', 'i.postimg.cc',
            'unsplash.com/photos',
            'images.unsplash.com',
            'pexels.com',
            'images.pexels.com',
            'wikimedia.org',
            'upload.wikimedia.org',
            'githubusercontent.com',
            'raw.githubusercontent.com',
            'cdn.discordapp.com',
            'media.discordapp.net'
        ]
        
        if any(host in url_lower for host in valid_hosts):
            return True
        
        # Exclure les sites qui ne fournissent pas d'URLs directes
        excluded_sites = [
            'shutterstock.com',
            'gettyimages.com',
            'istockphoto.com',
            'dreamstime.com',
            'alamy.com'
        ]
        
        if any(site in url_lower for site in excluded_sites):
            return False
        
        # Vérifier les patterns d'URL d'image
        image_patterns = [
            r'/image/',
            r'/img/',
            r'/photo/',
            r'/picture/',
            r'/media/',
            r'/static/',
            r'/assets/',
            r'/uploads/',
            r'/files/'
        ]
        
        return any(pattern in url_lower for pattern in image_patterns)
    
    def upload_data_url_to_imgbb(self, data_url: str) -> Optional[str]:
        """Upload une data URL vers ImgBB"""
        try:
            # Extraire les données base64
            if ',' in data_url:
                base64_data = data_url.split(',')[1]
            else:
                return None
            
            return self.upload_to_imgbb(base64_data)
        except:
            return None
    
    def upload_to_imgbb(self, base64_data: str) -> Optional[str]:
        """Upload des données base64 vers ImgBB"""
        if not self.imgbb_key:
            return None
        
        try:
            # Optimiser l'image si nécessaire
            image_data = base64.b64decode(base64_data)
            if len(image_data) > 5 * 1024 * 1024:  # 5MB
                image_data = self.optimize_image(image_data)
                base64_data = base64.b64encode(image_data).decode()
            
            # Upload avec retry
            for attempt in range(3):
                try:
                    response = requests.post(
                        'https://api.imgbb.com/1/upload',
                        data={
                            'key': self.imgbb_key,
                            'image': base64_data
                        },
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get('success'):
                            return result['data']['url']
                    
                except requests.RequestException:
                    if attempt < 2:
                        import time
                        time.sleep(1)
                    continue
            
        except Exception as e:
            print(f"Erreur upload ImgBB: {e}")
        
        return None
    
    def download_and_upload_image(self, url: str) -> Optional[str]:
        """Télécharge une image depuis une URL et l'upload vers ImgBB"""
        try:
            # Télécharger l'image
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            
            if response.status_code == 200:
                # Vérifier que c'est bien une image
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    # Encoder en base64 et uploader
                    base64_data = base64.b64encode(response.content).decode()
                    return self.upload_to_imgbb(base64_data)
        except:
            pass
        
        return None
    
    def optimize_image(self, image_data: bytes) -> bytes:
        """Optimise une image pour réduire sa taille"""
        try:
            img = Image.open(BytesIO(image_data))
            
            # Convertir en RGB si nécessaire
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[-1])
                else:
                    background.paste(img, mask=img.split()[1])
                img = background
            
            # Redimensionner si trop grand
            max_dimension = 2048
            if img.width > max_dimension or img.height > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            
            # Sauvegarder avec compression
            output = BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            return output.getvalue()
        except:
            return image_data


def integrate_with_markdown_parser(content: str, imgbb_key: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Intégration avec le parser markdown existant
    Traite le contenu et gère les images
    """
    from backend.martian_parser import markdown_to_blocks
    
    # Créer le gestionnaire d'images
    image_handler = ImageHandler(imgbb_key)
    
    # Traiter les images d'abord
    processed_content, image_blocks = image_handler.process_markdown_with_images(content)
    
    # Parser le contenu markdown
    text_blocks = markdown_to_blocks(processed_content)
    
    # Intégrer les blocs image aux bons endroits
    final_blocks = []
    image_index = 0
    
    for block in text_blocks:
        # Vérifier si c'est un marqueur d'image
        if block.get('type') == 'paragraph':
            paragraph_text = block.get('paragraph', {}).get('rich_text', [{}])[0].get('text', {}).get('content', '')
            
            if paragraph_text.strip().startswith('[IMAGE_BLOCK_'):
                # Remplacer par le bloc image correspondant
                match = re.match(r'\[IMAGE_BLOCK_(\d+)\]', paragraph_text.strip())
                if match:
                    idx = int(match.group(1))
                    if idx < len(image_blocks):
                        final_blocks.append(image_blocks[idx])
                        continue
        
        final_blocks.append(block)
    
    return final_blocks