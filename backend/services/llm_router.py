# backend/services/llm_router.py
import logging
import asyncio
import os
from typing import Dict, Any
import openai
from anthropic import Anthropic
from mistralai.client import MistralClient
from mistralai.models import chat_completion
from llama_api_client import LlamaAPIClient
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

config = load_dotenv()

# Initialize clients
openai_client = openai.OpenAI(api_key=os.environ['OPENAI_API_KEY'])
anthropic_client = Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
mistral_client = MistralClient(api_key=os.environ['MISTRAL_API_KEY'])
# llama_client = LlamaAPIClient(api_key=os.environ['LLAMA_API_KEY'])


async def call_openai(prompt: str, model: str = None) -> str:
    """Call OpenAI API"""
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


async def call_mistral(prompt: str, model: str = None) -> str:
    """Call Mistral API"""
    try: 
        response = await asyncio.to_thread(
            mistral_client.chat,
            model=model,
            messages=[chat_completion.ChatMessage(role="user", content=prompt)],
        )

        reply = response.choices[0].message.content
        logger.info(f"Mistral {model} response generated")
        return reply

    except Exception as e:
        logger.error(f"Mistral API error: {e}")
        raise Exception(f"Mistral API error: {str(e)}")


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


async def route_chat(model_provider: str, model_choice: str, prompt: str) -> tuple[str, str]:
    """Route chat to the appropriate model"""
    if model_provider == "openai":
        reply = await call_openai(prompt=prompt, model=model_choice)
        return reply, model_choice
    elif model_provider == "anthropic":
        reply = await call_anthropic(prompt=prompt, model=model_choice)
        return reply, model_choice
    elif model_provider == "mistral":
        reply = await call_mistral(prompt=prompt, model=model_choice)
        return reply, model_choice
    else:
        raise ValueError(f"Unknown model choice: {model_choice}")
