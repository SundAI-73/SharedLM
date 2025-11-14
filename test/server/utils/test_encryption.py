"""
Tests for encryption utilities
"""
import pytest
from cryptography.fernet import Fernet
import os


@pytest.mark.unit
class TestEncryption:
    """Test encryption utilities"""
    
    def test_encrypt_decrypt_key(self, monkeypatch):
        """Test encrypting and decrypting a key"""
        # Generate test encryption key
        test_key = Fernet.generate_key().decode()
        monkeypatch.setenv("ENCRYPTION_KEY", test_key)
        
        from utils.encryption import encrypt_key, decrypt_key
        
        original_key = "sk-test123456789"
        encrypted = encrypt_key(original_key)
        
        # Verify encrypted key is different from original
        assert encrypted != original_key
        assert isinstance(encrypted, str)
        
        # Decrypt and verify
        decrypted = decrypt_key(encrypted)
        assert decrypted == original_key
    
    def test_encrypt_decrypt_different_keys(self, monkeypatch):
        """Test that different keys encrypt differently"""
        test_key = Fernet.generate_key().decode()
        monkeypatch.setenv("ENCRYPTION_KEY", test_key)
        
        from utils.encryption import encrypt_key
        
        key1 = "sk-test123456789"
        key2 = "sk-test987654321"
        
        encrypted1 = encrypt_key(key1)
        encrypted2 = encrypt_key(key2)
        
        # Verify different keys produce different encrypted values
        assert encrypted1 != encrypted2
    
    def test_missing_encryption_key(self, monkeypatch):
        """Test that missing encryption key raises error"""
        monkeypatch.delenv("ENCRYPTION_KEY", raising=False)
        
        from utils.encryption import get_cipher
        from config.settings import settings
        # Also clear from settings object
        original_key = settings.encryption_key
        settings.encryption_key = ""
        
        try:
            with pytest.raises(ValueError, match="ENCRYPTION_KEY"):
                get_cipher()
        finally:
            settings.encryption_key = original_key

