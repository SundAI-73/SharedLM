/**
 * Utility to monitor Ollama model installation progress
 * Polls the backend to check if models are being installed and shows notifications
 */

import apiService from '../services/api';

/**
 * Monitor model installation progress
 * @param {Array<string>} modelIds - Array of model IDs to monitor
 * @param {Function} onProgress - Callback with (modelId, installed) status
 * @param {Function} onComplete - Callback when all models are installed
 * @param {Function} notify - Notification function from useNotification hook
 * @returns {Function} Cleanup function to stop monitoring
 */
export function monitorModelInstallation(modelIds, onProgress, onComplete, notify) {
  if (!modelIds || modelIds.length === 0) {
    return () => {}; // No models to monitor
  }

  const installedModels = new Set();
  const monitoringModels = new Set(modelIds);
  let pollInterval = null;
  let checkCount = 0;
  const maxChecks = 300; // 5 minutes max (1 second intervals)

  const checkModelStatus = async () => {
    checkCount++;
    
    // Stop monitoring after max checks
    if (checkCount > maxChecks) {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (notify) {
        notify.warning('Model installation monitoring timed out. Please check manually.');
      }
      return;
    }

    // Check status of each model
    for (const modelId of monitoringModels) {
      if (installedModels.has(modelId)) {
        continue; // Already installed
      }

      try {
        const status = await apiService.getOllamaModelStatus(modelId);
        
        if (status.installed) {
          installedModels.add(modelId);
          monitoringModels.delete(modelId);
          
          // Notify user
          if (notify) {
            notify.success(`Model "${modelId}" installed successfully!`);
          }
          
          // Call progress callback
          if (onProgress) {
            onProgress(modelId, true);
          }
        }
      } catch (error) {
        // Silently continue - model might still be installing
        if (process.env.NODE_ENV === 'development') {
          console.log(`[OllamaMonitor] Checking ${modelId}...`);
        }
      }
    }

    // Check if all models are installed
    if (monitoringModels.size === 0) {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      
      if (notify) {
        notify.success('All models installed successfully!');
      }
      
      if (onComplete) {
        onComplete(Array.from(installedModels));
      }
    }
  };

  // Start monitoring
  if (notify) {
    notify.info(`Monitoring installation of ${modelIds.length} model(s)...`);
  }
  
  // Check immediately
  checkModelStatus();
  
  // Then check every 2 seconds
  pollInterval = setInterval(checkModelStatus, 2000);

  // Return cleanup function
  return () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };
}

/**
 * Check if models from installation config are being installed
 * @param {Object} config - Installation config from setup wizard
 * @returns {Array<string>} Array of model IDs that should be monitored
 */
export function getModelsToMonitor(config) {
  if (!config || !config.models || !Array.isArray(config.models)) {
    return [];
  }

  // Extract model IDs from config
  // config.models might be an array of model IDs or model objects
  return config.models.map(model => {
    if (typeof model === 'string') {
      return model;
    } else if (model && model.id) {
      return model.id;
    } else if (model && model.model_id) {
      return model.model_id;
    }
    return null;
  }).filter(Boolean);
}

