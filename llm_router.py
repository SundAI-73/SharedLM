# backend/services/llm_router.py
import logging
import asyncio
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Conditional imports with proper error handling
openai_client = None
anthropic_client = None

try:
    import openai
    from backend.config import settings
    if settings.openai_api_key:
        openai_client = openai.OpenAI(api_key=settings.openai_api_key)
        logger.info("OpenAI client initialized")
except (ImportError, AttributeError) as e:
    logger.warning(f"OpenAI not available: {e}")

try:
    from anthropic import Anthropic
    from backend.config import settings
    if settings.anthropic_api_key:
        anthropic_client = Anthropic(api_key=settings.anthropic_api_key)
        logger.info("Anthropic client initialized")
except (ImportError, AttributeError) as e:
    logger.warning(f"Anthropic not available: {e}")

# Import Mistral service
try:
    from backend.services.mistral_service import mistral_service
    logger.info("Mistral service initialized")
except ImportError as e:
    logger.error(f"Failed to import Mistral service: {e}")
    mistral_service = None

# Import settings
from backend.config import settings


async def call_openai(prompt: str, model: str = None) -> str:
    """Call OpenAI API"""
    if not openai_client:
        logger.warning("OpenAI client not initialized")
        # Fallback to Mistral
        if mistral_service:
            return await mistral_service.chat(prompt)
        return "OpenAI is not configured. Please add your API key or use Mistral AI."
    
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
        # Fallback to Mistral on error
        if mistral_service:
            logger.info("Falling back to Mistral due to OpenAI error")
            return await mistral_service.chat(prompt)
        raise Exception(f"OpenAI API error: {str(e)}")


async def call_anthropic(prompt: str, model: str = None) -> str:
    """Call Anthropic API"""
    if not anthropic_client:
        logger.warning("Anthropic client not initialized")
        # Fallback to Mistral
        if mistral_service:
            return await mistral_service.chat(prompt)
        return "Anthropic is not configured. Please add your API key or use Mistral AI."
    
    if model is None:
        model = "claude-3-haiku-20240307"
    
    try:
        response = await asyncio.to_thread(
            anthropic_client.messages.create,
            model=model,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        reply = response.content[0].text
        logger.info(f"Anthropic {model} response generated")
        return reply
        
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        # Fallback to Mistral on error
        if mistral_service:
            logger.info("Falling back to Mistral due to Anthropic error")
            return await mistral_service.chat(prompt)
        raise Exception(f"Anthropic API error: {str(e)}")


async def call_mistral(prompt: str) -> str:
    """Call Mistral API or use fallback"""
    if not mistral_service:
        # If mistral service isn't available, return a basic response
        logger.error("Mistral service not available")
        return "I'm currently having technical difficulties. Please try again later."
    
    try:
        reply = await mistral_service.chat(prompt)
        logger.info("Mistral response generated")
        return reply
    except Exception as e:
        logger.error(f"Mistral error: {e}")
        # Return the fallback response from the service
        return mistral_service._generate_fallback_response(prompt)


async def route_chat(model_choice: str, prompt: str) -> Tuple[str, str]:
    """
    Route chat to the appropriate model with fallback to Mistral
    Returns: (response_text, model_used)
    """
    
    logger.info(f"Routing chat to model: {model_choice}")
    
    # Default to Mistral for any unrecognized model or explicit mistral choice
    if model_choice in ["mistral", "default", None, ""]:
        try:
            reply = await call_mistral(prompt)
            return reply, "mistral"
        except Exception as e:
            logger.error(f"Error calling Mistral: {e}")
            return "I'm having technical difficulties. Please try again.", "error"
    
    elif model_choice == "openai":
        try:
            if openai_client:
                reply = await call_openai(prompt)
                return reply, "gpt-4"
            else:
                # Fallback to Mistral if OpenAI not configured
                logger.info("OpenAI not configured, using Mistral as fallback")
                reply = await call_mistral(prompt)
                return reply, "mistral (fallback)"
        except Exception as e:
            logger.error(f"Error with OpenAI, falling back to Mistral: {e}")
            try:
                reply = await call_mistral(prompt)
                return reply, "mistral (fallback)"
            except:
                return "Service temporarily unavailable. Please try again.", "error"
    
    elif model_choice == "anthropic":
        try:
            if anthropic_client:
                reply = await call_anthropic(prompt)
                return reply, "claude"
            else:
                # Fallback to Mistral if Anthropic not configured
                logger.info("Anthropic not configured, using Mistral as fallback")
                reply = await call_mistral(prompt)
                return reply, "mistral (fallback)"
        except Exception as e:
            logger.error(f"Error with Anthropic, falling back to Mistral: {e}")
            try:
                reply = await call_mistral(prompt)
                return reply, "mistral (fallback)"
            except:
                return "Service temporarily unavailable. Please try again.", "error"
    
    else:
        # Unknown model choice - default to Mistral
        logger.warning(f"Unknown model choice: {model_choice}, defaulting to Mistral")
        try:
            reply = await call_mistral(prompt)
            return reply, "mistral"
        except Exception as e:
            logger.error(f"Error with fallback to Mistral: {e}")
            return "Service temporarily unavailable. Please try again.", "error"


# Helper function to check which models are available
def get_available_models() -> list:
    """Return list of currently available models"""
    models = ["mistral"]  # Mistral is always available (with fallback)
    
    if openai_client:
        models.append("openai")
    
    if anthropic_client:
        models.append("anthropic")
    
    return models


# Helper function to get model status
def get_model_status() -> dict:
    """Return status of each model"""
    return {
        "mistral": "active" if mistral_service else "unavailable",
        "openai": "active" if openai_client else "not_configured",
        "anthropic": "active" if anthropic_client else "not_configured"
    }