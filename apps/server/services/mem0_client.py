import logging
import os
from typing import List, Dict, Any
from mem0 import MemoryClient
from dotenv import load_dotenv

config = load_dotenv()

logger = logging.getLogger(__name__)


class Mem0Client:
    def __init__(self):
        self.client = MemoryClient(
            api_key=os.environ["mem0_api_key"],
            # org_id=settings.mem0_org_id,
            # project_id=settings.mem0_project_id
        )
    
    def search_memories(self, user_id: str, query: str, limit: int = 5) -> List[str]:
        """Search for relevant memories for a user"""
        try:
            results = self.client.search(
                query=query,
                user_id=user_id,
                limit=limit,
                version="v2"
            )
            
            # Fix: Handle both list and dict responses
            if isinstance(results, list):
                # Mem0 returns a list directly
                memories = [result["memory"] for result in results]
            else:
                # Mem0 returns a dict with "results" key
                memories = [result["memory"] for result in results.get("results", [])]
            
            logger.info(f"Retrieved {len(memories)} memories for user {user_id}")
            return memories
            
        except Exception as e:
            logger.error(f"Error searching memories: {e}")
            return []
    
    def add_memory(self, user_id: str, messages: List[Dict[str, str]], project_id: int = None) -> bool:
        """Add new conversation to memory
        
        Args:
            user_id: User ID
            messages: List of message dicts with role and content
            project_id: Optional project ID to store project-specific memory
        """
        try:
            # Store general user memory
            self.client.add(
                messages=messages,
                user_id=user_id,
                version="v2"
            )
            logger.info(f"Added memory for user {user_id}")
            
            # Also store project-specific memory if project_id is provided
            if project_id:
                project_user_id = f"{user_id}_project_{project_id}"
                self.client.add(
                    messages=messages,
                    user_id=project_user_id,
                    version="v2"
                )
                logger.info(f"Added project memory for user {user_id}, project {project_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding memory: {e}")
            return False
    
    def search_project_memories(self, user_id: str, project_id: int, query: str = "", limit: int = 20) -> List[str]:
        """Search for memories specific to a project"""
        try:
            project_user_id = f"{user_id}_project_{project_id}"
            results = self.client.search(
                query=query or "project context and conversations",
                user_id=project_user_id,
                limit=limit,
                version="v2"
            )
            
            # Fix: Handle both list and dict responses
            if isinstance(results, list):
                memories = [result["memory"] for result in results]
            else:
                memories = [result["memory"] for result in results.get("results", [])]
            
            logger.info(f"Retrieved {len(memories)} project memories for user {user_id}, project {project_id}")
            return memories
            
        except Exception as e:
            logger.error(f"Error searching project memories: {e}")
            return []
    
    def search_memories_debug(self, user_id: str, query: str, limit: int = 5) -> Dict[str, Any]:
        """Debug version that returns full results"""
        try:
            results = self.client.search(
                query=query,
                user_id=user_id,
                limit=limit,
                version="v2"
            )
            return results
            
        except Exception as e:
            logger.error(f"Error in debug memory search: {e}")
            return {"results": [], "error": str(e)}


# Global instance
mem0_client = Mem0Client()