# backend/config.py
"""Configuration sécurisée pour Notion Clipper Pro"""

import os
import json
import platform
from pathlib import Path
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
import base64
import hashlib

class SecureConfig:
    """Gestionnaire de configuration sécurisée avec chiffrement des données sensibles"""
    
    # Nom unifié de l'application
    APP_NAME = "NotionClipperPro"
    
    def __init__(self):
        self.app_name = self.APP_NAME
        self.config_dir = self._get_config_dir()
        self.config_file = self.config_dir / "config.json"
        self.preferences_file = self.config_dir / "preferences.json"
        self.vault_file = self.config_dir / "vault.enc"
        self.ensure_config_dir()
        self._init_encryption()
        # Champs à chiffrer - AJOUT DE previewPageId
        self.sensitive_fields = ['notionToken', 'imgbbKey', 'apiKeys', 'previewPageId']
    
    def _get_config_dir(self) -> Path:
        """Détermine le dossier de configuration selon l'OS"""
        system = platform.system()
        
        if system == "Windows":
            base = Path(os.environ.get("APPDATA", os.path.expanduser("~")))
            return base / self.app_name
        elif system == "Darwin":  # macOS
            return Path.home() / "Library" / "Application Support" / self.app_name
        else:  # Linux et autres
            config_home = os.environ.get("XDG_CONFIG_HOME", 
                                       os.path.expanduser("~/.config"))
            return Path(config_home) / self.app_name.lower()
    
    def ensure_config_dir(self):
        """Crée le dossier de configuration s'il n'existe pas"""
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def _init_encryption(self):
        """Initialise le système de chiffrement"""
        # Générer une clé basée sur l'environnement
        env_data = f"{platform.node()}-{platform.system()}-{os.getlogin()}"
        key_base = hashlib.sha256(env_data.encode()).digest()
        self.cipher_key = base64.urlsafe_b64encode(key_base)
        self.cipher = Fernet(self.cipher_key)
    
    def _encrypt_data(self, data: Dict[str, Any]) -> bytes:
        """Chiffre les données sensibles"""
        json_data = json.dumps(data)
        return self.cipher.encrypt(json_data.encode())
    
    def _decrypt_data(self, encrypted_data: bytes) -> Dict[str, Any]:
        """Déchiffre les données"""
        try:
            decrypted = self.cipher.decrypt(encrypted_data)
            return json.loads(decrypted.decode())
        except Exception:
            # Si la clé a changé, réinitialiser
            return {}
    
    def save_config(self, config: Dict[str, Any]):
        """Sauvegarde la configuration avec chiffrement des données sensibles"""
        # Séparer les données sensibles
        sensitive_keys = self.sensitive_fields
        sensitive_data = {}
        public_data = {}
        
        for key, value in config.items():
            if key in sensitive_keys and value:
                sensitive_data[key] = value
            else:
                public_data[key] = value
        
        # Sauvegarder les données publiques
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(public_data, f, indent=2)
        
        # Chiffrer et sauvegarder les données sensibles
        if sensitive_data:
            encrypted = self._encrypt_data(sensitive_data)
            with open(self.vault_file, 'wb') as f:
                f.write(encrypted)
    
    def load_config(self) -> Dict[str, Any]:
        """Charge la configuration complète"""
        config = {}
        
        # Charger les données publiques
        if self.config_file.exists():
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config.update(json.load(f))
        
        # Charger et déchiffrer les données sensibles
        if self.vault_file.exists():
            with open(self.vault_file, 'rb') as f:
                encrypted = f.read()
                sensitive_data = self._decrypt_data(encrypted)
                config.update(sensitive_data)
        
        # Ajouter les valeurs par défaut
        return self._apply_defaults(config)
    
    def _apply_defaults(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Applique les valeurs par défaut"""
        defaults = {
            'minimize_to_tray': True,
            'start_with_system': False,
            'theme': 'dark',
            'language': 'fr',
            'clipboard_check_interval': 2000,
            'auto_send': False,
            'parse_as_markdown': True,
            'default_page_id': None,
            'show_notifications': True,
            'window_position': None,
            'window_size': {'width': 1200, 'height': 800}
        }
        
        for key, value in defaults.items():
            if key not in config:
                config[key] = value
        
        return config
    
    def save_preferences(self, preferences: Dict[str, Any]):
        """Sauvegarde les préférences utilisateur"""
        with open(self.preferences_file, 'w', encoding='utf-8') as f:
            json.dump(preferences, f, indent=2)
    
    def load_preferences(self) -> Dict[str, Any]:
        """Charge les préférences utilisateur"""
        if self.preferences_file.exists():
            with open(self.preferences_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def clear_sensitive_data(self):
        """Supprime toutes les données sensibles"""
        if self.vault_file.exists():
            self.vault_file.unlink()
        
        # Nettoyer aussi du fichier config si présent
        if self.config_file.exists():
            config = self.load_config()
            sensitive_keys = self.sensitive_fields
            for key in sensitive_keys:
                config.pop(key, None)
            self.save_config(config)