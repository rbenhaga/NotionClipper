#!/usr/bin/env python3
"""
Script pour créer les icônes manquantes pour Notion Clipper
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, text="N", bg_color="#6366f1", text_color="#ffffff"):
    """Crée une icône simple avec une lettre."""
    # Créer une image avec fond transparent
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Dessiner un cercle de fond
    margin = size // 10
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=bg_color
    )
    
    # Ajouter le texte
    try:
        # Essayer d'utiliser une police système
        font_size = size // 2
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Utiliser la police par défaut
        font = ImageFont.load_default()
    
    # Centrer le texte
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - (size // 20)  # Légèrement vers le haut
    
    draw.text((x, y), text, fill=text_color, font=font)
    
    return img

def main():
    """Crée toutes les icônes nécessaires."""
    print("🎨 Création des icônes pour Notion Clipper...")
    
    # Créer le dossier public s'il n'existe pas
    os.makedirs("public", exist_ok=True)
    
    # Icône principale (grande)
    icon = create_icon(256, "N")
    icon.save("public/icon.png")
    print("✅ public/icon.png créé")
    
    # Icône pour la barre système (petite)
    tray_icon = create_icon(32, "N")
    tray_icon.save("public/tray-icon.png")
    print("✅ public/tray-icon.png créé")
    
    # Créer aussi un fichier .ico pour Windows
    icon.save("public/icon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
    print("✅ public/icon.ico créé")
    
    print("\n✨ Toutes les icônes ont été créées avec succès!")

if __name__ == "__main__":
    main()