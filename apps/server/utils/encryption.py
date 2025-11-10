"""Encryption utilities for API keys"""
from cryptography.fernet import Fernet
from config.settings import settings

def get_cipher():
    """Get Fernet cipher for encryption/decryption"""
    encryption_key = settings.encryption_key
    if not encryption_key:
        raise ValueError("ENCRYPTION_KEY not set in environment variables")
    return Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)

def encrypt_key(api_key: str) -> str:
    """Encrypt API key"""
    cipher = get_cipher()
    return cipher.encrypt(api_key.encode()).decode()

def decrypt_key(encrypted_key: str) -> str:
    """Decrypt API key"""
    cipher = get_cipher()
    return cipher.decrypt(encrypted_key.encode()).decode()

