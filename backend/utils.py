"""Utilitaires pour Notion Clipper Pro."""
import re
import pyperclip
import time
from backend.config import MAX_CLIPBOARD_LENGTH

def detect_content_type(content: str) -> str:
    """Détecte le type de contenu de manière fiable."""
    if not content:
        return 'text'
    # Détection vidéo (URL vidéo)
    video_patterns = [
        r'https?://(?:www\.)?youtube\.com/watch\?v=[\w-]+',
        r'https?://youtu\.be/[\w-]+',
        r'https?://(?:www\.)?vimeo\.com/\d+',
        r'https?://(?:www\.)?dailymotion\.com/video/[\w-]+',
        r'\.(?:mp4|avi|mov|wmv|flv|webm|mkv|m4v)(?:\?|$)',
    ]
    for pattern in video_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            return 'video'
    # Détection audio
    audio_patterns = [
        r'\.(?:mp3|wav|flac|aac|ogg|wma|m4a)(?:\?|$)',
        r'https?://(?:www\.)?soundcloud\.com/',
        r'https?://(?:www\.)?spotify\.com/',
    ]
    for pattern in audio_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            return 'audio'
    # Détection tableau TSV/CSV
    lines = content.strip().split('\n')
    if len(lines) > 1:
        # Vérifier TSV
        if '\t' in lines[0]:
            cells_per_row = [len(line.split('\t')) for line in lines if line.strip()]
            if len(set(cells_per_row)) == 1 and cells_per_row[0] > 1:
                return 'table'
        # Vérifier CSV
        if ',' in lines[0] and not re.match(r'^https?://', content):
            try:
                import csv
                import io
                reader = csv.reader(io.StringIO(content))
                rows = list(reader)
                if len(rows) > 1 and all(len(row) == len(rows[0]) for row in rows if row):
                    return 'table'
            except:
                pass
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