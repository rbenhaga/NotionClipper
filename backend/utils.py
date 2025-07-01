"""Utilitaires pour Notion Clipper Pro."""
import time
import pyperclip
import re

def get_clipboard_content():
    try:
        text = pyperclip.paste()
        if text and text.strip():
            text = text.strip()
            original_length = len(text)
            MAX_CLIPBOARD_LENGTH = 2000
            content_type = detect_content_type(text)
            if len(text) > MAX_CLIPBOARD_LENGTH:
                return {
                    "type": content_type,
                    "content": text[:MAX_CLIPBOARD_LENGTH],
                    "size": MAX_CLIPBOARD_LENGTH,
                    "truncated": True,
                    "original_length": original_length,
                    "timestamp": time.time()
                }
            return {
                "type": content_type,
                "content": text,
                "size": len(text),
                "truncated": False,
                "original_length": original_length,
                "timestamp": time.time()
            }
    except Exception as e:
        return {"error": str(e), "type": "error"}
    return None

def detect_content_type(text):
    video_patterns = [
        r'(https?://)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)',
        r'\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)($|\?)',
    ]
    for pattern in video_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return 'video'
    audio_patterns = [
        r'\.(mp3|wav|flac|aac|ogg|wma|m4a)($|\?)',
        r'(soundcloud\.com|spotify\.com|deezer\.com)',
    ]
    for pattern in audio_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return 'audio'
    if '\t' in text and '\n' in text:
        rows = text.split('\n')
        if len(rows) > 1:
            first_row_cells = len(rows[0].split('\t'))
            if all(len(row.split('\t')) == first_row_cells for row in rows if row):
                return 'table'
    if ',' in text and '\n' in text:
        import csv
        import io as _io
        try:
            reader = csv.reader(_io.StringIO(text))
            rows = list(reader)
            if len(rows) > 1 and all(len(row) == len(rows[0]) for row in rows):
                return 'table'
        except:
            pass
    return 'text' 