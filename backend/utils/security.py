"""
Module de sécurité pour NotionClipper Pro
Gestion sécurisée des clés API et des données sensibles
"""

import os
import json
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

class SecureStorage:
    """
    Gestionnaire de stockage sécurisé pour les clés API et données sensibles
    """
    
    def __init__(self, storage_path: str = None):
        """
        Initialise le stockage sécurisé
        
        Args:
            storage_path: Chemin vers le fichier de stockage sécurisé
        """
        self.storage_path = storage_path or os.path.join(
            os.path.expanduser("~"), 
            ".notionclipper", 
            "secure_storage.json"
        )
        self._ensure_storage_dir()
        self._key = self._get_or_create_key()
        self._fernet = Fernet(self._key)
        
    def _ensure_storage_dir(self):
        """Crée le répertoire de stockage s'il n'existe pas"""
        storage_dir = os.path.dirname(self.storage_path)
        os.makedirs(storage_dir, exist_ok=True)
        
    def _get_or_create_key(self) -> bytes:
        """Récupère ou crée une clé de chiffrement"""
        key_file = os.path.join(os.path.dirname(self.storage_path), ".key")
        
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # Générer une nouvelle clé
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            # Définir les permissions restrictives
            os.chmod(key_file, 0o600)
            return key
    
    def _derive_key_from_password(self, password: str, salt: bytes) -> bytes:
        """Dérive une clé à partir d'un mot de passe"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))
    
    def store_secret(self, key: str, value: str) -> bool:
        """
        Stocke une valeur secrète de manière chiffrée
        
        Args:
            key: Clé d'identification
            value: Valeur à chiffrer
            
        Returns:
            bool: True si succès, False sinon
        """
        try:
            # Charger les données existantes
            data = self._load_encrypted_data()
            
            # Chiffrer la nouvelle valeur
            encrypted_value = self._fernet.encrypt(value.encode())
            data[key] = base64.b64encode(encrypted_value).decode()
            
            # Sauvegarder
            self._save_encrypted_data(data)
            logger.info(f"Secret '{key}' stocké avec succès")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors du stockage du secret '{key}': {e}")
            return False
    
    def get_secret(self, key: str) -> Optional[str]:
        """
        Récupère une valeur secrète déchiffrée
        
        Args:
            key: Clé d'identification
            
        Returns:
            str: Valeur déchiffrée ou None si erreur
        """
        try:
            data = self._load_encrypted_data()
            
            if key not in data:
                logger.warning(f"Clé '{key}' non trouvée dans le stockage")
                return None
            
            # Déchiffrer la valeur
            encrypted_value = base64.b64decode(data[key])
            decrypted_value = self._fernet.decrypt(encrypted_value)
            return decrypted_value.decode()
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du secret '{key}': {e}")
            return None
    
    def remove_secret(self, key: str) -> bool:
        """
        Supprime une valeur secrète
        
        Args:
            key: Clé d'identification
            
        Returns:
            bool: True si succès, False sinon
        """
        try:
            data = self._load_encrypted_data()
            
            if key in data:
                del data[key]
                self._save_encrypted_data(data)
                logger.info(f"Secret '{key}' supprimé avec succès")
                return True
            else:
                logger.warning(f"Clé '{key}' non trouvée pour suppression")
                return False
                
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du secret '{key}': {e}")
            return False
    
    def list_secrets(self) -> list:
        """
        Liste toutes les clés secrètes stockées
        
        Returns:
            list: Liste des clés disponibles
        """
        try:
            data = self._load_encrypted_data()
            return list(data.keys())
        except Exception as e:
            logger.error(f"Erreur lors de la liste des secrets: {e}")
            return []
    
    def _load_encrypted_data(self) -> Dict[str, str]:
        """Charge les données chiffrées depuis le fichier"""
        if not os.path.exists(self.storage_path):
            return {}
        
        try:
            with open(self.storage_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Erreur lors du chargement des données chiffrées: {e}")
            return {}
    
    def _save_encrypted_data(self, data: Dict[str, str]):
        """Sauvegarde les données chiffrées dans le fichier"""
        try:
            with open(self.storage_path, 'w') as f:
                json.dump(data, f, indent=2)
            # Définir les permissions restrictives
            os.chmod(self.storage_path, 0o600)
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde des données chiffrées: {e}")
            raise
    
    def clear_all(self) -> bool:
        """
        Supprime toutes les données secrètes
        
        Returns:
            bool: True si succès, False sinon
        """
        try:
            if os.path.exists(self.storage_path):
                os.remove(self.storage_path)
            logger.info("Toutes les données secrètes supprimées")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la suppression des données: {e}")
            return False

# Instance globale pour l'application
secure_storage = SecureStorage()

def get_secure_api_key(key_name: str) -> Optional[str]:
    """
    Récupère une clé API depuis le stockage sécurisé
    
    Args:
        key_name: Nom de la clé API
        
    Returns:
        str: Clé API ou None si non trouvée
    """
    return secure_storage.get_secret(key_name)

def set_secure_api_key(key_name: str, api_key: str) -> bool:
    """
    Stocke une clé API de manière sécurisée
    
    Args:
        key_name: Nom de la clé API
        api_key: Valeur de la clé API
        
    Returns:
        bool: True si succès, False sinon
    """
    return secure_storage.store_secret(key_name, api_key)

def remove_secure_api_key(key_name: str) -> bool:
    """
    Supprime une clé API du stockage sécurisé
    
    Args:
        key_name: Nom de la clé API
        
    Returns:
        bool: True si succès, False sinon
    """
    return secure_storage.remove_secret(key_name) 