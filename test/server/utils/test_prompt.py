"""
Tests for prompt utilities
"""
import pytest
from utils.prompt import format_memories, compose_prompt


@pytest.mark.unit
class TestFormatMemories:
    """Test format_memories function"""
    
    def test_format_memories_empty(self):
        """Test formatting empty memories"""
        result = format_memories([])
        assert result == ""
    
    def test_format_memories_single(self):
        """Test formatting single memory"""
        memories = ["User likes Python"]
        result = format_memories(memories)
        assert "User likes Python" in result
        assert "Previous conversation context" in result
    
    def test_format_memories_multiple(self):
        """Test formatting multiple memories"""
        memories = [
            "User likes Python",
            "User works on AI projects",
            "User prefers GPT-4"
        ]
        result = format_memories(memories)
        assert "User likes Python" in result
        assert "User works on AI projects" in result
        assert "User prefers GPT-4" in result
        assert "- User likes Python" in result
        assert "- User works on AI projects" in result
        assert "- User prefers GPT-4" in result
    
    def test_format_memories_context(self):
        """Test that formatted memories include context instructions"""
        memories = ["User likes Python"]
        result = format_memories(memories)
        assert "Previous conversation context" in result
        assert "reference and build upon" in result.lower()


@pytest.mark.unit
class TestComposePrompt:
    """Test compose_prompt function"""
    
    def test_compose_prompt_no_memories(self):
        """Test composing prompt without memories"""
        user_message = "Hello, how are you?"
        result = compose_prompt([], user_message)
        assert user_message in result
        assert "Current user message" in result
    
    def test_compose_prompt_with_memories(self):
        """Test composing prompt with memories"""
        memories = ["User likes Python"]
        user_message = "What's my favorite language?"
        result = compose_prompt(memories, user_message)
        assert user_message in result
        assert "User likes Python" in result
        assert "Previous conversation context" in result
    
    def test_compose_prompt_multiple_memories(self):
        """Test composing prompt with multiple memories"""
        memories = [
            "User likes Python",
            "User works on AI projects"
        ]
        user_message = "Tell me about my preferences"
        result = compose_prompt(memories, user_message)
        assert user_message in result
        assert "User likes Python" in result
        assert "User works on AI projects" in result
    
    def test_compose_prompt_instructions(self):
        """Test that composed prompt includes instructions"""
        user_message = "hello"
        result = compose_prompt([], user_message)
        assert "Instructions" in result
        assert "respond to the user's message" in result.lower()
        assert "considering the previous context" in result.lower() or "consider the previous context" in result.lower()
    
    def test_compose_prompt_structure(self):
        """Test that composed prompt has proper structure"""
        memories = ["Memory 1"]
        user_message = "Test message"
        result = compose_prompt(memories, user_message)
        
        # Should contain memory context
        assert "Previous conversation context" in result
        # Should contain user message
        assert "Current user message" in result
        assert user_message in result
        # Should contain instructions
        assert "Instructions" in result
