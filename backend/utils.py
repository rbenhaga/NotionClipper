"""Utilitaires pour Notion Clipper Pro."""
import re
import pyperclip
import time
from backend.config import MAX_CLIPBOARD_LENGTH

def detect_content_type(content: str) -> str:
    """Détecte le type de contenu de manière fiable."""
    if not content or not isinstance(content, str):
        return 'text'
    
    content = content.strip()
    
    # 1. Détection d'URL vidéo (stricte)
    video_urls = [
        r'^https?://(?:www\.)?youtube\.com/watch\?v=[\w-]+',
        r'^https?://youtu\.be/[\w-]+',
        r'^https?://(?:www\.)?vimeo\.com/\d+',
        r'^https?://(?:www\.)?dailymotion\.com/video/[\w-]+',
        r'^https?://.*\.(?:mp4|avi|mov|wmv|flv|webm|mkv|m4v)(?:\?|$)'
    ]
    
    for pattern in video_urls:
        if re.match(pattern, content, re.IGNORECASE):
            return 'video'
    
    # 2. Détection d'URL audio (stricte)
    audio_urls = [
        r'^https?://.*\.(?:mp3|wav|flac|aac|ogg|wma|m4a)(?:\?|$)',
        r'^https?://(?:www\.)?soundcloud\.com/',
        r'^https?://(?:www\.)?spotify\.com/',
    ]
    
    for pattern in audio_urls:
        if re.match(pattern, content, re.IGNORECASE):
            return 'audio'
    
    # 3. Détection d'image en base64
    if content.startswith('data:image/') and ';base64,' in content:
        return 'image'
    
    # 4. Détection de tableau (TSV/CSV)
    lines = content.split('\n')
    if len(lines) >= 2:
        # Vérifier si c'est un tableau TSV
        if all('\t' in line for line in lines[:3] if line.strip()):
            first_row_cells = len(lines[0].split('\t'))
            if first_row_cells > 1 and all(
                len(line.split('\t')) == first_row_cells 
                for line in lines[:5] if line.strip()
            ):
                return 'table'
        
        # Vérifier si c'est un tableau CSV (avec au moins 2 colonnes)
        if all(',' in line for line in lines[:3] if line.strip()):
            try:
                import csv
                import io
                reader = csv.reader(io.StringIO(content))
                rows = list(reader)
                if len(rows) >= 2 and len(rows[0]) >= 2:
                    # Vérifier la cohérence du nombre de colonnes
                    col_count = len(rows[0])
                    if all(len(row) == col_count for row in rows[:5]):
                        return 'table'
            except:
                pass
    
    # 5. Par défaut, c'est du texte
    return 'text'

def get_clipboard_content():
    """Récupère et analyse le contenu du presse-papiers."""
    try:
        content = pyperclip.paste()
        if not content:
            return {"error": "Presse-papiers vide", "type": "error"}
        content_type = detect_content_type(content)
        return {
            "content": content[:MAX_CLIPBOARD_LENGTH] if MAX_CLIPBOARD_LENGTH else content[:2000],
            "type": content_type,
            "truncated": len(content) > (MAX_CLIPBOARD_LENGTH or 2000),
            "originalLength": len(content),
            "timestamp": time.time()
        }
    except Exception as e:
        return {"error": str(e), "type": "error"} 