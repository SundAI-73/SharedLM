from typing import List


def format_memories(memories: List[str]) -> str:
    """Format memories into a context block"""
    if not memories:
        return ""
    
    formatted_memories = "\n".join(f"- {memory}" for memory in memories)
    return f"""Previous conversation context and relevant information:
{formatted_memories}

Please reference and build upon the above context when responding. If the user is asking about something mentioned in the previous context, acknowledge it and continue the conversation naturally."""


def compose_prompt(memories: List[str], user_message: str) -> str:
    """Compose the final prompt with memories and user message"""
    memory_context = format_memories(memories)
    
    # Enhanced prompt that encourages memory usage
    enhanced_prompt = f"""{memory_context}

Current user message: {user_message}

Instructions: Please respond to the user's message while considering the previous context. If the user is continuing a previous conversation or asking about something mentioned before, acknowledge it and provide a natural continuation."""
    
    return enhanced_prompt