"""
Module de configuration sécurisée pour NotionClipper Pro
Gestion centralisée des paramètres de l'application
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from .security import get_secure_api_key, set_secure_api_key

logger = logging.getLogger(__name__)

class SecureConfig:
    """
    Gestionnaire de configuration sécurisée
    """
    
    def __init__(self, config_path: str = None):
        """
        Initialise la configuration sécurisée
        
        Args:
            config_path: Chemin vers le fichier de configuration
        """
        self.config_path = config_path or os.path.join(
            os.path.expanduser("~"), 
            ".notionclipper", 
            "config.json"
        )
        self._ensure_config_dir()
        self._config = self._load_config()
        
    def _ensure_config_dir(self):
        """Crée le répertoire de configuration s'il n'existe pas"""
        config_dir = os.path.dirname(self.config_path)
        os.makedirs(config_dir, exist_ok=True)
        
    def _load_config(self) -> Dict[str, Any]:
        """Charge la configuration depuis le fichier"""
        if not os.path.exists(self.config_path):
            return self._get_default_config()
        
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
                # Fusionner avec la configuration par défaut
                default_config = self._get_default_config()
                default_config.update(config)
                return default_config
        except Exception as e:
            logger.error(f"Erreur lors du chargement de la configuration: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Retourne la configuration par défaut"""
        return {
            "environment": os.getenv("ENVIRONMENT", "development"),
            "log_level": os.getenv("LOG_LEVEL", "INFO"),
            "debug": os.getenv("DEBUG", "false").lower() == "true",
            "api": {
                "host": os.getenv("API_HOST", "localhost"),
                "port": int(os.getenv("API_PORT", "5000")),
                "cors_origins": ["http://localhost:3000", "http://localhost:5173"]
            },
            "notion": {
                "api_version": "2022-06-28",
                "base_url": "https://api.notion.com/v1"
            },
            "imgbb": {
                "base_url": "https://api.imgbb.com/1/upload",
                "key_name": "imgbb_api_key"
            },
            "security": {
                "encryption_enabled": True,
                "session_timeout": 3600,
                "max_retries": 3
            },
            "features": {
                "auto_save": True,
                "preview_enabled": True,
                "suggestions_enabled": True,
                "analytics_enabled": False
            }
        }
    
    def _save_config(self):
        """Sauvegarde la configuration dans le fichier"""
        try:
            with open(self.config_path, 'w') as f:
                json.dump(self._config, f, indent=2)
            # Définir les permissions restrictives
            os.chmod(self.config_path, 0o600)
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde de la configuration: {e}")
            raise
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Récupère une valeur de configuration
        
        Args:
            key: Clé de configuration (supporte la notation pointée)
            default: Valeur par défaut si la clé n'existe pas
            
        Returns:
            Any: Valeur de configuration
        """
        try:
            keys = key.split('.')
            value = self._config
            
            for k in keys:
                if isinstance(value, dict) and k in value:
                    value = value[k]
                else:
                    return default
            
            return value
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de la config '{key}': {e}")
            return default
    
    def set(self, key: str, value: Any) -> bool:
        """
        Définit une valeur de configuration
        
        Args:
            key: Clé de configuration (supporte la notation pointée)
            value: Valeur à définir
            
        Returns:
            bool: True si succès, False sinon
        """
        try:
            keys = key.split('.')
            config = self._config
            
            # Naviguer jusqu'au niveau parent
            for k in keys[:-1]:
                if k not in config:
                    config[k] = {}
                config = config[k]
            
            # Définir la valeur
            config[keys[-1]] = value
            self._save_config()
            logger.info(f"Configuration '{key}' mise à jour")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de la définition de la config '{key}': {e}")
            return False
    
    def get_api_key(self, service: str) -> Optional[str]:
        """
        Récupère une clé API de manière sécurisée
        
        Args:
            service: Nom du service (ex: 'imgbb', 'notion')
            
        Returns:
            str: Clé API ou None si non trouvée
        """
        key_name = self.get(f"{service}.key_name", f"{service}_api_key")
        return get_secure_api_key(key_name)
    
    def set_api_key(self, service: str, api_key: str) -> bool:
        """
        Stocke une clé API de manière sécurisée
        
        Args:
            service: Nom du service
            api_key: Clé API à stocker
            
        Returns:
            bool: True si succès, False sinon
        """
        key_name = self.get(f"{service}.key_name", f"{service}_api_key")
        return set_secure_api_key(key_name, api_key)
    
    def get_all(self) -> Dict[str, Any]:
        """
        Récupère toute la configuration
        
        Returns:
            Dict[str, Any]: Configuration complète
        """
        return self._config.copy()
    
    def reload(self):
        """Recharge la configuration depuis le fichier"""
        self._config = self._load_config()
        logger.info("Configuration rechargée")
    
    def reset_to_defaults(self) -> bool:
        """
        Remet la configuration aux valeurs par défaut
        
        Returns:
            bool: True si succès, False sinon
        """
        try:
            self._config = self._get_default_config()
            self._save_config()
            logger.info("Configuration remise aux valeurs par défaut")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la remise à zéro: {e}")
            return False

# Instance globale pour l'application
secure_config = SecureConfig()

def get_config(key: str = None, default: Any = None) -> Any:
    """
    Fonction utilitaire pour récupérer la configuration
    
    Args:
        key: Clé de configuration (optionnel)
        default: Valeur par défaut
        
    Returns:
        Any: Valeur de configuration ou configuration complète
    """
    if key is None:
        return secure_config.get_all()
    return secure_config.get(key, default)

def set_config(key: str, value: Any) -> bool:
    """
    Fonction utilitaire pour définir la configuration
    
    Args:
        key: Clé de configuration
        value: Valeur à définir
        
    Returns:
        bool: True si succès, False sinon
    """
    return secure_config.set(key, value)

def get_api_key(service: str) -> Optional[str]:
    """
    Fonction utilitaire pour récupérer une clé API
    
    Args:
        service: Nom du service
        
    Returns:
        str: Clé API ou None
    """
    return secure_config.get_api_key(service)

def set_api_key(service: str, api_key: str) -> bool:
    """
    Fonction utilitaire pour stocker une clé API
    
    Args:
        service: Nom du service
        api_key: Clé API
        
    Returns:
        bool: True si succès, False sinon
    """
    return secure_config.set_api_key(service, api_key) 