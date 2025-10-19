# backend/services/llm_router.py
import logging
import asyncio
from typing import Dict, Any
import openai
from anthropic import Anthropic
from config import settings

logger = logging.getLogger(__name__)

# Initialize clients
openai_client = openai.OpenAI(api_key=settings.openai_api_key)
anthropic_client = Anthropic(api_key=settings.anthropic_api_key)


async def call_openai(prompt: str, model: str = None) -> str:
    """Call OpenAI API"""
    if model is None:
        model = settings.default_model_openai
    
    try:
        response = await asyncio.to_thread(
            openai_client.chat.completions.create,
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


async def call_anthropic(prompt: str, model: str = None) -> str:
    """Call Anthropic API"""
    # Use the correct model names for the new Anthropic API
    if model is None:
        model = "claude-3-haiku-20240307"  # Fast and cost-effective
        # Other options:
        # model = "claude-3-sonnet-20240229"  # Balanced
        # model = "claude-3-opus-20240229"  # Most capable
    
    try:
        # New Anthropic API uses messages.create
        response = await asyncio.to_thread(
            anthropic_client.messages.create,
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


async def route_chat(model_choice: str, prompt: str) -> tuple[str, str]:
    """Route chat to the appropriate model"""
    if model_choice == "openai":
        reply = await call_openai(prompt)
        return reply, settings.default_model_openai
    elif model_choice == "anthropic":
        reply = await call_anthropic(prompt)
        return reply, "claude-3-haiku"  # Return simplified name
    else:
        raise ValueError(f"Unknown model choice: {model_choice}")