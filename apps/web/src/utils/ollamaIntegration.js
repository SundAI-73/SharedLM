/**
 * Utility to set up Ollama custom integration from setup wizard config
 * This is called when the app first launches after installation
 */

import apiService from '../services/api';

/**
 * Read installation config from the setup wizard
 * @param {string} installPath - Installation path from config
 * @returns {Promise<Object|null>} Config object or null if not found
 */
export async function readInstallConfig(installPath) {
  try {
    // In Electron, use the IPC handler
    if (window.electron && window.electron.readConfig) {
      return await window.electron.readConfig(installPath);
    }
    
    // Fallback: try to read from localStorage (if stored during installation)
    const storedConfig = localStorage.getItem('sharedlm_install_config');
    if (storedConfig) {
      return JSON.parse(storedConfig);
    }
    
    // Also try electron-store
    if (window.electron && window.electron.store) {
      const storedPath = await window.electron.store.get('install_path');
      if (storedPath && window.electron.readConfig) {
        return await window.electron.readConfig(storedPath);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to read install config:', error);
    return null;
  }
}

/**
 * Check if Ollama integration should be created and create it
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if integration was created or already exists
 */
// Track if setup is in progress to prevent duplicate creation
let setupInProgress = false;

export async function setupOllamaIntegration(userId) {
  // Prevent duplicate setup calls
  if (setupInProgress) {
    return false;
  }
  
  try {
    setupInProgress = true;
    
    // Check if integration already exists
    const existingIntegrations = await apiService.getCustomIntegrations(userId);
    const ollamaIntegration = existingIntegrations.find(
      int => int.provider_id === 'custom_local_ollama'
    );
    
    if (ollamaIntegration) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Ollama integration already exists');
      }
      return true;
    }
    
    // Try to read config from various sources
    let config = null;
    
    // Try Electron config reader
    if (window.electron && window.electron.readConfig) {
      const installPath = localStorage.getItem('sharedlm_install_path');
      if (installPath) {
        config = await readInstallConfig(installPath);
      }
    }
    
    // Fallback: check localStorage
    if (!config) {
      const storedConfig = localStorage.getItem('sharedlm_install_config');
      if (storedConfig) {
        config = JSON.parse(storedConfig);
      }
    }
    
    // If no config found, check if Ollama is installed
    if (!config || !config.ollamaIntegration) {
      // Check if Ollama is available by trying to detect it
      const ollamaAvailable = await checkOllamaAvailable();
      if (!ollamaAvailable) {
        console.log('Ollama not detected, skipping integration setup');
        return false;
      }
      
      // Create integration with default values
      config = {
        ollamaIntegration: {
          shouldCreate: true,
          name: "Local Ollama",
          baseUrl: "http://localhost:11434/v1",
          apiType: "openai",
          providerId: "custom_local_ollama",
          apiKey: "ollama"
        }
      };
    }
    
    // Create the custom integration
    if (config.ollamaIntegration && config.ollamaIntegration.shouldCreate) {
      const integrationData = {
        name: config.ollamaIntegration.name || "Local Ollama",
        base_url: config.ollamaIntegration.baseUrl || "http://localhost:11434/v1",
        api_type: config.ollamaIntegration.apiType || "openai",
        logo_url: null
      };
      
      const result = await apiService.createCustomIntegration(userId, integrationData);
      
      if (result.success) {
        // Also create the API key entry
        try {
          await apiService.saveApiKey(
            userId,
            'custom_local_ollama',
            config.ollamaIntegration.apiKey || 'ollama',
            'Local Ollama API Key'
          );
        } catch (keyError) {
          console.warn('Failed to save Ollama API key (may already exist):', keyError);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Ollama custom integration created successfully');
        }
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Failed to setup Ollama integration:', error);
    return false;
  } finally {
    setupInProgress = false;
  }
}

/**
 * Check if Ollama is available by testing the endpoint
 * @returns {Promise<boolean>}
 */
async function checkOllamaAvailable() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

