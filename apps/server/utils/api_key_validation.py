"""
API Key Validation Utility
Validates API keys by making actual API calls to verify they work and belong to the correct provider.
"""
import logging
import asyncio
from typing import Optional
import openai
from anthropic import Anthropic
from mistralai.client import MistralClient
from mistralai.models import chat_completion

logger = logging.getLogger(__name__)


async def validate_openai_key(api_key: str) -> tuple[bool, str]:
    """
    Validate OpenAI API key by listing models.
    Returns (is_valid, error_message)
    """
    try:
        client = openai.OpenAI(api_key=api_key)
        # Use a lightweight endpoint to validate the key
        models = await asyncio.to_thread(client.models.list)
        # If we can list models, the key is valid
        return True, ""
    except openai.AuthenticationError:
        return False, "Invalid API key. Please check your OpenAI API key."
    except openai.APIError as e:
        error_msg = str(e)
        if "invalid_api_key" in error_msg.lower() or "401" in error_msg:
            return False, "Invalid API key. Please check your OpenAI API key."
        return False, f"OpenAI API error: {error_msg}"
    except Exception as e:
        logger.error(f"OpenAI key validation error: {e}")
        return False, f"Failed to validate OpenAI API key: {str(e)}"


async def validate_anthropic_key(api_key: str) -> tuple[bool, str]:
    """
    Validate Anthropic API key by making a minimal test message.
    Returns (is_valid, error_message)
    """
    try:
        client = Anthropic(api_key=api_key)
        # Make a minimal test call with very few tokens
        response = await asyncio.to_thread(
            client.messages.create,
            model="claude-3-haiku-20240307",  # Use cheapest model for validation
            max_tokens=1,
            messages=[{"role": "user", "content": "test"}]
        )
        # If we get a response, the key is valid
        return True, ""
    except Exception as e:
        error_msg = str(e)
        if "invalid_api_key" in error_msg.lower() or "401" in error_msg or "authentication" in error_msg.lower():
            return False, "Invalid API key. Please check your Anthropic API key."
        if "403" in error_msg or "forbidden" in error_msg.lower():
            return False, "API key does not have required permissions. Please check your Anthropic API key."
        logger.error(f"Anthropic key validation error: {e}")
        return False, f"Failed to validate Anthropic API key: {str(e)}"


async def validate_mistral_key(api_key: str) -> tuple[bool, str]:
    """
    Validate Mistral API key by making a minimal test call.
    Returns (is_valid, error_message)
    """
    try:
        client = MistralClient(api_key=api_key)
        # Make a minimal test call
        response = await asyncio.to_thread(
            client.chat,
            model="mistral-small-latest",
            messages=[chat_completion.ChatMessage(role="user", content="test")]
        )
        # If we get a response, the key is valid
        return True, ""
    except Exception as e:
        error_msg = str(e)
        if "invalid_api_key" in error_msg.lower() or "401" in error_msg or "authentication" in error_msg.lower():
            return False, "Invalid API key. Please check your Mistral API key."
        if "403" in error_msg or "forbidden" in error_msg.lower():
            return False, "API key does not have required permissions. Please check your Mistral API key."
        logger.error(f"Mistral key validation error: {e}")
        return False, f"Failed to validate Mistral API key: {str(e)}"


async def validate_inception_key(api_key: str) -> tuple[bool, str]:
    """
    Validate Inception Labs API key by listing models.
    Returns (is_valid, error_message)
    """
    try:
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.inceptionlabs.ai/v1"
        )
        # Use a lightweight endpoint to validate the key
        models = await asyncio.to_thread(client.models.list)
        # If we can list models, the key is valid
        return True, ""
    except openai.AuthenticationError:
        return False, "Invalid API key. Please check your Inception Labs API key."
    except openai.APIError as e:
        error_msg = str(e)
        if "invalid_api_key" in error_msg.lower() or "401" in error_msg:
            return False, "Invalid API key. Please check your Inception Labs API key."
        return False, f"Inception Labs API error: {error_msg}"
    except Exception as e:
        logger.error(f"Inception key validation error: {e}")
        return False, f"Failed to validate Inception Labs API key: {str(e)}"


async def validate_custom_integration_key(
    api_key: str, 
    base_url: str, 
    api_type: str = "openai"
) -> tuple[bool, str]:
    """
    Validate custom integration API key.
    Returns (is_valid, error_message)
    """
    try:
        if api_type == "openai" or api_type is None:
            client = openai.OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            # Try to list models to validate the key
            models = await asyncio.to_thread(client.models.list)
            return True, ""
        else:
            return False, f"Unsupported API type: {api_type}"
    except openai.AuthenticationError:
        return False, "Invalid API key. Please check your custom integration API key."
    except openai.APIError as e:
        error_msg = str(e)
        if "invalid_api_key" in error_msg.lower() or "401" in error_msg:
            return False, "Invalid API key. Please check your custom integration API key."
        return False, f"Custom integration API error: {error_msg}"
    except Exception as e:
        logger.error(f"Custom integration key validation error: {e}")
        return False, f"Failed to validate custom integration API key: {str(e)}"


async def validate_api_key(
    provider: str,
    api_key: str,
    base_url: Optional[str] = None,
    api_type: Optional[str] = None
) -> tuple[bool, str]:
    """
    Main validation function that routes to the appropriate validator.
    Returns (is_valid, error_message)
    """
    # First, validate key format
    if provider == 'openai':
        if not api_key.startswith('sk-'):
            return False, "Invalid OpenAI API key format (must start with sk-)"
        return await validate_openai_key(api_key)
    elif provider == 'anthropic':
        if not api_key.startswith('sk-ant-'):
            return False, "Invalid Anthropic API key format (must start with sk-ant-)"
        return await validate_anthropic_key(api_key)
    elif provider == 'mistral':
        # Mistral keys don't have a specific prefix, so we'll just validate by API call
        return await validate_mistral_key(api_key)
    elif provider == 'inception':
        # Inception keys don't have a specific prefix
        return await validate_inception_key(api_key)
    elif provider.startswith('custom_'):
        # For custom integrations, base_url is optional
        # If base_url is provided, validate the API key
        # If base_url is not provided, we can't validate but still allow saving the key
        if base_url:
            return await validate_custom_integration_key(api_key, base_url, api_type or "openai")
        else:
            # No base URL provided - skip validation but allow the key
            # This allows users to save API keys without base URL
            return True, ""
    else:
        return False, f"Unknown provider: {provider}"

