// src/services/api.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIService {
  // Health check
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

  // Get available models
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

  // Send chat message
  async sendMessage(userId, message, modelChoice) {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          message: message,
          model_choice: modelChoice
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Send message failed:', error);
      throw error;
    }
  }

  // Search memories
  async searchMemories(userId, query, limit = 5) {
    try {
      const response = await fetch(`${API_BASE_URL}/memory/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  // Debug memories
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

export default new APIService();