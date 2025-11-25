from typing import List, Optional


def format_memories(memories: List[str]) -> str:
    """Format memories into a context block"""
    if not memories:
        return ""
    
    formatted_memories = "\n".join(f"- {memory}" for memory in memories)
    return f"""Previous conversation context and relevant information:
{formatted_memories}

Please reference and build upon the above context when responding. If the user is asking about something mentioned in the previous context, acknowledge it and continue the conversation naturally."""


def format_file_content(files_content: List[dict], file_type: str = "attached") -> str:
    """Format file contents into a context block
    
    Args:
        files_content: List of dicts with 'filename' and 'content' keys
        file_type: Type of files - 'project', 'chat', or 'attached' (default)
    """
    if not files_content:
        return ""
    
    file_sections = []
    for file_info in files_content:
        filename = file_info.get('filename', 'Unknown')
        content = file_info.get('content', '')
        if content:
            file_sections.append(f"--- Content from file: {filename} ---\n{content}\n--- End of {filename} ---")
    
    if not file_sections:
        return ""
    
    if file_type == "project":
        return f"""Project files content:
{chr(10).join(file_sections)}

Please use the information from the project files to answer the user's question. Reference specific details from the project files when relevant."""
    elif file_type == "chat":
        return f"""Chat attached files content:
{chr(10).join(file_sections)}

Please use the information from the attached chat files to answer the user's question. Reference specific details from these files when relevant."""
    else:
        return f"""Attached files content:
{chr(10).join(file_sections)}

Please use the information from the attached files to answer the user's question. Reference specific details from the files when relevant."""


def compose_prompt(
    memories: List[str], 
    user_message: str, 
    project_files_content: Optional[List[dict]] = None,
    chat_files_content: Optional[List[dict]] = None
) -> str:
    """Compose the final prompt with memories, project files, chat files, and user message
    
    Args:
        memories: List of memory strings from previous conversations
        user_message: The current user message
        project_files_content: List of dicts with project file content (filename, content)
        chat_files_content: List of dicts with chat file content (filename, content)
    """
    memory_context = format_memories(memories)
    project_files_context = format_file_content(project_files_content or [], "project")
    chat_files_context = format_file_content(chat_files_content or [], "chat")
    
    # Build the prompt with all context sources
    context_parts = []
    if memory_context:
        context_parts.append(memory_context)
    if project_files_context:
        context_parts.append(project_files_context)
    if chat_files_context:
        context_parts.append(chat_files_context)
    
    context_section = "\n\n".join(context_parts) if context_parts else ""
    
    # Enhanced prompt that encourages using all available context
    if context_section:
        enhanced_prompt = f"""{context_section}

Current user message: {user_message}

Instructions: Please respond to the user's message while considering all available context:
- Previous conversation memories and context
- Project files (if this chat is part of a project)
- Chat attached files (if any files were attached to this conversation)

Use information from any of these sources to provide a comprehensive and accurate response. If the user is asking about something mentioned in the context or files, acknowledge it and provide a natural continuation."""
    else:
        enhanced_prompt = f"""Current user message: {user_message}

Instructions: Please respond to the user's message."""
    
    return enhanced_prompt