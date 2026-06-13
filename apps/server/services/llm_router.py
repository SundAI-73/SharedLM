# apps/server/services/llm_router.py
import json
import logging
import asyncio
import os
from typing import Dict, Any, AsyncGenerator, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from database.models import CustomIntegration
import openai
from anthropic import Anthropic, AsyncAnthropic
try:
    # mistralai<2.0 shipped a legacy shim; 2.x removed it entirely
    from mistralai.client import MistralClient
except ImportError:
    MistralClient = None


def _modern_mistral_class():
    """The modern client moved between releases: mistralai.Mistral in 1.x,
    mistralai.client.Mistral in 2.x."""
    try:
        from mistralai import Mistral
        return Mistral
    except ImportError:
        from mistralai.client import Mistral
        return Mistral
from llama_api_client import LlamaAPIClient
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

config = load_dotenv()

DEFAULT_MAX_TOKENS = 4096

# OpenRouter: one OpenAI-compatible endpoint to 400+ models across 60+ providers.
# Model ids are namespaced, e.g. "openai/gpt-4o", "anthropic/claude-sonnet-4".
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

def _openrouter_headers() -> Dict[str, str]:
    """Optional attribution headers OpenRouter uses for app rankings/analytics."""
    return {
        "HTTP-Referer": os.getenv("OPENROUTER_APP_URL", "https://shared-lm.vercel.app"),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", "SharedLM"),
    }


def _build_messages(
    prompt: str,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None
) -> List[Dict[str, str]]:
    """Build an OpenAI-style messages array: system + prior turns + current message"""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    if history:
        messages.extend(
            {"role": m["role"], "content": m["content"]}
            for m in history
            if m.get("content") and m.get("role") in ("user", "assistant")
        )
    messages.append({"role": "user", "content": prompt})
    return messages


def _anthropic_messages(
    prompt: str,
    history: Optional[List[Dict[str, str]]] = None
) -> List[Dict[str, str]]:
    """Anthropic takes system as a separate param, so messages hold only turns"""
    messages = []
    if history:
        messages.extend(
            {"role": m["role"], "content": m["content"]}
            for m in history
            if m.get("content") and m.get("role") in ("user", "assistant")
        )
    messages.append({"role": "user", "content": prompt})
    return messages


def _is_localhost_url(url: Optional[str]) -> bool:
    if not url:
        return False
    return any(host in url.lower() for host in ["localhost", "127.0.0.1", "0.0.0.0"])


def _is_cloud_env() -> bool:
    return bool(os.getenv("RENDER") or os.getenv("DYNO") or os.getenv("VERCEL") or os.getenv("RAILWAY_ENVIRONMENT"))


async def call_openai(
    prompt: str,
    model: str = None,
    api_key: str = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> str:
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
            messages=_build_messages(prompt, history, system),
            max_tokens=max_tokens or DEFAULT_MAX_TOKENS,
            temperature=0.7
        )

        reply = response.choices[0].message.content
        logger.info(f"OpenAI {model} response generated")
        return reply

    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        raise Exception(f"OpenAI API error: {str(e)}")


async def call_anthropic(
    prompt: str,
    model: str = None,
    api_key: str = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> str:
    """Call Anthropic API"""
    try:
        # Require API key - do not fall back to environment variable
        if not api_key:
            raise ValueError("Anthropic API key is required. Please add your API key in Settings.")
        key = api_key

        client = Anthropic(api_key=key)
        kwargs = {
            "model": model,
            "max_tokens": max_tokens or DEFAULT_MAX_TOKENS,
            "messages": _anthropic_messages(prompt, history)
        }
        if system:
            kwargs["system"] = system
        response = await asyncio.to_thread(
            client.messages.create,
            **kwargs
        )

        # Extract text from the response
        reply = response.content[0].text
        logger.info(f"Anthropic {model} response generated")
        return reply

    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        raise Exception(f"Anthropic API error: {str(e)}")


async def call_mistral(
    prompt: str,
    model: str = None,
    api_key: str = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> str:
    """Call Mistral API"""
    try:
        # Require API key - do not fall back to environment variable
        if not api_key:
            raise ValueError("Mistral API key is required. Please add your API key in Settings.")
        key = api_key

        if MistralClient is not None:
            client = MistralClient(api_key=key)
            response = await asyncio.to_thread(
                client.chat,
                model=model,
                messages=_build_messages(prompt, history, system),
            )
        else:
            client = _modern_mistral_class()(api_key=key)
            response = await asyncio.to_thread(
                client.chat.complete,
                model=model,
                messages=_build_messages(prompt, history, system),
            )

        reply = response.choices[0].message.content
        logger.info(f"Mistral {model} response generated")
        return reply

    except Exception as e:
        logger.error(f"Mistral API error: {e}")
        raise Exception(f"Mistral API error: {str(e)}")


async def call_inception(
    prompt: str,
    model: str = None,
    api_key: str = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> str:
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
            messages=_build_messages(prompt, history, system),
            max_tokens=max_tokens or DEFAULT_MAX_TOKENS,
            temperature=0.7
        )

        reply = response.choices[0].message.content
        logger.info(f"Inception {model} response generated")
        return reply

    except Exception as e:
        logger.error(f"Inception API error: {e}")
        raise Exception(f"Inception API error: {str(e)}")


async def call_openrouter(
    prompt: str,
    model: str = None,
    api_key: str = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> str:
    """Call OpenRouter (OpenAI-compatible gateway to 400+ models)"""
    try:
        if not api_key:
            raise ValueError("OpenRouter API key is required. Please add your API key in Settings.")

        client = openai.OpenAI(
            api_key=api_key,
            base_url=OPENROUTER_BASE_URL,
            default_headers=_openrouter_headers()
        )
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=_build_messages(prompt, history, system),
            max_tokens=max_tokens or DEFAULT_MAX_TOKENS,
            temperature=0.7
        )

        reply = response.choices[0].message.content
        logger.info(f"OpenRouter {model} response generated")
        return reply

    except Exception as e:
        logger.error(f"OpenRouter API error: {e}")
        raise Exception(f"OpenRouter API error: {str(e)}")


async def call_custom_integration(
    prompt: str,
    model: str = None,
    api_key: str = None,
    base_url: str = None,
    api_type: str = "openai",
    fallback_urls: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> str:
    """Call custom integration API (OpenAI-compatible) with fallback support

    Handles:
    - Non-localhost custom URLs (user's own server) - allowed through backend
    - Cloud providers - handled elsewhere, but fallback logic applies

    Rejects:
    - Localhost URLs on cloud servers (should be handled client-side in Electron app)
    """
    # If we're on cloud and trying to use localhost URL, reject it
    # Non-localhost custom URLs (user's server) are allowed through backend
    if _is_cloud_env() and _is_localhost_url(base_url):
        raise Exception(
            "Localhost LLM cannot be used on cloud server. "
            "Localhost LLMs must be used with a local backend or client-side. "
            "Please use the desktop application for localhost LLM support."
        )

    urls_to_try = _custom_integration_urls(base_url, api_key, fallback_urls)
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
            if _is_cloud_env() and _is_localhost_url(url):
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
                    messages=_build_messages(prompt, history, system),
                    max_tokens=max_tokens or DEFAULT_MAX_TOKENS,
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


def _custom_integration_urls(
    base_url: Optional[str],
    api_key: Optional[str],
    fallback_urls: Optional[str]
) -> List[Dict[str, str]]:
    """Build the ordered list of {url, api_key} configs to attempt"""
    urls_to_try = []
    if base_url:
        urls_to_try.append({
            "url": base_url,
            "api_key": api_key or "ollama"
        })
    if fallback_urls:
        try:
            fallbacks = json.loads(fallback_urls)
            if isinstance(fallbacks, list):
                urls_to_try.extend(fallbacks)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to parse fallback URLs: {e}")
    return urls_to_try


async def route_chat(
    model_provider: str,
    model_choice: str,
    prompt: str,
    api_key: Optional[str] = None,
    custom_integration: Optional[Any] = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> tuple[str, str]:
    """Route chat to the appropriate model"""
    if model_provider == "openai":
        reply = await call_openai(prompt=prompt, model=model_choice, api_key=api_key,
                                  history=history, system=system, max_tokens=max_tokens)
        return reply, model_choice
    elif model_provider == "anthropic":
        reply = await call_anthropic(prompt=prompt, model=model_choice, api_key=api_key,
                                     history=history, system=system, max_tokens=max_tokens)
        return reply, model_choice
    elif model_provider == "mistral":
        reply = await call_mistral(prompt=prompt, model=model_choice, api_key=api_key,
                                   history=history, system=system, max_tokens=max_tokens)
        return reply, model_choice
    elif model_provider == "inception":
        reply = await call_inception(prompt=prompt, model=model_choice, api_key=api_key,
                                     history=history, system=system, max_tokens=max_tokens)
        return reply, model_choice
    elif model_provider == "openrouter":
        reply = await call_openrouter(prompt=prompt, model=model_choice, api_key=api_key,
                                      history=history, system=system, max_tokens=max_tokens)
        return reply, model_choice
    elif custom_integration and model_provider.startswith("custom_"):
        # Handle custom integration with fallback support
        # For local LLMs, extract model name from provider_id if model_choice is not provided
        actual_model = _resolve_custom_model(model_provider, model_choice)

        reply = await call_custom_integration(
            prompt=prompt,
            model=actual_model or model_choice,
            api_key=api_key,
            base_url=custom_integration.base_url,
            api_type=custom_integration.api_type or "openai",
            fallback_urls=getattr(custom_integration, 'fallback_urls', None),
            history=history,
            system=system,
            max_tokens=max_tokens
        )
        # Return the custom integration name as the model identifier
        return reply, custom_integration.name
    else:
        raise ValueError(f"Unknown model provider: {model_provider}")


def _resolve_custom_model(model_provider: str, model_choice: Optional[str]) -> Optional[str]:
    """For local LLM integrations the model name is encoded in the provider_id
    (e.g. "custom_local_gemma3" -> "gemma3")"""
    if model_provider.startswith("custom_local_") and (not model_choice or model_choice == "default"):
        return model_provider.replace("custom_local_", "").replace("_", ".")
    return model_choice


# ---------------------------------------------------------------------------
# Streaming
#
# route_chat_stream yields dict events:
#   {"type": "delta", "text": str}        - incremental text
#   {"type": "done", "usage": {...}|None} - stream finished
# Errors raise; the caller translates them into SSE error events.
# ---------------------------------------------------------------------------

def _usage_dict(prompt_tokens: Optional[int], completion_tokens: Optional[int]) -> Optional[Dict[str, int]]:
    if prompt_tokens is None and completion_tokens is None:
        return None
    return {
        "prompt_tokens": prompt_tokens or 0,
        "completion_tokens": completion_tokens or 0,
        "total_tokens": (prompt_tokens or 0) + (completion_tokens or 0)
    }


async def _stream_openai_compatible(
    prompt: str,
    model: str,
    api_key: str,
    base_url: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None,
    request_usage: bool = True,
    default_headers: Optional[Dict[str, str]] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    client = openai.AsyncOpenAI(
        api_key=api_key,
        base_url=base_url,
        default_headers=default_headers,
        timeout=60.0
    )
    kwargs = {
        "model": model,
        "messages": _build_messages(prompt, history, system),
        "max_tokens": max_tokens or DEFAULT_MAX_TOKENS,
        "temperature": 0.7,
        "stream": True,
    }
    if request_usage:
        # Not all OpenAI-compatible servers accept stream_options; only real
        # OpenAI/Inception get it, custom servers report usage if they choose to.
        kwargs["stream_options"] = {"include_usage": True}

    usage = None
    try:
        stream = await client.chat.completions.create(**kwargs)
        async for chunk in stream:
            if getattr(chunk, "usage", None):
                usage = _usage_dict(chunk.usage.prompt_tokens, chunk.usage.completion_tokens)
            if chunk.choices:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield {"type": "delta", "text": delta.content}
    finally:
        await client.close()
    yield {"type": "done", "usage": usage}


async def _stream_anthropic(
    prompt: str,
    model: str,
    api_key: str,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    client = AsyncAnthropic(api_key=api_key)
    kwargs = {
        "model": model,
        "max_tokens": max_tokens or DEFAULT_MAX_TOKENS,
        "messages": _anthropic_messages(prompt, history)
    }
    if system:
        kwargs["system"] = system

    usage = None
    try:
        async with client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield {"type": "delta", "text": text}
            final = await stream.get_final_message()
            if final and final.usage:
                usage = _usage_dict(final.usage.input_tokens, final.usage.output_tokens)
    finally:
        await client.close()
    yield {"type": "done", "usage": usage}


async def _stream_mistral(
    prompt: str,
    model: str,
    api_key: str,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    # Streaming uses the modern mistralai>=1.0 client; the legacy MistralClient
    # shim above is kept only for the non-streaming path.
    client = _modern_mistral_class()(api_key=api_key)
    usage = None
    stream = await client.chat.stream_async(
        model=model,
        messages=_build_messages(prompt, history, system),
        max_tokens=max_tokens or DEFAULT_MAX_TOKENS
    )
    async for event in stream:
        data = getattr(event, "data", None)
        if data is None:
            continue
        event_usage = getattr(data, "usage", None)
        if event_usage:
            usage = _usage_dict(
                getattr(event_usage, "prompt_tokens", None),
                getattr(event_usage, "completion_tokens", None)
            )
        choices = getattr(data, "choices", None)
        if choices:
            delta = getattr(choices[0], "delta", None)
            content = getattr(delta, "content", None) if delta else None
            if content:
                yield {"type": "delta", "text": content}
    yield {"type": "done", "usage": usage}


async def _stream_custom_integration(
    prompt: str,
    model: str,
    api_key: Optional[str],
    custom_integration: Any,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    base_url = custom_integration.base_url
    if _is_cloud_env() and _is_localhost_url(base_url):
        raise Exception(
            "Localhost LLM cannot be used on cloud server. "
            "Please use the desktop application for localhost LLM support."
        )

    urls_to_try = _custom_integration_urls(
        base_url, api_key, getattr(custom_integration, 'fallback_urls', None)
    )
    if not urls_to_try:
        raise ValueError("Base URL is required for custom integration")

    last_error = None
    for url_config in urls_to_try:
        url = url_config.get("url")
        key = url_config.get("api_key", api_key or "ollama")
        if not url or (_is_cloud_env() and _is_localhost_url(url)):
            continue
        started = False
        try:
            async for event in _stream_openai_compatible(
                prompt, model, key, base_url=url, history=history,
                system=system, max_tokens=max_tokens, request_usage=False
            ):
                started = True
                yield event
            return
        except Exception as e:
            if started:
                # Tokens already reached the client; a silent retry would
                # duplicate output, so surface the failure instead.
                raise
            last_error = e
            logger.warning(f"Streaming failed for {url}: {e}")
            continue

    raise Exception(
        f"Custom integration API error: All {len(urls_to_try)} URL(s) failed"
        + (f". Last error: {str(last_error)}" if last_error else "")
    )


async def route_chat_stream(
    model_provider: str,
    model_choice: str,
    prompt: str,
    api_key: Optional[str] = None,
    custom_integration: Optional[Any] = None,
    history: Optional[List[Dict[str, str]]] = None,
    system: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """Stream a chat completion from the appropriate provider.

    Yields {"type": "delta", "text": ...} events followed by a final
    {"type": "done", "usage": ...} event.
    """
    if not api_key and not (custom_integration and custom_integration.base_url):
        raise ValueError(f"{model_provider} API key is required. Please add your API key in Settings.")

    if model_provider == "openai":
        gen = _stream_openai_compatible(prompt, model_choice, api_key,
                                        history=history, system=system, max_tokens=max_tokens)
    elif model_provider == "anthropic":
        gen = _stream_anthropic(prompt, model_choice, api_key,
                                history=history, system=system, max_tokens=max_tokens)
    elif model_provider == "mistral":
        gen = _stream_mistral(prompt, model_choice, api_key,
                              history=history, system=system, max_tokens=max_tokens)
    elif model_provider == "inception":
        gen = _stream_openai_compatible(prompt, model_choice, api_key,
                                        base_url="https://api.inceptionlabs.ai/v1",
                                        history=history, system=system, max_tokens=max_tokens,
                                        request_usage=False)
    elif model_provider == "openrouter":
        gen = _stream_openai_compatible(prompt, model_choice, api_key,
                                        base_url=OPENROUTER_BASE_URL,
                                        history=history, system=system, max_tokens=max_tokens,
                                        default_headers=_openrouter_headers())
    elif custom_integration and model_provider.startswith("custom_"):
        actual_model = _resolve_custom_model(model_provider, model_choice)
        gen = _stream_custom_integration(prompt, actual_model or model_choice, api_key,
                                         custom_integration, history=history,
                                         system=system, max_tokens=max_tokens)
    else:
        raise ValueError(f"Unknown model provider: {model_provider}")

    async for event in gen:
        yield event
