/**
 * Local storage utilities for storing chats and memories locally
 * Similar to mem0 format for consistency
 */

const STORAGE_PREFIX = 'sharedlm_local_';
const CHATS_KEY = `${STORAGE_PREFIX}chats`;
const MEMORIES_KEY = `${STORAGE_PREFIX}memories`;
const SYNC_METADATA_KEY = `${STORAGE_PREFIX}sync_metadata`;

/**
 * Get all local chats
 * @returns {Array} Array of chat conversations
 */
export function getLocalChats() {
  try {
    const chats = localStorage.getItem(CHATS_KEY);
    return chats ? JSON.parse(chats) : [];
  } catch (error) {
    console.error('Failed to get local chats:', error);
    return [];
  }
}

/**
 * Save a chat conversation locally
 * @param {Object} chat - Chat conversation object
 */
export function saveLocalChat(chat) {
  try {
    const chats = getLocalChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.push(chat);
    }
    
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    return true;
  } catch (error) {
    console.error('Failed to save local chat:', error);
    return false;
  }
}

/**
 * Get all local memories (mem0 format)
 * @returns {Array} Array of memory objects
 */
export function getLocalMemories() {
  try {
    const memories = localStorage.getItem(MEMORIES_KEY);
    return memories ? JSON.parse(memories) : [];
  } catch (error) {
    console.error('Failed to get local memories:', error);
    return [];
  }
}

/**
 * Add a memory locally (mem0 format)
 * @param {Object} memory - Memory object with user_id, messages, etc.
 */
export function addLocalMemory(memory) {
  try {
    const memories = getLocalMemories();
    const memoryObj = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: memory.user_id,
      messages: memory.messages,
      memory: memory.memory || '', // Extracted memory text
      created_at: new Date().toISOString(),
      project_id: memory.project_id || null
    };
    
    memories.push(memoryObj);
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
    return memoryObj;
  } catch (error) {
    console.error('Failed to add local memory:', error);
    return null;
  }
}

/**
 * Search local memories
 * @param {string} query - Search query
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @returns {Array} Array of matching memories
 */
export function searchLocalMemories(query, userId, limit = 5) {
  try {
    const memories = getLocalMemories();
    const userMemories = memories.filter(m => m.user_id === userId);
    
    // Simple text search (can be enhanced with better search)
    const queryLower = query.toLowerCase();
    const matching = userMemories.filter(m => {
      const memoryText = (m.memory || '').toLowerCase();
      const messageText = JSON.stringify(m.messages || []).toLowerCase();
      return memoryText.includes(queryLower) || messageText.includes(queryLower);
    });
    
    return matching.slice(0, limit).map(m => m.memory || '');
  } catch (error) {
    console.error('Failed to search local memories:', error);
    return [];
  }
}

/**
 * Get sync metadata
 * @returns {Object} Sync metadata with last sync time
 */
export function getSyncMetadata() {
  try {
    const metadata = localStorage.getItem(SYNC_METADATA_KEY);
    return metadata ? JSON.parse(metadata) : {
      last_sync: null,
      next_sync_due: null,
      sync_interval_days: 10
    };
  } catch (error) {
    console.error('Failed to get sync metadata:', error);
    return {
      last_sync: null,
      next_sync_due: null,
      sync_interval_days: 10
    };
  }
}

/**
 * Update sync metadata
 * @param {Object} metadata - Sync metadata
 */
export function updateSyncMetadata(metadata) {
  try {
    const current = getSyncMetadata();
    const updated = {
      ...current,
      ...metadata,
      last_sync: new Date().toISOString(),
      next_sync_due: new Date(Date.now() + (metadata.sync_interval_days || 10) * 24 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to update sync metadata:', error);
    return null;
  }
}

/**
 * Check if sync is due
 * @returns {boolean} True if sync is due
 */
export function isSyncDue() {
  const metadata = getSyncMetadata();
  if (!metadata.next_sync_due) {
    return true; // Never synced
  }
  return new Date() >= new Date(metadata.next_sync_due);
}

/**
 * Clear all local data (after sync)
 */
export function clearLocalData() {
  try {
    localStorage.removeItem(CHATS_KEY);
    localStorage.removeItem(MEMORIES_KEY);
    // Keep sync metadata
    return true;
  } catch (error) {
    console.error('Failed to clear local data:', error);
    return false;
  }
}

/**
 * Export local data for sync
 * @returns {Object} All local data ready for sync
 */
export function exportLocalData() {
  return {
    chats: getLocalChats(),
    memories: getLocalMemories(),
    metadata: getSyncMetadata()
  };
}

/**
 * Get storage size estimate
 * @returns {Object} Storage size information
 */
export function getStorageSize() {
  try {
    const chats = localStorage.getItem(CHATS_KEY) || '';
    const memories = localStorage.getItem(MEMORIES_KEY) || '';
    const metadata = localStorage.getItem(SYNC_METADATA_KEY) || '';
    
    const totalSize = new Blob([chats, memories, metadata]).size;
    
    return {
      chats: new Blob([chats]).size,
      memories: new Blob([memories]).size,
      metadata: new Blob([metadata]).size,
      total: totalSize,
      totalMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  } catch (error) {
    console.error('Failed to get storage size:', error);
    return { chats: 0, memories: 0, metadata: 0, total: 0, totalMB: '0.00' };
  }
}

