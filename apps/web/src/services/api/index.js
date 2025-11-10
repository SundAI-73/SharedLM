import { getAuthHeaders, getUserId } from '../../utils/auth';
import { extendSession, checkSession } from '../../utils/sessionManager';
import rateLimiter from '../../utils/rateLimiter';
import { logEvent, EventType, LogLevel } from '../../utils/auditLogger';

// Enforce HTTPS in production
const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  // In production, ensure HTTPS
  if (process.env.NODE_ENV === 'production' && envUrl.startsWith('http://')) {
    console.warn('⚠️ API URL is using HTTP in production. Consider using HTTPS.');
  }
  
  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000;

class APIService {
  
  /**
   * Get endpoint from full URL for rate limiting
   * @param {string} url - Full URL
   * @returns {string} - Endpoint path
   */
  getEndpoint(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      // If URL parsing fails, try to extract path from API_BASE_URL
      return url.replace(API_BASE_URL, '');
    }
  }

  /**
   * Make authenticated API request with rate limiting and session management
   * @param {string} url - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async makeRequest(url, options = {}) {
    // Check session validity (don't redirect, just check)
    // Health check and auth endpoints don't require authentication
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/health');
    if (!isAuthEndpoint && !checkSession(false)) {
      logEvent(EventType.UNAUTHORIZED_ACCESS, LogLevel.SECURITY, 'Attempted API request with invalid session', { url });
      throw new Error('Session expired. Please log in again.');
    }

    // Rate limiting check
    const endpoint = this.getEndpoint(url);
    const rateLimit = rateLimiter.checkLimit(endpoint);
    
    if (!rateLimit.allowed) {
      logEvent(
        EventType.RATE_LIMIT_EXCEEDED,
        LogLevel.WARNING,
        `Rate limit exceeded for endpoint: ${endpoint}`,
        { endpoint, limit: rateLimit.limit, resetAt: new Date(rateLimit.resetAt).toISOString() }
      );
      
      const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Please try again in ${resetIn} seconds.`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      // Get auth headers
      const authHeaders = getAuthHeaders();
      
      // Merge headers
      const headers = {
        ...authHeaders,
        ...options.headers
      };

      // Remove Content-Type for FormData
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Extend session on successful authenticated request
      // Don't extend for health checks or auth endpoints
      if (response.ok && endpoint !== '/health' && !isAuthEndpoint) {
        extendSession();
      }

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        logEvent(
          EventType.UNAUTHORIZED_ACCESS,
          LogLevel.SECURITY,
          'Received 401 Unauthorized response',
          { url, endpoint }
        );
        
        const { clearAuth } = await import('../../utils/auth');
        clearAuth();
        window.location.href = '/login?expired=true';
        throw new Error('Authentication required');
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        logEvent(EventType.ERROR, LogLevel.ERROR, 'Request timeout', { url, endpoint });
        throw new Error('Request timeout. Please try again.');
      }
      throw error;
    }
  }
  
  async signup(email, password, displayName) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      // Signup doesn't require authentication, so bypass session check
      // But still apply rate limiting
      const endpoint = '/auth/signup';
      const rateLimit = rateLimiter.checkLimit(endpoint);
      
      if (!rateLimit.allowed) {
        clearTimeout(timeoutId);
        const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        throw new Error(`Rate limit exceeded. Please try again in ${resetIn} seconds.`);
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Signup failed' }));
        throw new Error(error.detail || 'Signup failed');
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('Signup failed:', error);
      }
      throw error;
    }
  }

  async login(email, password) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      // Login doesn't require authentication, so bypass session check
      // But still apply rate limiting
      const endpoint = '/auth/login';
      const rateLimit = rateLimiter.checkLimit(endpoint);
      
      if (!rateLimit.allowed) {
        clearTimeout(timeoutId);
        const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        throw new Error(`Rate limit exceeded. Please try again in ${resetIn} seconds.`);
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(error.detail || 'Login failed');
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('Login failed:', error);
      }
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to change password' }));
        throw new Error(error.detail || 'Failed to change password');
      }

      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Change password failed:', error);
      }
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });
      if (!response.ok) throw new Error('Backend not available');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Health check failed:', error);
      }
      return { status: 'error', message: error.message };
    }
  }

  async getModels() {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/models`);
      if (!response.ok) throw new Error('Failed to fetch models');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Get models failed:', error);
      }
      return null;
    }
  }

  async sendMessage(userId, message, modelChoice, sessionId = null, projectId = null, specificModel = null) {
    try {
      // Check if it's a standard provider or custom integration
      // Custom integrations have provider_id like "custom_inception_labs" or start with "custom_"
      let modelProvider;
      if (modelChoice === 'openai') {
        modelProvider = 'openai';
      } else if (modelChoice === 'anthropic') {
        modelProvider = 'anthropic';
      } else if (modelChoice === 'mistral') {
        modelProvider = 'mistral';
      } else if (modelChoice && modelChoice.startsWith('custom_')) {
        // It's a custom integration - pass the provider_id directly
        modelProvider = modelChoice;
      } else {
        // Default to mistral for unknown providers
        modelProvider = 'mistral';
      }

      // For custom integrations, if no specific model is provided, use 'default' or the model choice itself
      // For standard providers, use defaults
      let modelToUse;
      if (modelChoice && modelChoice.startsWith('custom_')) {
        // Custom integration - use specificModel if provided, otherwise use a default model name
        modelToUse = specificModel || 'default';
      } else {
        // Standard providers
        modelToUse = specificModel || (
          modelChoice === 'openai' ? 'gpt-4o-mini' :
          modelChoice === 'anthropic' ? 'claude-3-haiku-20240307' : 
          'mistral-small-latest'
        );
      }

      const response = await this.makeRequest(`${API_BASE_URL}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          message: message,
          model_provider: modelProvider,
          model_choice: modelToUse,
          session_id: sessionId ? String(sessionId) : null, // Convert to string as backend expects Optional[str]
          project_id: projectId
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to send message' }));
        throw new Error(error.detail || 'Failed to send message');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Send message failed:', error);
      }
      throw error;
    }
  }

  async uploadFile(file, userId, conversationId = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (userId) formData.append('user_id', userId);
      if (conversationId) formData.append('conversation_id', conversationId);

      const response = await this.makeRequest(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to upload file' }));
        throw new Error(error.detail || 'Failed to upload file');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Upload failed:', error);
      }
      throw error;
    }
  }

  async uploadProjectFile(file, projectId, userId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);
      formData.append('user_id', userId);

      const response = await this.makeRequest(`${API_BASE_URL}/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to upload file' }));
        throw new Error(error.detail || 'Failed to upload file');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Upload failed:', error);
      }
      throw error;
    }
  }

  async getProjects(userId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/projects/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Get projects failed:', error);
      }
      return [];
    }
  }

  async createProject(userId, name, type = null) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/projects/${userId}`, {
        method: 'POST',
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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Create project failed:', error);
      }
      throw error;
    }
  }

  async updateProject(projectId, updates) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to update project' }));
        throw new Error(error.detail || 'Failed to update project');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Update project failed:', error);
      }
      throw error;
    }
  }

  async deleteProject(projectId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete project' }));
        throw new Error(error.detail || 'Failed to delete project');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Delete project failed:', error);
      }
      throw error;
    }
  }

  async getProjectFiles(projectId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/projects/${projectId}/files`);
      if (!response.ok) throw new Error('Failed to fetch project files');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Get project files failed:', error);
      }
      return [];
    }
  }

  async deleteProjectFile(fileId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/projects/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete file' }));
        throw new Error(error.detail || 'Failed to delete file');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Delete file failed:', error);
      }
      throw error;
    }
  }

  async getConversations(userId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/conversations/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Get conversations failed:', error);
      }
      return [];
    }
  }

  async createConversation(userId, title = null, modelUsed = null, projectId = null) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/conversations/create`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          title: title,
          model_used: modelUsed,
          project_id: projectId
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create conversation' }));
        throw new Error(error.detail || 'Failed to create conversation');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Create conversation failed:', error);
      }
      throw error;
    }
  }

  async getMessages(conversationId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Get messages failed:', error);
      }
      return [];
    }
  }

  async updateConversationTitle(conversationId, title) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/conversations/${conversationId}/title`, {
        method: 'PATCH',
        body: JSON.stringify({ title: title })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to update conversation title' }));
        throw new Error(error.detail || 'Failed to update conversation title');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Update conversation title failed:', error);
      }
      throw error;
    }
  }

  async toggleStarConversation(conversationId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/conversations/${conversationId}/star`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to toggle star' }));
        throw new Error(error.detail || 'Failed to toggle star');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Toggle star failed:', error);
      }
      throw error;
    }
  }

  async deleteConversation(conversationId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete conversation' }));
        throw new Error(error.detail || 'Failed to delete conversation');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Delete conversation failed:', error);
      }
      throw error;
    }
  }

  async getApiKeys(userId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/api-keys/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch API keys');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Get API keys failed:', error);
      }
      return [];
    }
  }

  async saveApiKey(userId, provider, apiKey, keyName = null) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/api-keys/${userId}`, {
        method: 'POST',
        body: JSON.stringify({
          provider: provider,
          api_key: apiKey,
          key_name: keyName || `${provider.toUpperCase()} API Key`
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to save API key' }));
        throw new Error(error.detail || 'Failed to save API key');
      }

      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Save API key failed:', error);
      }
      throw error;
    }
  }

  async deleteApiKey(userId, provider) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/api-keys/${userId}/${provider}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete API key' }));
        throw new Error(error.detail || 'Failed to delete API key');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Delete API key failed:', error);
      }
      throw error;
    }
  }

  async testApiKey(userId, provider) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/api-keys/${userId}/${provider}/test`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'API key test failed' }));
        throw new Error(error.detail || 'API key test failed');
      }

      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Test API key failed:', error);
      }
      throw error;
    }
  }

  async getDecryptedApiKey(userId, provider) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/api-keys/${userId}/${provider}/decrypt`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to get API key' }));
        throw new Error(error.detail || 'Failed to get API key');
      }

      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Get decrypted API key failed:', error);
      }
      throw error;
    }
  }

  async getCustomIntegrations(userId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/custom-integrations/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch custom integrations');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Get custom integrations failed:', error);
      }
      return [];
    }
  }

  async createCustomIntegration(userId, integrationData) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/custom-integrations/${userId}`, {
        method: 'POST',
        body: JSON.stringify(integrationData)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create custom integration' }));
        throw new Error(error.detail || 'Failed to create custom integration');
      }

      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Create custom integration failed:', error);
      }
      throw error;
    }
  }

  async deleteCustomIntegration(integrationId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/custom-integrations/${integrationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete custom integration' }));
        throw new Error(error.detail || 'Failed to delete custom integration');
      }
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Delete custom integration failed:', error);
      }
      throw error;
    }
  }

  async searchMemories(userId, query, limit = 5) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/memory/search`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          query: query,
          limit: limit
        })
      });

      if (!response.ok) throw new Error('Memory search failed');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Search memories failed:', error);
      }
      return { memories: [], count: 0 };
    }
  }

  async debugMemories(userId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/memory/debug/${userId}`);
      if (!response.ok) throw new Error('Debug failed');
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Debug memories failed:', error);
      }
      return null;
    }
  }
}

console.log('API Base URL:', API_BASE_URL);

const apiService = new APIService();
export default apiService;