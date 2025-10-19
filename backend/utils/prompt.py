from typing import List


def format_memories(memories: List[str]) -> str:
    """Format memories into a context block"""
    if not memories:
        return ""
    
    formatted_memories = "\n".join(f"- {memory}" for memory in memories)
    return f"Previous relevant context:\n{formatted_memories}\n\n"


def compose_prompt(memories: List[str], user_message: str) -> str:
    """Compose the final prompt with memories and user message"""
    memory_context = format_memories(memories)
    return f"{memory_context}{user_message}"