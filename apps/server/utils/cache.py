"""
Simple in-memory cache for API keys and other frequently accessed data
Cache expires after a configurable TTL to balance performance and security
"""
import logging
import time
from typing import Optional, Dict, Any
from threading import Lock

logger = logging.getLogger(__name__)

class SimpleCache:
    """Thread-safe in-memory cache with TTL"""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default TTL
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self.default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if it exists and hasn't expired"""
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if time.time() > entry['expires_at']:
                # Entry expired, remove it
                del self._cache[key]
                return None
            
            return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache with optional custom TTL"""
        with self._lock:
            ttl = ttl if ttl is not None else self.default_ttl
            self._cache[key] = {
                'value': value,
                'expires_at': time.time() + ttl
            }
    
    def delete(self, key: str):
        """Delete key from cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def clear(self):
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
    
    def size(self) -> int:
        """Get number of cache entries"""
        with self._lock:
            return len(self._cache)

# Global cache instance for API keys
# TTL of 10 minutes - balance between performance and security
# API keys are decrypted on access, so caching decrypted keys for a short time is safe
api_key_cache = SimpleCache(default_ttl=600)  # 10 minutes

def get_cached_api_key(user_id: str, provider: str) -> Optional[str]:
    """Get decrypted API key from cache"""
    cache_key = f"api_key:{user_id}:{provider}"
    return api_key_cache.get(cache_key)

def set_cached_api_key(user_id: str, provider: str, decrypted_key: str):
    """Store decrypted API key in cache"""
    cache_key = f"api_key:{user_id}:{provider}"
    api_key_cache.set(cache_key, decrypted_key, ttl=600)  # 10 minutes

def clear_api_key_cache(user_id: str, provider: str = None):
    """Clear API key cache for user/provider combination"""
    if provider:
        cache_key = f"api_key:{user_id}:{provider}"
        api_key_cache.delete(cache_key)
    else:
        # Clear all keys for this user
        # Note: This is a simple implementation - in production, consider using a more efficient structure
        with api_key_cache._lock:
            keys_to_delete = [
                key for key in api_key_cache._cache.keys() 
                if key.startswith(f"api_key:{user_id}:")
            ]
            for key in keys_to_delete:
                del api_key_cache._cache[key]

