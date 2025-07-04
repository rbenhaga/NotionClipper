# backend/image_handler.py
"""
Gestionnaire d'images amélioré pour Notion Clipper Pro
Gère l'upload, la validation et la conversion des images
"""

import re
import base64
import requests
from typing import Optional, List, Tuple, Dict, Any
from urllib.parse import urlparse, unquote
import mimetypes
import os
from PIL import Image
from io import BytesIO

class ImageHandler:
    def __init__(self, imgbb_key: Optional[str] = None):
        self.imgbb_key = imgbb_key
        self.imgbb_url = "https://api.imgbb.com/1/upload"
        
        # Extensions d'images supportées
        self.image_extensions = {
            '.jpg', '.jpeg', '.png', '.gif', '.webp', 
            '.svg', '.bmp', '.ico', '.tiff', '.tif'
        }
        
        # Services d'hébergement d'images reconnus
        self.trusted_image_hosts = {
            'images.unsplash.com',
            'i.imgur.com',
            'i.ibb.co',
            'cdn.discordapp.com',
            'raw.githubusercontent.com',
            'user-images.githubusercontent.com',
            'cdn.jsdelivr.net',
            'i.redd.it',
            'pbs.twimg.com',
            'media.giphy.com',
            'cdn.dribbble.com',
            'images.pexels.com',
            'cdn.pixabay.com',
            'upload.wikimedia.org',
            'imgur.com',
            'gyazo.com',
            'prnt.sc',
            'i.postimg.cc',
            'ibb.co'
        }
        
        # Taille maximale pour l'upload (en octets)
        self.max_file_size = 32 * 1024 * 1024  # 32 MB
        
    def process_content_images(self, content: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Traite toutes les images dans le contenu
        Retourne le contenu modifié et la liste des blocs d'images
        """
        processed_content = content
        image_blocks = []
        
        # Pattern pour détecter les images Markdown
        image_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
        
        # Pattern pour détecter les URLs d'images seules
        url_pattern = r'https?://[^\s<>"{}|\\^\[\]`]+'
        
        # Traiter les images Markdown
        for match in re.finditer(image_pattern, content):
            alt_text = match.group(1)
            image_url = match.group(2)
            
            # Traiter l'URL de l'image
            processed_url = self.process_image_url(image_url, alt_text)
            
            if processed_url:
                # Remplacer dans le contenu
                replacement = f"![{alt_text}]({processed_url})"
                processed_content = processed_content.replace(
                    match.group(0), replacement
                )
                
                # Créer un bloc d'image pour Notion
                image_blocks.append({
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": processed_url},
                        "caption": [{
                            "type": "text",
                            "text": {"content": alt_text}
                        }] if alt_text else []
                    }
                })
        
        # Traiter les URLs seules qui pourraient être des images
        for match in re.finditer(url_pattern, processed_content):
            url = match.group(0)
            if self.is_image_url(url) and f"]({url})" not in processed_content:
                processed_url = self.process_image_url(url)
                if processed_url and processed_url != url:
                    processed_content = processed_content.replace(url, processed_url)
        
        return processed_content, image_blocks
    
    def is_image_url(self, url: str) -> bool:
        """Vérifie si une URL pointe vers une image"""
        try:
            # Vérifier l'extension
            parsed_url = urlparse(url.lower())
            path = unquote(parsed_url.path)
            
            # Vérifier l'extension du fichier
            if any(path.endswith(ext) for ext in self.image_extensions):
                return True
            
            # Vérifier le domaine
            if any(host in parsed_url.netloc for host in self.trusted_image_hosts):
                return True
            
            # Vérifier les paramètres d'URL pour certains services
            if 'unsplash.com' in url and ('photo-' in url or '/photos/' in url):
                return True
            
            if 'notion.so' in url and '/image/' in url:
                return True
                
            # Essayer de détecter via le content-type si accessible
            if self.imgbb_key:  # Seulement si on peut potentiellement réuploader
                try:
                    response = requests.head(url, timeout=5, allow_redirects=True)
                    content_type = response.headers.get('content-type', '')
                    if content_type.startswith('image/'):
                        return True
                except:
                    pass
            
            return False
            
        except Exception:
            return False
    
    def process_image_url(self, url: str, alt_text: str = "") -> Optional[str]:
        """
        Traite une URL d'image et retourne une URL valide pour Notion
        """
        if not url:
            return None
            
        # Cas 1: Data URL
        if url.startswith('data:image/'):
            return self.process_data_url(url)
        
        # Cas 2: Fichier local
        if url.startswith('file://') or (not url.startswith('http') and os.path.exists(url)):
            return self.process_local_file(url)
        
        # Cas 3: URL web
        if url.startswith(('http://', 'https://')):
            # Si c'est déjà une URL valide d'un service reconnu
            if self.is_valid_notion_image_url(url):
                return url
            
            # Sinon, essayer de télécharger et réuploader
            if self.imgbb_key:
                return self.download_and_upload_image(url)
        
        return None
    
    def is_valid_notion_image_url(self, url: str) -> bool:
        """Vérifie si l'URL est directement utilisable dans Notion"""
        try:
            parsed_url = urlparse(url.lower())
            
            # Services toujours valides
            if any(host in parsed_url.netloc for host in self.trusted_image_hosts):
                return True
            
            # Vérifier l'extension
            path = unquote(parsed_url.path)
            if any(path.endswith(ext) for ext in self.image_extensions):
                # Exclure les sites qui nécessitent une authentification
                excluded_domains = [
                    'shutterstock.com', 
                    'gettyimages.com', 
                    'istockphoto.com',
                    'adobe.com',
                    'dreamstime.com'
                ]
                if not any(domain in parsed_url.netloc for domain in excluded_domains):
                    return True
            
            return False
            
        except Exception:
            return False
    
    def process_data_url(self, data_url: str) -> Optional[str]:
        """Traite une data URL et l'upload sur ImgBB"""
        if not self.imgbb_key:
            return None
            
        try:
            # Extraire les données base64
            header, data = data_url.split(',', 1)
            
            # Vérifier le format
            if 'base64' not in header:
                return None
            
            # Upload vers ImgBB
            return self.upload_to_imgbb(data)
            
        except Exception as e:
            print(f"Erreur traitement data URL: {e}")
            return None
    
    def process_local_file(self, file_path: str) -> Optional[str]:
        """Traite un fichier local et l'upload sur ImgBB"""
        if not self.imgbb_key:
            return None
            
        try:
            # Nettoyer le chemin
            if file_path.startswith('file://'):
                file_path = file_path[7:]
            
            # Vérifier que le fichier existe
            if not os.path.exists(file_path):
                return None
            
            # Vérifier la taille
            file_size = os.path.getsize(file_path)
            if file_size > self.max_file_size:
                print(f"Fichier trop volumineux: {file_size} bytes")
                return None
            
            # Lire et encoder le fichier
            with open(file_path, 'rb') as f:
                image_data = f.read()
                base64_data = base64.b64encode(image_data).decode('utf-8')
                
            return self.upload_to_imgbb(base64_data)
            
        except Exception as e:
            print(f"Erreur traitement fichier local: {e}")
            return None
    
    def download_and_upload_image(self, url: str) -> Optional[str]:
        """Télécharge une image depuis une URL et l'upload sur ImgBB"""
        if not self.imgbb_key:
            return None
            
        try:
            # Télécharger l'image
            response = requests.get(url, timeout=10, stream=True)
            response.raise_for_status()
            
            # Vérifier le content-type
            content_type = response.headers.get('content-type', '')
            if not content_type.startswith('image/'):
                return None
            
            # Vérifier la taille
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > self.max_file_size:
                return None
            
            # Lire les données
            image_data = BytesIO()
            downloaded = 0
            
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    image_data.write(chunk)
                    downloaded += len(chunk)
                    if downloaded > self.max_file_size:
                        return None
            
            # Optimiser l'image si nécessaire
            image_data.seek(0)
            optimized_data = self.optimize_image(image_data)
            
            # Encoder en base64
            base64_data = base64.b64encode(optimized_data).decode('utf-8')
            
            # Upload vers ImgBB
            return self.upload_to_imgbb(base64_data)
            
        except Exception as e:
            print(f"Erreur téléchargement/upload image: {e}")
            return url  # Retourner l'URL originale en cas d'échec
    
    def optimize_image(self, image_data: BytesIO) -> bytes:
        """Optimise une image pour réduire sa taille"""
        try:
            # Ouvrir l'image
            img = Image.open(image_data)
            
            # Convertir RGBA en RGB si nécessaire (pour JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Créer un fond blanc
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            
            # Redimensionner si trop grande
            max_dimension = 2000
            if img.width > max_dimension or img.height > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            
            # Sauvegarder avec compression
            output = BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            output.seek(0)
            
            return output.read()
            
        except Exception as e:
            print(f"Erreur optimisation image: {e}")
            image_data.seek(0)
            return image_data.read()
    
    def upload_to_imgbb(self, base64_data: str) -> Optional[str]:
        """Upload une image vers ImgBB"""
        if not self.imgbb_key:
            return None
            
        try:
            response = requests.post(
                self.imgbb_url,
                data={
                    'key': self.imgbb_key,
                    'image': base64_data
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return data['data']['url']
                else:
                    print(f"Erreur ImgBB: {data.get('error', {}).get('message', 'Unknown error')}")
            else:
                print(f"Erreur HTTP ImgBB: {response.status_code}")
                
        except Exception as e:
            print(f"Erreur upload ImgBB: {e}")
            
        return None
    
    def extract_images_from_html(self, html_content: str) -> List[Dict[str, Any]]:
        """Extrait les images depuis du contenu HTML"""
        images = []
        
        # Pattern pour les balises img
        img_pattern = r'<img[^>]+src=["\'](.*?)["\'][^>]*(?:alt=["\'](.*?)["\'])?'
        
        for match in re.finditer(img_pattern, html_content, re.IGNORECASE):
            src = match.group(1)
            alt = match.group(2) or ""
            
            processed_url = self.process_image_url(src, alt)
            if processed_url:
                images.append({
                    "url": processed_url,
                    "alt": alt,
                    "original_url": src
                })
        
        return images