"""
Tests for the OpenRouter gateway:
- route_chat / route_chat_stream dispatch to the OpenRouter client
- API key validation (format + live check)
- the cached model-catalog endpoint
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from services.llm_router import route_chat, OPENROUTER_BASE_URL


@pytest.mark.unit
class TestOpenRouterRouting:
    """route_chat should dispatch the 'openrouter' provider to call_openrouter."""

    @patch('services.llm_router.call_openrouter', new_callable=AsyncMock)
    @pytest.mark.asyncio
    async def test_route_chat_openrouter(self, mock_call_openrouter):
        mock_call_openrouter.return_value = "OpenRouter response"
        reply, model = await route_chat("openrouter", "openai/gpt-4o", "Test prompt", "sk-or-test123")
        assert reply == "OpenRouter response"
        assert model == "openai/gpt-4o"
        mock_call_openrouter.assert_called_once_with(
            prompt="Test prompt", model="openai/gpt-4o", api_key="sk-or-test123",
            history=None, system=None, max_tokens=None
        )

    @patch('services.llm_router.asyncio.to_thread')
    @patch('services.llm_router.openai.OpenAI')
    @pytest.mark.asyncio
    async def test_call_openrouter_uses_openrouter_base_url(self, mock_openai, mock_to_thread):
        from services.llm_router import call_openrouter
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Hi from OpenRouter"
        mock_to_thread.return_value = mock_response
        mock_openai.return_value = MagicMock()

        reply = await call_openrouter("Test", "anthropic/claude-sonnet-4", "sk-or-key")
        assert reply == "Hi from OpenRouter"
        # Client must be constructed against the OpenRouter base URL
        _, kwargs = mock_openai.call_args
        assert kwargs["base_url"] == OPENROUTER_BASE_URL
        assert "HTTP-Referer" in kwargs["default_headers"]

    @pytest.mark.asyncio
    async def test_call_openrouter_missing_key(self):
        from services.llm_router import call_openrouter
        with pytest.raises(Exception) as exc_info:
            await call_openrouter("Test", "openai/gpt-4o", None)
        assert "api key" in str(exc_info.value).lower()


@pytest.mark.unit
class TestOpenRouterKeyValidation:
    @pytest.mark.asyncio
    async def test_rejects_bad_key_format(self):
        from utils.api_key_validation import validate_api_key
        ok, msg = await validate_api_key("openrouter", "wrong-prefix-key")
        assert ok is False
        assert "sk-or-" in msg

    @patch('utils.api_key_validation.openai.OpenAI')
    @patch('utils.api_key_validation.asyncio.to_thread', new_callable=AsyncMock)
    @pytest.mark.asyncio
    async def test_accepts_valid_key(self, mock_to_thread, mock_openai):
        from utils.api_key_validation import validate_api_key
        mock_to_thread.return_value = MagicMock()  # models.list succeeds
        ok, msg = await validate_api_key("openrouter", "sk-or-validkey123")
        assert ok is True


@pytest.mark.api
class TestOpenRouterCatalog:
    """The /openrouter/models endpoint proxies + caches the live catalog."""

    def _fake_catalog(self):
        return {
            "data": [
                {"id": "openai/gpt-4o", "name": "OpenAI: GPT-4o", "context_length": 128000,
                 "pricing": {"prompt": "0.0000025", "completion": "0.00001"},
                 "architecture": {"modality": "text+image->text"}},
                {"id": "anthropic/claude-sonnet-4", "name": "Anthropic: Claude Sonnet 4",
                 "context_length": 200000, "pricing": {"prompt": "0.000003", "completion": "0.000015"},
                 "architecture": {"modality": "text->text"}},
            ]
        }

    def _patch_httpx(self):
        """Return a patch context that makes the async httpx client return our catalog."""
        from api.routes import openrouter as oroute
        # Reset cache between tests
        oroute._catalog_cache["models"] = None
        oroute._catalog_cache["fetched_at"] = 0.0

        mock_resp = MagicMock()
        mock_resp.json.return_value = self._fake_catalog()
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        return patch('api.routes.openrouter.httpx.AsyncClient', return_value=mock_client)

    def test_lists_catalog(self, client, test_user, auth_headers):
        with self._patch_httpx():
            resp = client.get("/openrouter/models", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        ids = {m["id"] for m in data["models"]}
        assert ids == {"openai/gpt-4o", "anthropic/claude-sonnet-4"}
        # trimmed shape
        assert "pricing" in data["models"][0]
        assert "context_length" in data["models"][0]

    def test_search_filter(self, client, test_user, auth_headers):
        with self._patch_httpx():
            resp = client.get("/openrouter/models?search=claude", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 1
        assert data["models"][0]["id"] == "anthropic/claude-sonnet-4"

    def test_requires_auth(self, client):
        resp = client.get("/openrouter/models")
        assert resp.status_code in (401, 403, 422)
