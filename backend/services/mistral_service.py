import logging
import asyncio
from typing import Optional
import httpx

logger = logging.getLogger(__name__)


class MistralService:
    def __init__(self):
        # Check if settings exist and have mistral_api_key
        try:
            from backend.config import settings
            self.api_key = getattr(settings, 'mistral_api_key', None)
        except:
            self.api_key = None
            
        self.model = "mistral-tiny"
        self.api_url = "https://api.mistral.ai/v1/chat/completions"
        
    async def chat(self, prompt: str) -> str:
        """Send chat request to Mistral AI"""
        # Always use fallback for now since we don't have a Mistral API key
        return self._generate_fallback_response(prompt)
    
    def _generate_fallback_response(self, prompt: str) -> str:
        """Generate intelligent fallback responses"""
        prompt_lower = prompt.lower()
        
        # Common greetings
        if any(word in prompt_lower for word in ['hello', 'hi', 'hey', 'greetings']):
            return "Hello! I'm SharedLM, your AI assistant. How can I help you today?"
        
        if any(word in prompt_lower for word in ['how are you', "how're you", 'how do you do']):
            return "I'm functioning well and ready to assist you! What would you like to explore today?"
        
        # Help requests
        if 'help' in prompt_lower or 'what can you' in prompt_lower:
            return "I can help you with a variety of tasks including:\n• Answering questions\n• Writing and editing text\n• Explaining concepts\n• Problem-solving\n• Creative brainstorming\n• Code assistance\n\nWhat would you like to work on?"
        
        # Thank you
        if any(word in prompt_lower for word in ['thank', 'thanks', 'appreciate']):
            return "You're welcome! Is there anything else I can help you with?"
        
        # Goodbye
        if any(word in prompt_lower for word in ['bye', 'goodbye', 'see you', 'farewell']):
            return "Goodbye! Feel free to come back anytime you need assistance."
        
        # Questions about AI/SharedLM
        if 'who are you' in prompt_lower or 'what are you' in prompt_lower:
            return "I'm SharedLM, an AI assistant that can work with multiple language models. Currently, I'm running in local mode with basic responses. You can enhance my capabilities by adding API keys for models like OpenAI or Anthropic in the settings."
        
        # Code/programming questions
        if any(word in prompt_lower for word in ['code', 'programming', 'python', 'javascript', 'function', 'variable']):
            return "I can help with coding! While I'm running in basic mode, I can still provide guidance. Could you be more specific about what programming help you need?"
        
        # Math questions
        if any(word in prompt_lower for word in ['calculate', 'math', 'equation', 'solve']):
            return "I can help with mathematical problems! Please provide the specific calculation or problem you'd like me to help with."
        
        # Writing assistance
        if any(word in prompt_lower for word in ['write', 'essay', 'article', 'story', 'document']):
            return "I'd be happy to help with writing! What type of content are you looking to create? Please provide more details about your writing project."
        
        # Learning/explanation requests
        if any(word in prompt_lower for word in ['explain', 'what is', 'how does', 'tell me about', 'teach']):
            topic = prompt_lower.replace('explain', '').replace('what is', '').replace('how does', '').replace('tell me about', '').replace('teach me', '').strip()
            if topic:
                return f"I'd be happy to explain more about {topic}. While running in basic mode, I can provide general guidance. For more detailed explanations, consider adding an API key in settings. What specific aspect would you like to know about?"
            else:
                return "I'd be happy to explain! What topic would you like to learn about?"
        
        # Default response for unmatched queries
        if len(prompt) < 20:
            return "I'm here to help! Could you provide more details about what you're looking for?"
        else:
            # For longer messages, acknowledge and offer to help
            return f"I understand you're asking about: {prompt[:100]}{'...' if len(prompt) > 100 else ''}\n\nI'm currently running in basic mode. While I can provide general assistance, for more sophisticated responses, you can add API keys for models like OpenAI or Anthropic in the settings.\n\nHow can I help you with this topic?"


# Global instance
mistral_service = MistralService()