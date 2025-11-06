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
    
    def add_memory(self, user_id: str, messages: List[Dict[str, str]]) -> bool:
        """Add new conversation to memory"""
        try:
            self.client.add(
                messages=messages,
                user_id=user_id,
                version="v2"
            )
            logger.info(f"Added memory for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding memory: {e}")
            return False
    
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