"""
Tests for API key validation utilities
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from utils.api_key_validation import (
    validate_openai_key, validate_anthropic_key, validate_mistral_key,
    validate_inception_key, validate_custom_integration_key, validate_api_key
)


@pytest.mark.unit
class TestAPIKeyValidation:
    """Test API key validation utilities"""
    
    @patch('utils.api_key_validation.openai.OpenAI')
    @pytest.mark.asyncio
    async def test_validate_openai_key_success(self, mock_openai):
        """Test successful OpenAI key validation"""
        mock_client = MagicMock()
        mock_client.models.list.return_value = [MagicMock()]
        mock_openai.return_value = mock_client
        
        is_valid, error = await validate_openai_key("sk-test123456789")
        assert is_valid is True
        assert error == ""
    
    @patch('utils.api_key_validation.openai.OpenAI')
    @pytest.mark.asyncio
    async def test_validate_openai_key_invalid(self, mock_openai):
        """Test invalid OpenAI key validation"""
        import openai
        mock_openai.side_effect = openai.AuthenticationError("Invalid API key")
        
        is_valid, error = await validate_openai_key("sk-invalid")
        assert is_valid is False
        assert "invalid" in error.lower()
    
    @patch('utils.api_key_validation.Anthropic')
    @pytest.mark.asyncio
    async def test_validate_anthropic_key_success(self, mock_anthropic):
        """Test successful Anthropic key validation"""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client
        
        is_valid, error = await validate_anthropic_key("sk-ant-test123456789")
        assert is_valid is True
        assert error == ""
    
    @patch('utils.api_key_validation.Anthropic')
    @pytest.mark.asyncio
    async def test_validate_anthropic_key_invalid(self, mock_anthropic):
        """Test invalid Anthropic key validation"""
        mock_anthropic.side_effect = Exception("401 Unauthorized")
        
        is_valid, error = await validate_anthropic_key("sk-ant-invalid")
        assert is_valid is False
        assert "invalid" in error.lower()
    
    @patch('utils.api_key_validation.MistralClient')
    @pytest.mark.asyncio
    async def test_validate_mistral_key_success(self, mock_mistral):
        """Test successful Mistral key validation"""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_client.chat.return_value = mock_response
        mock_mistral.return_value = mock_client
        
        is_valid, error = await validate_mistral_key("mistral-key")
        assert is_valid is True
        assert error == ""
    
    @patch('utils.api_key_validation.MistralClient')
    @pytest.mark.asyncio
    async def test_validate_mistral_key_invalid(self, mock_mistral):
        """Test invalid Mistral key validation"""
        mock_mistral.side_effect = Exception("401 Unauthorized")
        
        is_valid, error = await validate_mistral_key("invalid-key")
        assert is_valid is False
        assert "invalid" in error.lower()
    
    @patch('utils.api_key_validation.openai.OpenAI')
    @pytest.mark.asyncio
    async def test_validate_custom_integration_key_success(self, mock_openai):
        """Test successful custom integration key validation"""
        mock_client = MagicMock()
        mock_client.models.list.return_value = [MagicMock()]
        mock_openai.return_value = mock_client
        
        is_valid, error = await validate_custom_integration_key(
            "sk-test123",
            "https://api.custom.com",
            "openai"
        )
        assert is_valid is True
        assert error == ""
    
    @pytest.mark.asyncio
    async def test_validate_api_key_openai(self):
        """Test validate_api_key for OpenAI"""
        with patch('utils.api_key_validation.validate_openai_key', new_callable=AsyncMock) as mock_validate:
            mock_validate.return_value = (True, "")
            is_valid, error = await validate_api_key("openai", "sk-test123")
            assert is_valid is True
            mock_validate.assert_called_once_with("sk-test123")
    
    @pytest.mark.asyncio
    async def test_validate_api_key_openai_invalid_format(self):
        """Test validate_api_key for OpenAI with invalid format"""
        is_valid, error = await validate_api_key("openai", "invalid-key")
        assert is_valid is False
        assert "format" in error.lower()
    
    @pytest.mark.asyncio
    async def test_validate_api_key_anthropic(self):
        """Test validate_api_key for Anthropic"""
        with patch('utils.api_key_validation.validate_anthropic_key', new_callable=AsyncMock) as mock_validate:
            mock_validate.return_value = (True, "")
            is_valid, error = await validate_api_key("anthropic", "sk-ant-test123")
            assert is_valid is True
            mock_validate.assert_called_once_with("sk-ant-test123")
    
    @pytest.mark.asyncio
    async def test_validate_api_key_anthropic_invalid_format(self):
        """Test validate_api_key for Anthropic with invalid format"""
        is_valid, error = await validate_api_key("anthropic", "invalid-key")
        assert is_valid is False
        assert "format" in error.lower()
    
    @pytest.mark.asyncio
    async def test_validate_api_key_mistral(self):
        """Test validate_api_key for Mistral"""
        with patch('utils.api_key_validation.validate_mistral_key', new_callable=AsyncMock) as mock_validate:
            mock_validate.return_value = (True, "")
            is_valid, error = await validate_api_key("mistral", "mistral-key")
            assert is_valid is True
            mock_validate.assert_called_once_with("mistral-key")
    
    @pytest.mark.asyncio
    async def test_validate_api_key_custom_with_base_url(self):
        """Test validate_api_key for custom integration with base_url"""
        with patch('utils.api_key_validation.validate_custom_integration_key', new_callable=AsyncMock) as mock_validate:
            mock_validate.return_value = (True, "")
            is_valid, error = await validate_api_key(
                "custom_test",
                "sk-custom123",
                base_url="https://api.custom.com",
                api_type="openai"
            )
            assert is_valid is True
            mock_validate.assert_called_once_with("sk-custom123", "https://api.custom.com", "openai")
    
    @pytest.mark.asyncio
    async def test_validate_api_key_custom_without_base_url(self):
        """Test validate_api_key for custom integration without base_url"""
        is_valid, error = await validate_api_key("custom_test", "sk-custom123")
        assert is_valid is True
        assert error == ""
    
    @pytest.mark.asyncio
    async def test_validate_api_key_unknown_provider(self):
        """Test validate_api_key for unknown provider"""
        is_valid, error = await validate_api_key("unknown", "key")
        assert is_valid is False
        assert "unknown" in error.lower()
