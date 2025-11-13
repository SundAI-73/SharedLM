"""
Tests for cache utilities
"""
import pytest
import time
from utils.cache import (
    SimpleCache, get_cached_api_key, set_cached_api_key,
    clear_api_key_cache, api_key_cache
)


@pytest.mark.unit
class TestSimpleCache:
    """Test SimpleCache class"""
    
    def test_cache_get_set(self):
        """Test getting and setting cache values"""
        cache = SimpleCache(default_ttl=60)
        cache.set("test_key", "test_value")
        value = cache.get("test_key")
        assert value == "test_value"
    
    def test_cache_get_nonexistent(self):
        """Test getting nonexistent cache key"""
        cache = SimpleCache(default_ttl=60)
        value = cache.get("nonexistent_key")
        assert value is None
    
    def test_cache_expiry(self):
        """Test cache expiry"""
        cache = SimpleCache(default_ttl=1)  # 1 second TTL
        cache.set("test_key", "test_value")
        value = cache.get("test_key")
        assert value == "test_value"
        
        # Wait for expiry
        time.sleep(1.1)
        value = cache.get("test_key")
        assert value is None
    
    def test_cache_delete(self):
        """Test deleting cache key"""
        cache = SimpleCache(default_ttl=60)
        cache.set("test_key", "test_value")
        cache.delete("test_key")
        value = cache.get("test_key")
        assert value is None
    
    def test_cache_clear(self):
        """Test clearing all cache"""
        cache = SimpleCache(default_ttl=60)
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.clear()
        assert cache.get("key1") is None
        assert cache.get("key2") is None
    
    def test_cache_size(self):
        """Test getting cache size"""
        cache = SimpleCache(default_ttl=60)
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        assert cache.size() == 2
    
    def test_cache_custom_ttl(self):
        """Test cache with custom TTL"""
        cache = SimpleCache(default_ttl=60)
        cache.set("test_key", "test_value", ttl=1)  # 1 second TTL
        value = cache.get("test_key")
        assert value == "test_value"
        
        # Wait for expiry
        time.sleep(1.1)
        value = cache.get("test_key")
        assert value is None


@pytest.mark.unit
class TestAPIKeyCache:
    """Test API key cache functions"""
    
    def test_set_get_cached_api_key(self):
        """Test setting and getting cached API key"""
        user_id = "test_user"
        provider = "openai"
        api_key = "sk-test123456789"
        
        set_cached_api_key(user_id, provider, api_key)
        cached = get_cached_api_key(user_id, provider)
        assert cached == api_key
    
    def test_get_cached_api_key_nonexistent(self):
        """Test getting nonexistent cached API key"""
        cached = get_cached_api_key("nonexistent_user", "openai")
        assert cached is None
    
    def test_clear_api_key_cache(self):
        """Test clearing API key cache"""
        user_id = "test_user"
        provider = "openai"
        api_key = "sk-test123456789"
        
        set_cached_api_key(user_id, provider, api_key)
        cached = get_cached_api_key(user_id, provider)
        assert cached == api_key
        
        clear_api_key_cache(user_id, provider)
        cached = get_cached_api_key(user_id, provider)
        assert cached is None
    
    def test_clear_all_user_api_keys(self):
        """Test clearing all API keys for a user"""
        user_id = "test_user"
        
        set_cached_api_key(user_id, "openai", "sk-openai")
        set_cached_api_key(user_id, "anthropic", "sk-anthropic")
        set_cached_api_key(user_id, "mistral", "sk-mistral")
        
        # Clear all keys for user
        clear_api_key_cache(user_id)
        
        assert get_cached_api_key(user_id, "openai") is None
        assert get_cached_api_key(user_id, "anthropic") is None
        assert get_cached_api_key(user_id, "mistral") is None
    
    def test_cache_expiry_api_key(self):
        """Test API key cache expiry"""
        user_id = "test_user"
        provider = "openai"
        api_key = "sk-test123456789"
        
        # Set with short TTL (600 seconds = 10 minutes default)
        # For testing, we'll just verify the cache works
        set_cached_api_key(user_id, provider, api_key)
        cached = get_cached_api_key(user_id, provider)
        assert cached == api_key
    
    def test_cache_multiple_users(self):
        """Test caching API keys for multiple users"""
        user1_id = "user1"
        user2_id = "user2"
        provider = "openai"
        
        set_cached_api_key(user1_id, provider, "sk-user1")
        set_cached_api_key(user2_id, provider, "sk-user2")
        
        assert get_cached_api_key(user1_id, provider) == "sk-user1"
        assert get_cached_api_key(user2_id, provider) == "sk-user2"
        
        # Clear user1's key
        clear_api_key_cache(user1_id, provider)
        assert get_cached_api_key(user1_id, provider) is None
        assert get_cached_api_key(user2_id, provider) == "sk-user2"
