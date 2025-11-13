"""
Tests for LLM router service
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from services.llm_router import (
    call_openai, call_anthropic, call_mistral, call_inception,
    call_custom_integration, route_chat
)


@pytest.mark.unit
class TestOpenAI:
    """Test OpenAI LLM calls"""
    
    @patch('services.llm_router.openai.OpenAI')
    @pytest.mark.asyncio
    async def test_call_openai_success(self, mock_openai):
        """Test successful OpenAI API call"""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "AI response"
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client
        
        response = await call_openai("Test prompt", "gpt-4o-mini", "sk-test123")
        assert response == "AI response"
    
    @pytest.mark.asyncio
    async def test_call_openai_missing_api_key(self):
        """Test OpenAI call without API key"""
        with pytest.raises(ValueError) as exc_info:
            await call_openai("Test prompt", "gpt-4o-mini", None)
        assert "API key" in str(exc_info.value)


@pytest.mark.unit
class TestAnthropic:
    """Test Anthropic LLM calls"""
    
    @patch('anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_call_anthropic_success(self, mock_anthropic):
        """Test successful Anthropic API call"""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = "Claude response"
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        mock_anthropic.return_value = mock_client
        
        response = await call_anthropic("Test prompt", "claude-3-5-sonnet-20241022", "sk-ant-test123")
        assert response == "Claude response"
    
    @pytest.mark.asyncio
    async def test_call_anthropic_missing_api_key(self):
        """Test Anthropic call without API key"""
        with pytest.raises(ValueError) as exc_info:
            await call_anthropic("Test prompt", "claude-3-5-sonnet-20241022", None)
        assert "API key" in str(exc_info.value)


@pytest.mark.unit
class TestMistral:
    """Test Mistral LLM calls"""
    
    @patch('mistralai.client.MistralClient')
    @pytest.mark.asyncio
    async def test_call_mistral_success(self, mock_mistral):
        """Test successful Mistral API call"""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Mistral response"
        mock_client.chat = AsyncMock(return_value=mock_response)
        mock_mistral.return_value = mock_client
        
        response = await call_mistral("Test prompt", "mistral-small-latest", "mistral-key")
        assert response == "Mistral response"
    
    @pytest.mark.asyncio
    async def test_call_mistral_missing_api_key(self):
        """Test Mistral call without API key"""
        with pytest.raises(ValueError) as exc_info:
            await call_mistral("Test prompt", "mistral-small-latest", None)
        assert "API key" in str(exc_info.value)


@pytest.mark.unit
class TestCustomIntegration:
    """Test custom integration LLM calls"""
    
    @patch('openai.OpenAI')
    @pytest.mark.asyncio
    async def test_call_custom_integration_success(self, mock_openai):
        """Test successful custom integration API call"""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Custom response"
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client
        
        response = await call_custom_integration(
            "Test prompt",
            "custom-model",
            "sk-custom123",
            "https://api.custom.com",
            "openai"
        )
        assert response == "Custom response"
    
    @pytest.mark.asyncio
    async def test_call_custom_integration_missing_api_key(self):
        """Test custom integration call without API key"""
        with pytest.raises(ValueError) as exc_info:
            await call_custom_integration("Test prompt", "model", None, "https://api.example.com", "openai")
        assert "API key" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_call_custom_integration_missing_base_url(self):
        """Test custom integration call without base URL"""
        with pytest.raises(ValueError) as exc_info:
            await call_custom_integration("Test prompt", "model", "sk-key", None, "openai")
        assert "Base URL" in str(exc_info.value)


@pytest.mark.unit
class TestRouteChat:
    """Test route_chat function"""
    
    @patch('services.llm_router.call_openai')
    @pytest.mark.asyncio
    async def test_route_chat_openai(self, mock_call_openai):
        """Test routing to OpenAI"""
        mock_call_openai.return_value = "OpenAI response"
        reply, model = await route_chat("openai", "gpt-4o-mini", "Test prompt", "sk-test123")
        assert reply == "OpenAI response"
        assert model == "gpt-4o-mini"
        mock_call_openai.assert_called_once_with("Test prompt", "gpt-4o-mini", "sk-test123")
    
    @patch('services.llm_router.call_anthropic')
    @pytest.mark.asyncio
    async def test_route_chat_anthropic(self, mock_call_anthropic):
        """Test routing to Anthropic"""
        mock_call_anthropic.return_value = "Anthropic response"
        reply, model = await route_chat("anthropic", "claude-3-5-sonnet-20241022", "Test prompt", "sk-ant-test123")
        assert reply == "Anthropic response"
        assert model == "claude-3-5-sonnet-20241022"
        mock_call_anthropic.assert_called_once_with("Test prompt", "claude-3-5-sonnet-20241022", "sk-ant-test123")
    
    @patch('services.llm_router.call_mistral')
    @pytest.mark.asyncio
    async def test_route_chat_mistral(self, mock_call_mistral):
        """Test routing to Mistral"""
        mock_call_mistral.return_value = "Mistral response"
        reply, model = await route_chat("mistral", "mistral-small-latest", "Test prompt", "mistral-key")
        assert reply == "Mistral response"
        assert model == "mistral-small-latest"
        mock_call_mistral.assert_called_once_with("Test prompt", "mistral-small-latest", "mistral-key")
    
    @patch('services.llm_router.call_custom_integration')
    @pytest.mark.asyncio
    async def test_route_chat_custom_integration(self, mock_call_custom):
        """Test routing to custom integration"""
        mock_call_custom.return_value = "Custom response"
        mock_integration = MagicMock()
        mock_integration.base_url = "https://api.custom.com"
        mock_integration.api_type = "openai"
        mock_integration.name = "Custom Provider"
        
        reply, model = await route_chat(
            "custom_test",
            "custom-model",
            "Test prompt",
            "sk-custom123",
            mock_integration
        )
        assert reply == "Custom response"
        assert model == "Custom Provider"
        mock_call_custom.assert_called_once_with(
            "Test prompt",
            "custom-model",
            "sk-custom123",
            "https://api.custom.com",
            "openai"
        )
    
    @pytest.mark.asyncio
    async def test_route_chat_unknown_provider(self):
        """Test routing to unknown provider"""
        with pytest.raises(ValueError) as exc_info:
            await route_chat("unknown", "model", "Test prompt", "key")
        assert "Unknown model provider" in str(exc_info.value)
