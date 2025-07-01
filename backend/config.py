"""Configuration module pour Notion Clipper Pro."""
import os
import sys
import base64
import json
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class SecureConfig:
    """Gère le stockage sécurisé des configurations."""
    def __init__(self):
        self.app_dir = self._get_app_data_dir()
        self.config_file = self.app_dir / "notion_config.json"
        self.key = self._get_or_create_key()
        self.cipher = Fernet(self.key)
    def _get_app_data_dir(self):
        if sys.platform == "win32":
            base = os.environ.get('APPDATA', '')
        elif sys.platform == "darwin":
            base = os.path.expanduser("~/Library/Application Support")
        else:
            base = os.environ.get('XDG_CONFIG_HOME', os.path.expanduser("~/.config"))
        app_dir = Path(base) / "notion-clipper-pro"
        app_dir.mkdir(exist_ok=True)
        return app_dir
    def _get_or_create_key(self):
        key_file = self.app_dir / ".key"
        if key_file.exists():
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            password = os.urandom(32)
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'notion-clipper-salt',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(password))
            with open(key_file, 'wb') as f:
                f.write(key)
            if os.name != 'nt':
                os.chmod(key_file, 0o600)
            return key
    def encrypt(self, data: str) -> str:
        return self.cipher.encrypt(data.encode()).decode()
    def decrypt(self, encrypted_data: str) -> str:
        return self.cipher.decrypt(encrypted_data.encode()).decode()
    def save_config(self, config: dict):
        encrypted_config = {}
        for key, value in config.items():
            if key in ['notionToken', 'imgbbKey'] and value:
                encrypted_config[key] = self.encrypt(value)
            else:
                encrypted_config[key] = value
        with open(self.config_file, 'w') as f:
            json.dump(encrypted_config, f)
    def load_config(self) -> dict:
        if not self.config_file.exists():
            return {}
        with open(self.config_file, 'r') as f:
            encrypted_config = json.load(f)
        config = {}
        for key, value in encrypted_config.items():
            if key in ['notionToken', 'imgbbKey'] and value:
                try:
                    config[key] = self.decrypt(value)
                except:
                    config[key] = value
            else:
                config[key] = value
        return config

# Constants
MAX_CLIPBOARD_LENGTH = 2000
CACHE_DURATION = 3600
SMART_POLL_INTERVAL = 60 