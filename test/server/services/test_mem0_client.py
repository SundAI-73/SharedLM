"""
Tests for Mem0 client service
"""
import pytest
from unittest.mock import patch, MagicMock
from services.mem0_client import Mem0Client, mem0_client


@pytest.mark.unit
class TestMem0Client:
    """Test Mem0Client class"""
    
    @patch('services.mem0_client.MemoryClient')
    def test_search_memories_success_list(self, mock_memory_client):
        """Test searching memories with list response"""
        mock_client = MagicMock()
        mock_client.search.return_value = [
            {"memory": "User likes Python"},
            {"memory": "User works on AI"}
        ]
        mock_memory_client.return_value = mock_client
        
        client = Mem0Client()
        memories = client.search_memories("user123", "What does the user like?")
        assert len(memories) == 2
        assert "User likes Python" in memories
        assert "User works on AI" in memories
    
    @patch('services.mem0_client.MemoryClient')
    def test_search_memories_success_dict(self, mock_memory_client):
        """Test searching memories with dict response"""
        mock_client = MagicMock()
        mock_client.search.return_value = {
            "results": [
                {"memory": "User likes Python"},
                {"memory": "User works on AI"}
            ]
        }
        mock_memory_client.return_value = mock_client
        
        client = Mem0Client()
        memories = client.search_memories("user123", "What does the user like?")
        assert len(memories) == 2
        assert "User likes Python" in memories
        assert "User works on AI" in memories
    
    @patch('services.mem0_client.MemoryClient')
    def test_search_memories_error(self, mock_memory_client):
        """Test searching memories with error"""
        mock_client = MagicMock()
        mock_client.search.side_effect = Exception("API error")
        mock_memory_client.return_value = mock_client
        
        client = Mem0Client()
        memories = client.search_memories("user123", "query")
        assert memories == []
    
    @patch('services.mem0_client.MemoryClient')
    def test_add_memory_success(self, mock_memory_client):
        """Test adding memory successfully"""
        mock_client = MagicMock()
        mock_client.add.return_value = None
        mock_memory_client.return_value = mock_client
        
        client = Mem0Client()
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"}
        ]
        result = client.add_memory("user123", messages)
        assert result is True
        mock_client.add.assert_called_once()
    
    @patch('services.mem0_client.MemoryClient')
    def test_add_memory_error(self, mock_memory_client):
        """Test adding memory with error"""
        mock_client = MagicMock()
        mock_client.add.side_effect = Exception("API error")
        mock_memory_client.return_value = mock_client
        
        client = Mem0Client()
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"}
        ]
        result = client.add_memory("user123", messages)
        assert result is False
    
    @patch('services.mem0_client.MemoryClient')
    def test_search_memories_with_limit(self, mock_memory_client):
        """Test searching memories with custom limit"""
        mock_client = MagicMock()
        mock_client.search.return_value = [
            {"memory": "Memory 1"},
            {"memory": "Memory 2"},
            {"memory": "Memory 3"}
        ]
        mock_memory_client.return_value = mock_client
        
        client = Mem0Client()
        memories = client.search_memories("user123", "query", limit=2)
        # Should call with limit=2
        mock_client.search.assert_called_once()
        call_args = mock_client.search.call_args
        assert call_args[1]["limit"] == 2
