# backend/martian_parser.py
"""Parser Markdown vers blocs Notion - Version améliorée avec support des images"""

import re
from typing import List, Dict, Any, Optional, Tuple

def markdown_to_blocks(markdown_text: str, content_type: Optional[str] = None, parse_as_markdown: bool = True, imgbb_key: Optional[str] = None) -> List[Dict[str, Any]]:
    """Convertit du Markdown en blocs Notion avec support amélioré des images"""
    if not markdown_text:
        return []
    
    # Si pas de parsing markdown demandé, retourner un simple paragraphe
    if not parse_as_markdown:
        return [{
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": markdown_text[:2000]}}],
                "color": "default"
            }
        }]
    
    # Si on a une clé ImgBB, utiliser le gestionnaire d'images avancé
    if imgbb_key:
        try:
            from backend.image_handler import integrate_with_markdown_parser
            return integrate_with_markdown_parser(markdown_text, imgbb_key)
        except ImportError:
            # Fallback si le module n'est pas disponible
            pass
    
    blocks = []
    lines = markdown_text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].rstrip()
        
        # Ligne vide - skip
        if not line:
            i += 1
            continue
        
        # Détecter les images markdown ![alt](url)
        image_match = re.match(r'^!\[([^\]]*)\]\(([^)]+)\)', line)
        if image_match:
            alt_text, image_url = image_match.groups()
            # Ignorer les images data URL et valider l'URL
            if not image_url.startswith('data:') and is_valid_image_url(image_url):
                blocks.append({
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": image_url}
                    }
                })
            elif alt_text or image_url:
                # Si l'image n'est pas valide, créer un paragraphe avec un lien
                link_text = alt_text if alt_text else "Image"
                blocks.append({
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {
                                "content": link_text,
                                "link": {"url": image_url}
                            }
                        }],
                        "color": "default"
                    }
                })
            i += 1
            continue
        
        # Headers
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            text = line.lstrip('#').strip()
            
            if level <= 3:
                block_type = f"heading_{level}"
                blocks.append({
                    "type": block_type,
                    block_type: {
                        "rich_text": [{"type": "text", "text": {"content": text}}],
                        "color": "default"
                    }
                })
                i += 1
                continue
        
        # Code blocks
        if line.startswith('```'):
            language = line[3:].strip() or "plain text"
            code_lines = []
            i += 1
            
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            
            if code_lines or i < len(lines):
                code_content = '\n'.join(code_lines)
                blocks.append({
                    "type": "code",
                    "code": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": code_content[:2000]}  # Limite Notion
                        }],
                        "language": language
                    }
                })
            i += 1
            continue
        
        # Listes à puces
        if line.startswith(('- ', '* ', '+ ')):
            text = line[2:].strip()
            # Gérer les images dans les listes
            text, inline_images = extract_inline_images(text)
            
            blocks.append({
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": parse_inline_formatting(text),
                    "color": "default"
                }
            })
            
            # Ajouter les images après l'item de liste
            for img_url in inline_images:
                blocks.append({
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": img_url}
                    }
                })
            
            i += 1
            continue
        
        # Listes numérotées
        if re.match(r'^\d+\.\s', line):
            text = re.sub(r'^\d+\.\s*', '', line)
            # Gérer les images dans les listes
            text, inline_images = extract_inline_images(text)
            
            blocks.append({
                "type": "numbered_list_item",
                "numbered_list_item": {
                    "rich_text": parse_inline_formatting(text),
                    "color": "default"
                }
            })
            
            # Ajouter les images après l'item de liste
            for img_url in inline_images:
                blocks.append({
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": img_url}
                    }
                })
            
            i += 1
            continue
        
        # Blockquotes
        if line.startswith('> '):
            text = line[2:].strip()
            blocks.append({
                "type": "quote",
                "quote": {
                    "rich_text": parse_inline_formatting(text),
                    "color": "default"
                }
            })
            i += 1
            continue
        
        # Ligne horizontale
        if line.strip() in ['---', '***', '___'] and len(line.strip()) >= 3:
            blocks.append({"type": "divider", "divider": {}})
            i += 1
            continue
        
        # Tables simples (conversion en code block pour préserver le format)
        if '|' in line and i + 1 < len(lines) and '|' in lines[i + 1]:
            table_lines = []
            start_i = i
            
            while i < len(lines) and '|' in lines[i]:
                table_lines.append(lines[i])
                i += 1
            
            if len(table_lines) > 1:
                blocks.append({
                    "type": "code",
                    "code": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": '\n'.join(table_lines)}
                        }],
                        "language": "plain text"
                    }
                })
                continue
        
        # Paragraphe avec formatage inline et gestion des images
        text, inline_images = extract_inline_images(line)
        
        if text.strip():  # Ajouter le paragraphe seulement s'il reste du texte
            rich_text = parse_inline_formatting(text)
            blocks.append({
                "type": "paragraph",
                "paragraph": {
                    "rich_text": rich_text,
                    "color": "default"
                }
            })
        
        # Ajouter les images extraites comme blocs séparés
        for img_url in inline_images:
            blocks.append({
                "type": "image",
                "image": {
                    "type": "external",
                    "external": {"url": img_url}
                }
            })
        
        i += 1
    
    return blocks


def is_valid_image_url(url: str) -> bool:
    """Vérifie si l'URL pointe vers une image valide pour Notion"""
    # Extensions d'images supportées
    image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp')
    
    # Vérifier l'extension
    url_lower = url.lower()
    if any(url_lower.endswith(ext) for ext in image_extensions):
        return True
    
    # Vérifier si c'est une URL d'image directe (sans extension mais avec indicateurs)
    if any(pattern in url_lower for pattern in ['/image/', '/img/', '/photo/', '/picture/']):
        # Mais exclure les pages web connues
        if any(site in url_lower for site in ['shutterstock.com', 'gettyimages.com', 'istockphoto.com']):
            return False
        return True
    
    # Services d'hébergement d'images connus
    valid_hosts = [
        'imgur.com', 'i.imgur.com',
        'cloudinary.com',
        'imgbb.com', 'i.ibb.co',
        'postimg.cc',
        'unsplash.com/photos',
        'pexels.com',
        'wikimedia.org',
        'githubusercontent.com'
    ]
    
    if any(host in url_lower for host in valid_hosts):
        return True
    
    return False


def extract_inline_images(text: str) -> Tuple[str, List[str]]:
    """Extrait les images inline du texte et retourne le texte nettoyé + la liste des URLs"""
    images = []
    remaining_text_parts = []
    
    def replace_image(match):
        alt_text, url = match.groups()
        if not url.startswith('data:'):
            if is_valid_image_url(url):
                images.append(url)
                return ''  # Retirer l'image du texte
            else:
                # Si l'URL n'est pas valide, garder le lien comme texte normal
                return f'[{alt_text}]({url})' if alt_text else url
        return ''  # Ignorer les data URLs
    
    # Remplacer toutes les images markdown
    cleaned_text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', replace_image, text)
    
    return cleaned_text.strip(), images


def parse_inline_formatting(text: str) -> List[Dict[str, Any]]:
    """Parse le formatage inline (gras, italique, code, liens)"""
    if not text:
        return [{"type": "text", "text": {"content": ""}}]
    
    # Pour simplifier, on va traiter les formats dans l'ordre
    # et construire progressivement le rich_text
    segments = []
    current_pos = 0
    
    # Patterns pour le formatage (ordre important pour éviter les conflits)
    patterns = [
        ('code', r'`([^`]+)`'),
        ('bold_italic', r'\*\*\*([^*]+)\*\*\*'),
        ('bold', r'\*\*([^*]+)\*\*'),
        ('italic', r'\*([^*]+)\*'),
        ('link', r'\[([^\]]+)\]\(([^)]+)\)')
    ]
    
    # Créer une liste de tous les matches avec leur position
    all_matches = []
    for format_type, pattern in patterns:
        for match in re.finditer(pattern, text):
            all_matches.append((match.start(), match.end(), format_type, match))
    
    # Trier par position de début
    all_matches.sort(key=lambda x: x[0])
    
    # Traiter les matches sans chevauchement
    for start, end, format_type, match in all_matches:
        # Ajouter le texte avant le match
        if start > current_pos:
            segments.append({
                "type": "text",
                "text": {"content": text[current_pos:start]}
            })
        
        # Ajouter le texte formaté
        if format_type == 'code':
            segments.append({
                "type": "text",
                "text": {"content": match.group(1)},
                "annotations": {"code": True}
            })
        elif format_type == 'bold':
            segments.append({
                "type": "text",
                "text": {"content": match.group(1)},
                "annotations": {"bold": True}
            })
        elif format_type == 'italic':
            segments.append({
                "type": "text",
                "text": {"content": match.group(1)},
                "annotations": {"italic": True}
            })
        elif format_type == 'bold_italic':
            segments.append({
                "type": "text",
                "text": {"content": match.group(1)},
                "annotations": {"bold": True, "italic": True}
            })
        elif format_type == 'link':
            link_text, link_url = match.groups()
            segments.append({
                "type": "text",
                "text": {
                    "content": link_text,
                    "link": {"url": link_url}
                }
            })
        
        current_pos = end
    
    # Ajouter le texte restant
    if current_pos < len(text):
        segments.append({
            "type": "text",
            "text": {"content": text[current_pos:]}
        })
    
    # Si aucun formatage trouvé, retourner le texte simple
    if not segments:
        return [{"type": "text", "text": {"content": text}}]
    
    return segments