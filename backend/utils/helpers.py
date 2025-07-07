"""
Fonctions utilitaires pour Notion Clipper Pro
Helpers partagés entre les différents modules
"""

import asyncio
from typing import Dict, Any, Optional, Union, List
from pathlib import Path
import json
import hashlib
import base64


def ensure_dict(obj) -> Dict[str, Any]:
    """
    Force un objet Notion en dictionnaire
    Gère les différents types d'objets retournés par l'API Notion
    """
    if isinstance(obj, dict):
        return obj
    
    if hasattr(obj, 'copy') and callable(obj.copy):
        d = obj.copy()
        if isinstance(d, dict):
            return d
    
    if hasattr(obj, '__dict__'):
        d = dict(obj.__dict__)
        if isinstance(d, dict):
            return d
    
    # Si l'objet a une méthode to_dict
    if hasattr(obj, 'to_dict') and callable(obj.to_dict):
        d = obj.to_dict()
        if isinstance(d, dict):
            return d
    
    # Si l'objet peut être converti en JSON puis en dict
    try:
        json_str = json.dumps(obj, default=str)
        return json.loads(json_str)
    except:
        pass
    
    raise TypeError(f"Impossible de convertir l'objet {type(obj)} en dict")


def ensure_sync_response(response):
    """
    Force un objet Awaitable en résultat synchrone
    Gère les réponses asynchrones de certaines versions de l'API
    """
    if hasattr(response, "__await__"):
        # Résoudre l'awaitable dans un contexte synchrone
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Si une boucle est déjà en cours, créer une tâche
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, response)
                    return future.result()
        except RuntimeError:
            # Pas de boucle en cours, en créer une
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        try:
            return loop.run_until_complete(response)
        finally:
            loop.close()
    
    return response


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Nettoie un nom de fichier pour le rendre sûr
    
    Args:
        filename: Nom de fichier à nettoyer
        max_length: Longueur maximale du nom
    
    Returns:
        Nom de fichier nettoyé
    """
    # Caractères interdits dans les noms de fichiers
    invalid_chars = '<>:"/\\|?*'
    
    # Remplacer les caractères invalides
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    
    # Supprimer les espaces en début/fin
    filename = filename.strip()
    
    # Limiter la longueur
    if len(filename) > max_length:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        if ext:
            name = name[:max_length - len(ext) - 1]
            filename = f"{name}.{ext}"
        else:
            filename = filename[:max_length]
    
    return filename


def calculate_checksum(data: Union[str, bytes, dict]) -> str:
    """
    Calcule un checksum SHA256 pour des données
    
    Args:
        data: Données à hasher (str, bytes ou dict)
    
    Returns:
        Checksum hexadécimal
    """
    if isinstance(data, dict):
        # Convertir en JSON trié pour cohérence
        data = json.dumps(data, sort_keys=True)
    
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    return hashlib.sha256(data).hexdigest()


def truncate_text(text: str, max_length: int = 2000, suffix: str = "...") -> str:
    """
    Tronque un texte à une longueur maximale
    
    Args:
        text: Texte à tronquer
        max_length: Longueur maximale
        suffix: Suffixe à ajouter si tronqué
    
    Returns:
        Texte tronqué
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def format_file_size(size_bytes: int) -> str:
    """
    Formate une taille de fichier en format lisible
    
    Args:
        size_bytes: Taille en octets
    
    Returns:
        Taille formatée (ex: "1.5 MB")
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes = int(size_bytes / 1024.0)
    
    return f"{size_bytes:.1f} PB"


def is_valid_url(url: str) -> bool:
    """
    Vérifie si une chaîne est une URL valide
    
    Args:
        url: URL à vérifier
    
    Returns:
        True si valide, False sinon
    """
    import re
    
    url_pattern = re.compile(
        r'^https?://'  # http:// ou https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domaine
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP
        r'(?::\d+)?'  # port optionnel
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    return url_pattern.match(url) is not None


def extract_domain(url: str) -> Optional[str]:
    """
    Extrait le domaine d'une URL
    
    Args:
        url: URL complète
    
    Returns:
        Domaine ou None si invalide
    """
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return None


def base64_encode_file(file_path: Union[str, Path]) -> Optional[str]:
    """
    Encode un fichier en base64
    
    Args:
        file_path: Chemin du fichier
    
    Returns:
        Chaîne base64 ou None si erreur
    """
    try:
        file_path = Path(file_path)
        with open(file_path, 'rb') as f:
            data = f.read()
        return base64.b64encode(data).decode('utf-8')
    except Exception as e:
        print(f"Erreur encodage base64: {e}")
        return None


def create_notion_text_block(content: str, annotations: Optional[Dict] = None) -> Dict:
    """
    Crée un objet texte riche Notion
    
    Args:
        content: Texte du contenu
        annotations: Annotations optionnelles (bold, italic, etc.)
    
    Returns:
        Objet texte riche Notion
    """
    text_obj = {
        "type": "text",
        "text": {"content": content}
    }
    
    if annotations:
        text_obj["annotations"] = annotations
    
    return text_obj


def merge_dicts(dict1: Dict, dict2: Dict) -> Dict:
    """
    Fusionne deux dictionnaires de manière récursive
    
    Args:
        dict1: Premier dictionnaire
        dict2: Second dictionnaire (prioritaire)
    
    Returns:
        Dictionnaire fusionné
    """
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    
    return result


def batch_list(items: List[Any], batch_size: int) -> List[List[Any]]:
    """
    Divise une liste en batches
    
    Args:
        items: Liste à diviser
        batch_size: Taille de chaque batch
    
    Returns:
        Liste de batches
    """
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]


def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """
    Charge du JSON de manière sûre
    
    Args:
        json_str: Chaîne JSON
        default: Valeur par défaut si erreur
    
    Returns:
        Objet Python ou valeur par défaut
    """
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return default


def get_timestamp() -> float:
    """Retourne un timestamp Unix actuel"""
    import time
    return time.time()


def format_timestamp(timestamp: float, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Formate un timestamp en chaîne lisible
    
    Args:
        timestamp: Timestamp Unix
        format_str: Format de sortie
    
    Returns:
        Date/heure formatée
    """
    from datetime import datetime
    return datetime.fromtimestamp(timestamp).strftime(format_str)


def extract_notion_page_title(page):
    """Extraction universelle du titre d'une page Notion"""
    if not page:
        return "Sans titre"
    # Méthode 1: Chercher dans toutes les propriétés
    if 'properties' in page:
        for prop_name, prop_value in page['properties'].items():
            if isinstance(prop_value, dict) and prop_value.get('type') == 'title':
                title_array = prop_value.get('title', [])
                if title_array and isinstance(title_array, list):
                    texts = [t.get('plain_text', '') for t in title_array if isinstance(t, dict)]
                    title = ''.join(texts).strip()
                    if title:
                        return title
    # Méthode 2: Chercher dans des noms communs
    if 'properties' in page:
        for key in ['title', 'Title', 'name', 'Name']:
            if key in page['properties']:
                prop = page['properties'][key]
                if 'title' in prop and isinstance(prop['title'], list):
                    texts = [t.get('plain_text', '') for t in prop['title'] if isinstance(t, dict)]
                    title = ''.join(texts).strip()
                    if title:
                        return title
    # Méthode 3: Titre direct
    if 'title' in page and isinstance(page['title'], list):
        texts = [t.get('plain_text', '') for t in page['title'] if isinstance(t, dict)]
        title = ''.join(texts).strip()
        if title:
            return title
    return "Sans titre"