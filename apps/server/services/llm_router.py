# apps/server/services/llm_router.py
import logging
import asyncio
import os
from typing import Dict, Any, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from database.models import CustomIntegration
import openai
from anthropic import Anthropic
from mistralai.client import MistralClient
from llama_api_client import LlamaAPIClient
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

config = load_dotenv()


async def call_openai(prompt: str, model: str = None, api_key: str = None) -> str:
    """Call OpenAI API"""
    try:
        # Require API key - do not fall back to environment variable
        if not api_key:
            raise ValueError("OpenAI API key is required. Please add your API key in Settings.")
        key = api_key
        
        client = openai.OpenAI(api_key=key)
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        reply = response.choices[0].message.content
        logger.info(f"OpenAI {model} response generated")
        return reply
        
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        raise Exception(f"OpenAI API error: {str(e)}")


async def call_anthropic(prompt: str, model: str = None, api_key: str = None) -> str:
    """Call Anthropic API"""    
    try:
        # Require API key - do not fall back to environment variable
        if not api_key:
            raise ValueError("Anthropic API key is required. Please add your API key in Settings.")
        key = api_key
        
        client = Anthropic(api_key=key)
        # New Anthropic API uses messages.create
        response = await asyncio.to_thread(
            client.messages.create,
            model=model,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Extract text from the response
        reply = response.content[0].text
        logger.info(f"Anthropic {model} response generated")
        return reply
        
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        raise Exception(f"Anthropic API error: {str(e)}")


async def call_mistral(prompt: str, model: str = None, api_key: str = None) -> str:
    """Call Mistral API"""
    try:
        # Require API key - do not fall back to environment variable
        if not api_key:
            raise ValueError("Mistral API key is required. Please add your API key in Settings.")
        key = api_key
        
        client = MistralClient(api_key=key)
        response = await asyncio.to_thread(
            client.chat,
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )

        reply = response.choices[0].message.content
        logger.info(f"Mistral {model} response generated")
        return reply

    except Exception as e:
        logger.error(f"Mistral API error: {e}")
        raise Exception(f"Mistral API error: {str(e)}")


async def call_inception(prompt: str, model: str = None, api_key: str = None) -> str:
    """Call Inception Labs API (OpenAI-compatible)"""
    try:
        # Require API key - do not fall back to environment variable
        if not api_key:
            raise ValueError("Inception API key is required. Please add your API key in Settings.")
        key = api_key
        
        # Inception Labs uses OpenAI-compatible API
        client = openai.OpenAI(
            api_key=key,
            base_url="https://api.inceptionlabs.ai/v1"
        )
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        reply = response.choices[0].message.content
        logger.info(f"Inception {model} response generated")
        return reply
        
    except Exception as e:
        logger.error(f"Inception API error: {e}")
        raise Exception(f"Inception API error: {str(e)}")


# async def call_llama(prompt: str, model: str = None) -> str:
#     """Call LLama API"""
#     try:
#         response = await asyncio.to_thread(
#             await llama_client.chat.completions.create(
#                 messages=[
#                     {
#                         "content": "string",
#                         "role": "user",
#                     }
#                 ],
#                 model="model",
#         )
#         )        
#         reply = response.completion_message
#         logger.info(f"LLAMA {model} response generated")
#         return reply

#     except Exception as e:
#         logger.error(f"LLAMA API error: {e}")
#         raise Exception(f"LLAMA API error: {str(e)}")


async def call_custom_integration(
    prompt: str, 
    model: str = None, 
    api_key: str = None, 
    base_url: str = None,
    api_type: str = "openai",
    fallback_urls: Optional[str] = None
) -> str:
    """Call custom integration API (OpenAI-compatible) with fallback support
    
    Handles:
    - Non-localhost custom URLs (user's own server) - allowed through backend
    - Cloud providers - handled elsewhere, but fallback logic applies
    
    Rejects:
    - Localhost URLs on cloud servers (should be handled client-side in Electron app)
    """
    import json
    import os
    
    # Check if we're on cloud (Render, Vercel, etc.)
    is_cloud = os.getenv("RENDER") or os.getenv("DYNO") or os.getenv("VERCEL") or os.getenv("RAILWAY_ENVIRONMENT")
    
    # Check if this is a localhost URL
    is_localhost = False
    if base_url:
        is_localhost = any(
            localhost in base_url.lower() 
            for localhost in ["localhost", "127.0.0.1", "0.0.0.0"]
        )
    
    # If we're on cloud and trying to use localhost URL, reject it
    # Non-localhost custom URLs (user's server) are allowed through backend
    if is_cloud and is_localhost:
        raise Exception(
            "Localhost LLM cannot be used on cloud server. "
            "Localhost LLMs must be used with a local backend or client-side. "
            "Please use the desktop application for localhost LLM support."
        )
    
    # Build list of URLs to try (primary + fallbacks)
    urls_to_try = []
    
    # Add primary URL first
    if base_url:
        urls_to_try.append({
            "url": base_url,
            "api_key": api_key or "ollama"
        })
    
    # Parse and add fallback URLs
    if fallback_urls:
        try:
            fallbacks = json.loads(fallback_urls)
            if isinstance(fallbacks, list):
                urls_to_try.extend(fallbacks)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to parse fallback URLs: {e}")
    
    if not urls_to_try:
        raise ValueError("Base URL is required for custom integration")
    
    # Try each URL in order until one succeeds
    last_error = None
    for idx, url_config in enumerate(urls_to_try):
        try:
            url = url_config.get("url")
            key = url_config.get("api_key", api_key or "ollama")
            
            if not url:
                continue
            
            # Skip localhost URLs if we're on cloud (should have been rejected earlier, but double-check)
            if is_cloud and any(localhost in url.lower() for localhost in ["localhost", "127.0.0.1", "0.0.0.0"]):
                logger.warning(f"Skipping localhost URL on cloud: {url}")
                continue
            
            logger.info(f"Trying custom integration URL {idx + 1}/{len(urls_to_try)}: {url}")
            
            # Use OpenAI client with custom base URL for OpenAI-compatible APIs
            if api_type == "openai" or api_type is None:
                client = openai.OpenAI(
                    api_key=key,
                    base_url=url,
                    timeout=30.0  # 30 second timeout per attempt
                )
                response = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=model or "default",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1000,
                    temperature=0.7
                )
                reply = response.choices[0].message.content
                logger.info(f"Custom integration {model} response generated from {url}")
                return reply
            else:
                raise ValueError(f"Unsupported API type: {api_type}")
                
        except Exception as e:
            last_error = e
            logger.warning(f"Failed to connect to {url_config.get('url', 'unknown')}: {str(e)}")
            # Continue to next fallback
            continue
    
    # All URLs failed
    error_msg = f"Custom integration API error: All {len(urls_to_try)} URL(s) failed"
    if last_error:
        error_msg += f". Last error: {str(last_error)}"
    logger.error(error_msg)
    raise Exception(error_msg)


async def route_chat(
    model_provider: str, 
    model_choice: str, 
    prompt: str, 
    api_key: Optional[str] = None,
    custom_integration: Optional[Any] = None
) -> tuple[str, str]:
    """Route chat to the appropriate model"""
    if model_provider == "openai":
        reply = await call_openai(prompt=prompt, model=model_choice, api_key=api_key)
        return reply, model_choice
    elif model_provider == "anthropic":
        reply = await call_anthropic(prompt=prompt, model=model_choice, api_key=api_key)
        return reply, model_choice
    elif model_provider == "mistral":
        reply = await call_mistral(prompt=prompt, model=model_choice, api_key=api_key)
        return reply, model_choice
    elif model_provider == "inception":
        reply = await call_inception(prompt=prompt, model=model_choice, api_key=api_key)
        return reply, model_choice
    elif custom_integration and model_provider.startswith("custom_"):
        # Handle custom integration with fallback support
        # For local LLMs, extract model name from provider_id if model_choice is not provided
        actual_model = model_choice
        if model_provider.startswith("custom_local_") and (not model_choice or model_choice == "default"):
            # Extract model name from provider_id (e.g., "custom_local_gemma3" -> "gemma3")
            actual_model = model_provider.replace("custom_local_", "").replace("_", ".")
        
        reply = await call_custom_integration(
            prompt=prompt,
            model=actual_model or model_choice,
            api_key=api_key,
            base_url=custom_integration.base_url,
            api_type=custom_integration.api_type or "openai",
            fallback_urls=getattr(custom_integration, 'fallback_urls', None)
        )
        # Return the custom integration name as the model identifier
        return reply, custom_integration.name
    else:
        raise ValueError(f"Unknown model provider: {model_provider}")
