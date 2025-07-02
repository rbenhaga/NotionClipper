"""
Module de configuration sécurisée pour Notion Clipper Pro
Gestion du stockage sécurisé des credentials et préférences
"""

import os
import sys
import json
import base64
from pathlib import Path
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import platform
import getpass


class SecureConfig:
    """Gestionnaire de configuration sécurisée multi-plateforme"""
    
    def __init__(self):
        self.app_name = "NotionClipperPro"
        self.config_version = "2.0"
        
        # Déterminer le dossier de configuration selon l'OS
        self.app_dir = self._get_app_directory()
        self.app_dir.mkdir(parents=True, exist_ok=True)
        
        # Fichiers de configuration
        self.config_file = self.app_dir / "config.json"
        self.encrypted_file = self.app_dir / "vault.enc"
        self.preferences_file = self.app_dir / "preferences.json"
        
        # Clé de chiffrement
        self._cipher = self._get_cipher()
    
    def _get_app_directory(self) -> Path:
        """Détermine le dossier approprié selon l'OS"""
        system = platform.system()
        
        if system == "Windows":
            # Windows: %APPDATA%\NotionClipperPro
            base = os.environ.get('APPDATA')
            if not base:
                base = Path.home() / "AppData" / "Roaming"
            return Path(base) / self.app_name
        
        elif system == "Darwin":  # macOS
            # macOS: ~/Library/Application Support/NotionClipperPro
            return Path.home() / "Library" / "Application Support" / self.app_name
        
        else:  # Linux et autres
            # Linux: ~/.config/NotionClipperPro
            config_home = os.environ.get('XDG_CONFIG_HOME')
            if config_home:
                return Path(config_home) / self.app_name
            return Path.home() / ".config" / self.app_name
    
    def _get_cipher(self) -> Fernet:
        """Génère ou récupère la clé de chiffrement"""
        key_file = self.app_dir / ".key"
        
        if key_file.exists():
            # Charger la clé existante
            try:
                key_data = key_file.read_bytes()
                return Fernet(key_data)
            except Exception:
                # Clé corrompue, régénérer
                pass
        
        # Générer une nouvelle clé
        # Utiliser une combinaison d'informations système pour la dérivation
        salt = (
            platform.node() +  # Nom de la machine
            platform.system() +  # OS
            getpass.getuser()  # Nom d'utilisateur
        ).encode()[:16].ljust(16, b'0')  # Assurer 16 bytes
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        # Clé basée sur l'environnement
        key_material = (
            os.environ.get('COMPUTERNAME', '') +
            os.environ.get('USERNAME', '') +
            self.app_name
        ).encode()
        
        key = base64.urlsafe_b64encode(kdf.derive(key_material))
        
        # Sauvegarder la clé
        key_file.write_bytes(key)
        
        # Protéger le fichier (Unix uniquement)
        if hasattr(os, 'chmod'):
            os.chmod(key_file, 0o600)
        
        return Fernet(key)
    
    def save_config(self, config: Dict[str, Any]):
        """Sauvegarde la configuration de manière sécurisée"""
        try:
            # Séparer les données sensibles
            sensitive_keys = ['notionToken', 'imgbbKey', 'apiKeys']
            sensitive_data = {}
            public_data = {}
            
            for key, value in config.items():
                if key in sensitive_keys and value:
                    sensitive_data[key] = value
                else:
                    public_data[key] = value
            
            # Sauvegarder les données publiques
            public_data['version'] = self.config_version
            public_data['updated_at'] = str(self.config_file.stat().st_ctime) if self.config_file.exists() else ""
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(public_data, f, indent=2)
            
            # Chiffrer et sauvegarder les données sensibles
            if sensitive_data:
                encrypted = self._cipher.encrypt(
                    json.dumps(sensitive_data).encode()
                )
                self.encrypted_file.write_bytes(encrypted)
                
                # Protéger le fichier
                if hasattr(os, 'chmod'):
                    os.chmod(self.encrypted_file, 0o600)
            
        except Exception as e:
            raise Exception(f"Erreur sauvegarde config: {e}")
    
    def load_config(self) -> Dict[str, Any]:
        """Charge la configuration"""
        config = {}
        
        try:
            # Charger les données publiques
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
            
            # Charger et déchiffrer les données sensibles
            if self.encrypted_file.exists():
                try:
                    encrypted_data = self.encrypted_file.read_bytes()
                    decrypted = self._cipher.decrypt(encrypted_data)
                    sensitive_data = json.loads(decrypted.decode())
                    config.update(sensitive_data)
                except Exception:
                    # Données corrompues, ignorer
                    pass
            
            return config
            
        except Exception:
            return {}
    
    def save_preferences(self, preferences: Dict[str, Any]):
        """Sauvegarde les préférences utilisateur"""
        try:
            prefs = self.load_preferences()
            prefs.update(preferences)
            prefs['version'] = self.config_version
            
            with open(self.preferences_file, 'w', encoding='utf-8') as f:
                json.dump(prefs, f, indent=2)
                
        except Exception as e:
            print(f"Erreur sauvegarde préférences: {e}")
    
    def load_preferences(self) -> Dict[str, Any]:
        """Charge les préférences utilisateur"""
        default_preferences = {
            'theme': 'auto',
            'language': 'fr',
            'shortcuts': {
                'clip': 'Ctrl+Shift+C',
                'quick_clip': 'Ctrl+Alt+C',
                'show_window': 'Ctrl+Shift+N'
            },
            'behavior': {
                'auto_detect_format': True,
                'parse_markdown': True,
                'show_notifications': True,
                'minimize_to_tray': True,
                'start_with_windows': False
            },
            'ui': {
                'window_opacity': 100,
                'always_on_top': False,
                'show_preview': True,
                'compact_mode': False
            },
            'advanced': {
                'cache_size': 2000,
                'polling_interval': 30,
                'sync_interval': 300,
                'max_content_size': 10485760,  # 10MB
                'image_compression': True,
                'image_max_dimension': 2048
            }
        }
        
        try:
            if self.preferences_file.exists():
                with open(self.preferences_file, 'r', encoding='utf-8') as f:
                    saved_prefs = json.load(f)
                
                # Fusionner avec les défauts
                self._deep_merge(default_preferences, saved_prefs)
                return default_preferences
            
        except Exception:
            pass
        
        return default_preferences
    
    def _deep_merge(self, base: Dict, update: Dict):
        """Fusionne deux dictionnaires en profondeur"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
    
    def clear_sensitive_data(self):
        """Supprime toutes les données sensibles"""
        try:
            if self.encrypted_file.exists():
                self.encrypted_file.unlink()
            
            # Nettoyer aussi la config
            config = self.load_config()
            sensitive_keys = ['notionToken', 'imgbbKey', 'apiKeys']
            
            for key in sensitive_keys:
                config.pop(key, None)
            
            self.save_config(config)
            
        except Exception as e:
            print(f"Erreur suppression données sensibles: {e}")
    
    def export_config(self, include_sensitive: bool = False) -> str:
        """Exporte la configuration"""
        config = self.load_config()
        prefs = self.load_preferences()
        
        export_data = {
            'version': self.config_version,
            'config': config,
            'preferences': prefs
        }
        
        if not include_sensitive:
            # Retirer les données sensibles
            sensitive_keys = ['notionToken', 'imgbbKey', 'apiKeys']
            for key in sensitive_keys:
                export_data['config'].pop(key, None)
        
        return json.dumps(export_data, indent=2)
    
    def import_config(self, json_data: str):
        """Importe une configuration"""
        try:
            data = json.loads(json_data)
            
            if data.get('version') != self.config_version:
                raise ValueError("Version de configuration incompatible")
            
            if 'config' in data:
                self.save_config(data['config'])
            
            if 'preferences' in data:
                self.save_preferences(data['preferences'])
                
        except Exception as e:
            raise Exception(f"Erreur import config: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne des statistiques sur la configuration"""
        stats = {
            'app_directory': str(self.app_dir),
            'config_exists': self.config_file.exists(),
            'vault_exists': self.encrypted_file.exists(),
            'preferences_exists': self.preferences_file.exists(),
            'total_size': 0
        }
        
        # Calculer la taille totale
        for file in [self.config_file, self.encrypted_file, self.preferences_file]:
            if file.exists():
                stats['total_size'] += file.stat().st_size
        
        return stats


# Constantes de configuration
MAX_CLIPBOARD_LENGTH = 10 * 1024 * 1024  # 10MB
MAX_NOTION_TEXT_LENGTH = 2000
MAX_NOTION_BLOCKS = 100
SUPPORTED_IMAGE_FORMATS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'}
SUPPORTED_VIDEO_PLATFORMS = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com']