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
from mistralai.models import chat_completion
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
            messages=[chat_completion.ChatMessage(role="user", content=prompt)],
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
    api_type: str = "openai"
) -> str:
    """Call custom integration API (OpenAI-compatible)"""
    try:
        if not api_key:
            raise ValueError("API key is required for custom integration")
        
        if not base_url:
            raise ValueError("Base URL is required for custom integration")
        
        # Use OpenAI client with custom base URL for OpenAI-compatible APIs
        if api_type == "openai" or api_type is None:
            client = openai.OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=model or "default",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.7
            )
            reply = response.choices[0].message.content
            logger.info(f"Custom integration {model} response generated from {base_url}")
            return reply
        else:
            raise ValueError(f"Unsupported API type: {api_type}")
            
    except Exception as e:
        logger.error(f"Custom integration API error: {e}")
        raise Exception(f"Custom integration API error: {str(e)}")


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
        # Handle custom integration
        reply = await call_custom_integration(
            prompt=prompt,
            model=model_choice,
            api_key=api_key,
            base_url=custom_integration.base_url,
            api_type=custom_integration.api_type or "openai"
        )
        # Return the custom integration name as the model identifier
        return reply, custom_integration.name
    else:
        raise ValueError(f"Unknown model provider: {model_provider}")
