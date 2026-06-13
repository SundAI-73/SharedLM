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
  // IMPORTANT: Only setup Ollama in application (Electron), NOT in web
  // Check if we're in Electron application
  if (!window.electron || !window.electron.readConfig) {
    // We're in web, skip Ollama setup
    if (process.env.NODE_ENV === 'development') {
      console.log('Ollama setup skipped - not in application (web mode)');
    }
    return false;
  }
  
  // Prevent duplicate setup calls
  if (setupInProgress) {
    return false;
  }
  
  try {
    setupInProgress = true;
    
    // Try to read config from setup wizard
    let config = null;
    const installPath = localStorage.getItem('sharedlm_install_path');
    if (installPath && window.electron.readConfig) {
      config = await readInstallConfig(installPath);
    }
    
    // Fallback: check localStorage
    if (!config) {
      const storedConfig = localStorage.getItem('sharedlm_install_config');
      if (storedConfig) {
        config = JSON.parse(storedConfig);
      }
    }
    
    // If no config found, skip setup (only setup from wizard)
    if (!config || !config.ollamaIntegration || !config.ollamaIntegration.shouldCreate) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Ollama setup skipped - no config from setup wizard');
      }
      return false;
    }
    
    // Get installed Ollama models
    let installedModels = [];
    try {
      const ollamaData = await apiService.getOllamaModels();
      installedModels = ollamaData.installed_models || [];
    } catch (error) {
      console.warn('Failed to get Ollama models:', error);
    }
    
    // Build fallback URLs for local LLM
    const fallbackUrls = [
      { url: "http://localhost:11435/v1", api_key: "ollama" },
      { url: "http://127.0.0.1:11434/v1", api_key: "ollama" },
      { url: "http://127.0.0.1:11435/v1", api_key: "ollama" }
    ];
    
    const baseUrl = config.ollamaIntegration.baseUrl || "http://localhost:11434/v1";
    const apiType = config.ollamaIntegration.apiType || "openai";
    const apiKey = config.ollamaIntegration.apiKey || "ollama";
    
    // Get existing integrations to avoid duplicates
    const existingIntegrations = await apiService.getCustomIntegrations(userId);
    const existingProviderIds = new Set(existingIntegrations.map(int => int.provider_id));
    
    // Create a separate custom integration for EACH installed Ollama model
    let createdCount = 0;
    for (const modelName of installedModels) {
      // Generate provider_id from model name (e.g., "gemma3" -> "custom_local_gemma3")
      const sanitizedModelName = modelName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const providerId = `custom_local_${sanitizedModelName}`;
      
      // Skip if already exists
      if (existingProviderIds.has(providerId)) {
        continue;
      }
      
      // Create integration for this specific model
      const integrationData = {
        name: `Local ${modelName}`,  // e.g., "Local gemma3"
        base_url: baseUrl,
        api_type: apiType,
        logo_url: null,
        fallback_urls: JSON.stringify(fallbackUrls)
      };
      
      try {
        const result = await apiService.createCustomIntegration(userId, integrationData);
        
        if (result.success) {
          // Create API key entry for this model
          try {
            await apiService.saveApiKey(
              userId,
              providerId,
              apiKey,
              `Local ${modelName} API Key`
            );
          } catch (keyError) {
            console.warn(`Failed to save API key for ${modelName}:`, keyError);
          }
          
          createdCount++;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Created custom integration for model: ${modelName} (${providerId})`);
          }
        }
      } catch (error) {
        console.error(`Failed to create integration for ${modelName}:`, error);
      }
    }
    
    if (createdCount > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Ollama integration setup complete: ${createdCount} model(s) configured`);
      }
      return true;
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

