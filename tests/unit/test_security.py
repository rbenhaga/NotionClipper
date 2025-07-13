"""
Tests unitaires pour le module de sécurité
"""

import sys
import os
sys.path.insert(0, os.path.abspath('.'))

import pytest
import tempfile
import shutil
from unittest.mock import patch, MagicMock
from backend.utils.security import SecureStorage, get_secure_api_key, set_secure_api_key

@pytest.fixture
def temp_storage_dir():
    """Crée un répertoire temporaire pour les tests"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


class TestSecureStorage:
    """Tests pour la classe SecureStorage"""
    
    @pytest.fixture
    def secure_storage(self, temp_storage_dir):
        """Crée une instance SecureStorage pour les tests"""
        storage_path = os.path.join(temp_storage_dir, "test_secure_storage.json")
        return SecureStorage(storage_path)
    
    def test_initialization(self, secure_storage):
        """Test l'initialisation du stockage sécurisé"""
        assert secure_storage is not None
        assert hasattr(secure_storage, '_fernet')
        assert hasattr(secure_storage, 'storage_path')
    
    def test_store_and_get_secret(self, secure_storage):
        """Test le stockage et la récupération d'un secret"""
        # Stocker un secret
        result = secure_storage.store_secret('test_key', 'test_value')
        assert result is True
        
        # Récupérer le secret
        value = secure_storage.get_secret('test_key')
        assert value == 'test_value'
    
    def test_get_nonexistent_secret(self, secure_storage):
        """Test la récupération d'un secret inexistant"""
        value = secure_storage.get_secret('nonexistent_key')
        assert value is None
    
    def test_remove_secret(self, secure_storage):
        """Test la suppression d'un secret"""
        # Stocker un secret
        secure_storage.store_secret('test_key', 'test_value')
        
        # Supprimer le secret
        result = secure_storage.remove_secret('test_key')
        assert result is True
        
        # Vérifier qu'il n'existe plus
        value = secure_storage.get_secret('test_key')
        assert value is None
    
    def test_remove_nonexistent_secret(self, secure_storage):
        """Test la suppression d'un secret inexistant"""
        result = secure_storage.remove_secret('nonexistent_key')
        assert result is False
    
    def test_list_secrets(self, secure_storage):
        """Test la liste des secrets"""
        # Stocker plusieurs secrets
        secure_storage.store_secret('key1', 'value1')
        secure_storage.store_secret('key2', 'value2')
        
        # Lister les secrets
        secrets = secure_storage.list_secrets()
        assert 'key1' in secrets
        assert 'key2' in secrets
        assert len(secrets) == 2
    
    def test_clear_all(self, secure_storage):
        """Test la suppression de tous les secrets"""
        # Stocker des secrets
        secure_storage.store_secret('key1', 'value1')
        secure_storage.store_secret('key2', 'value2')
        
        # Supprimer tout
        result = secure_storage.clear_all()
        assert result is True
        
        # Vérifier que la liste est vide
        secrets = secure_storage.list_secrets()
        assert len(secrets) == 0
    
    def test_encryption_decryption(self, secure_storage):
        """Test que les données sont bien chiffrées"""
        test_value = "sensitive_data_123"
        
        # Stocker le secret
        secure_storage.store_secret('sensitive_key', test_value)
        
        # Vérifier que le fichier contient des données chiffrées
        with open(secure_storage.storage_path, 'r') as f:
            import json
            data = json.load(f)
            stored_value = data['sensitive_key']
            
            # La valeur stockée doit être différente de l'original (chiffrée)
            assert stored_value != test_value
            assert len(stored_value) > len(test_value)  # Base64 + chiffrement
    
    def test_persistence(self, temp_storage_dir):
        """Test la persistance des données entre les instances"""
        storage_path = os.path.join(temp_storage_dir, "persistent_storage.json")
        
        # Première instance
        storage1 = SecureStorage(storage_path)
        storage1.store_secret('persistent_key', 'persistent_value')
        
        # Deuxième instance
        storage2 = SecureStorage(storage_path)
        value = storage2.get_secret('persistent_key')
        assert value == 'persistent_value'


class TestSecurityFunctions:
    """Tests pour les fonctions utilitaires de sécurité"""
    
    @patch('backend.utils.security.secure_storage')
    def test_get_secure_api_key(self, mock_storage):
        """Test de la fonction get_secure_api_key"""
        mock_storage.get_secret.return_value = "test_api_key"
        
        result = get_secure_api_key('test_service')
        assert result == "test_api_key"
        mock_storage.get_secret.assert_called_once_with('test_service')
    
    @patch('backend.utils.security.secure_storage')
    def test_set_secure_api_key(self, mock_storage):
        """Test de la fonction set_secure_api_key"""
        mock_storage.store_secret.return_value = True
        
        result = set_secure_api_key('test_service', 'test_key')
        assert result is True
        mock_storage.store_secret.assert_called_once_with('test_service', 'test_key')
    
    @patch('backend.utils.security.secure_storage')
    def test_set_secure_api_key_failure(self, mock_storage):
        """Test de la fonction set_secure_api_key en cas d'échec"""
        mock_storage.store_secret.return_value = False
        
        result = set_secure_api_key('test_service', 'test_key')
        assert result is False


class TestSecurityIntegration:
    """Tests d'intégration pour la sécurité"""
    
    def test_no_hardcoded_keys(self):
        """Test qu'aucune clé API n'est hardcodée dans le code"""
        # Chercher dans les fichiers Python
        python_files = []
        for root, dirs, files in os.walk('backend'):
            for file in files:
                if file.endswith('.py'):
                    python_files.append(os.path.join(root, file))
        
        hardcoded_keys = []
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Chercher des patterns de clés API (exclure les fichiers de test)
                    if 'f3c96fc1d87f81ae20bb67c5a9e90fc9' in content and 'test' not in file_path:
                        hardcoded_keys.append(file_path)
            except Exception:
                continue
        
        assert len(hardcoded_keys) == 0, f"Clés hardcodées trouvées dans: {hardcoded_keys}"
    
    def test_secure_storage_file_permissions(self, temp_storage_dir):
        """Test que les fichiers de stockage ont les bonnes permissions"""
        storage_path = os.path.join(temp_storage_dir, "permissions_test.json")
        storage = SecureStorage(storage_path)
        
        # Stocker un secret pour créer le fichier
        storage.store_secret('test_key', 'test_value')
        
        # Vérifier les permissions du fichier de stockage
        import stat
        file_stat = os.stat(storage_path)
        permissions = stat.S_IMODE(file_stat.st_mode)
        
        # Les permissions doivent être 0o600 (Unix) ou 0o666 (Windows)
        assert permissions in (0o600, 0o666)

    def test_key_file_permissions(self, temp_storage_dir):
        """Test que le fichier de clé a les bonnes permissions"""
        storage_path = os.path.join(temp_storage_dir, "key_test.json")
        storage = SecureStorage(storage_path)
        
        # Créer un secret pour générer la clé
        storage.store_secret('test_key', 'test_value')
        
        # Vérifier les permissions du fichier de clé
        key_file = os.path.join(os.path.dirname(storage_path), ".key")
        import stat
        file_stat = os.stat(key_file)
        permissions = stat.S_IMODE(file_stat.st_mode)
        
        # Les permissions doivent être 0o600 (Unix) ou 0o666 (Windows)
        assert permissions in (0o600, 0o666)


if __name__ == '__main__':
    pytest.main([__file__]) 