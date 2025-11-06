const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIService {
  // ============================================
  // AUTHENTICATION
  // ============================================
  
  async signup(email, password, displayName) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Signup failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // ============================================
  // HEALTH & MODELS
  // ============================================
  
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) throw new Error('Backend not available');
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: error.message };
    }
  }

  async getModels() {
    try {
      const response = await fetch(`${API_BASE_URL}/models`);
      if (!response.ok) throw new Error('Failed to fetch models');
      return await response.json();
    } catch (error) {
      console.error('Get models failed:', error);
      return null;
    }
  }

  // ============================================
  // CHAT
  // ============================================
  
  async sendMessage(userId, message, modelChoice, sessionId = null, projectId = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: message,
          model_provider: modelChoice === 'openai' ? 'openai' : 
                          modelChoice === 'anthropic' ? 'anthropic' : 'mistral',
          model_choice: modelChoice === 'openai' ? 'gpt-4o-mini' :
                        modelChoice === 'anthropic' ? 'claude-3-haiku-20240307' : 
                        'mistral-small-latest',
          session_id: sessionId,
          project_id: projectId
        })
      });

      if (!response.ok) throw new Error('Failed to send message');
      return await response.json();
    } catch (error) {
      console.error('Send message failed:', error);
      throw error;
    }
  }

  // ============================================
  // FILE UPLOAD
  // ============================================
  
  async uploadFile(file, userId, conversationId = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (userId) formData.append('user_id', userId);
      if (conversationId) formData.append('conversation_id', conversationId);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload file');
      return await response.json();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  async uploadProjectFile(file, projectId, userId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);
      formData.append('user_id', userId);

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload file');
      return await response.json();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  // ============================================
  // PROJECTS
  // ============================================
  
  async getProjects(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return await response.json();
    } catch (error) {
      console.error('Get projects failed:', error);
      return [];
    }
  }

  async createProject(userId, name, type = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name,
          type: type 
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create project' }));
        throw new Error(error.detail || 'Failed to create project');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create project failed:', error);
      throw error;
    }
  }

  async updateProject(projectId, updates) {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update project');
      return await response.json();
    } catch (error) {
      console.error('Update project failed:', error);
      throw error;
    }
  }

  async deleteProject(projectId) {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete project');
      return await response.json();
    } catch (error) {
      console.error('Delete project failed:', error);
      throw error;
    }
  }

  async getProjectFiles(projectId) {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`);
      if (!response.ok) throw new Error('Failed to fetch project files');
      return await response.json();
    } catch (error) {
      console.error('Get project files failed:', error);
      return [];
    }
  }

  async deleteProjectFile(fileId) {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete file');
      return await response.json();
    } catch (error) {
      console.error('Delete file failed:', error);
      throw error;
    }
  }

  // ============================================
  // CONVERSATIONS
  // ============================================
  
  async getConversations(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return await response.json();
    } catch (error) {
      console.error('Get conversations failed:', error);
      return [];
    }
  }

  async createConversation(userId, title = null, modelUsed = null, projectId = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: title,
          model_used: modelUsed,
          project_id: projectId
        })
      });

      if (!response.ok) throw new Error('Failed to create conversation');
      return await response.json();
    } catch (error) {
      console.error('Create conversation failed:', error);
      throw error;
    }
  }

  async getMessages(conversationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return await response.json();
    } catch (error) {
      console.error('Get messages failed:', error);
      return [];
    }
  }

  async updateConversationTitle(conversationId, title) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title })
      });

      if (!response.ok) throw new Error('Failed to update conversation title');
      return await response.json();
    } catch (error) {
      console.error('Update conversation title failed:', error);
      throw error;
    }
  }

  async toggleStarConversation(conversationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/star`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to toggle star');
      return await response.json();
    } catch (error) {
      console.error('Toggle star failed:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete conversation');
      return await response.json();
    } catch (error) {
      console.error('Delete conversation failed:', error);
      throw error;
    }
  }

  // ============================================
  // MEMORY (Mem0)
  // ============================================
  
  async searchMemories(userId, query, limit = 5) {
    try {
      const response = await fetch(`${API_BASE_URL}/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          query: query,
          limit: limit
        })
      });

      if (!response.ok) throw new Error('Memory search failed');
      return await response.json();
    } catch (error) {
      console.error('Search memories failed:', error);
      return { memories: [], count: 0 };
    }
  }

  async debugMemories(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/memory/debug/${userId}`);
      if (!response.ok) throw new Error('Debug failed');
      return await response.json();
    } catch (error) {
      console.error('Debug memories failed:', error);
      return null;
    }
  }
}

console.log('API Base URL:', API_BASE_URL);

export default new APIService();