import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../../contexts/UserContext';
import apiService from '../../../services/api/index';
import { defaultModelVariants } from '../utils/chatHelpers';

export const useModels = (backendStatus) => {
  const { userId, currentModel, setCurrentModel } = useUser();
  const [availableModels, setAvailableModels] = useState([]);
  const [modelProviders, setModelProviders] = useState([]);
  const [modelVariants, setModelVariants] = useState({});
  const [selectedModelVariant, setSelectedModelVariant] = useState('mistral-medium-latest');
  const [customIntegrations, setCustomIntegrations] = useState([]);

  // Load available models
  const loadAvailableModels = useCallback(() => {
    if (backendStatus === 'connected' && userId) {
      // Get available models for this specific user
      apiService.getModels(userId).then(data => {
        // Handle response - data might be null or have available_models
        const available = (data && Array.isArray(data.available_models)) 
          ? data.available_models 
          : [];
        
        console.log('[ChatPage] Available models from backend:', available);
        
        // CRITICAL: Always set availableModels first, even if empty
        setAvailableModels(available);
        
        // Define provider labels
        const providerLabels = {
          'mistral': 'MISTRAL AI',
          'openai': 'OPENAI',
          'anthropic': 'ANTHROPIC',
          'inception': 'INCEPTION'
        };
        
        // Build model providers list from available models only
        // IMPORTANT: Only show models that are in the available array
        // If available is empty, standardProviders will be empty array
        const standardProviders = available
          .filter(model => !model.startsWith('custom_'))
          .map(model => ({
            value: model,
            label: providerLabels[model] || model.toUpperCase(),
            isCustom: false
          }));
        
        console.log('[ChatPage] Setting model providers:', standardProviders);
        // CRITICAL: Always set modelProviders, even if empty
        // This ensures that if no models are available, the dropdown is empty
        setModelProviders(standardProviders);
        
        // Build model variants - only include variants for available models
        // If available is empty, variants will be empty object
        const variants = {};
        available.forEach(model => {
          if (defaultModelVariants[model]) {
            variants[model] = defaultModelVariants[model];
          }
        });
        console.log('[ChatPage] Setting model variants:', variants);
        // CRITICAL: Always set modelVariants, even if empty
        setModelVariants(variants);
        
        // Update current model and variant based on available models
        if (available.length === 0) {
          // CRITICAL: No models available - explicitly clear everything
          console.log('[ChatPage] No models available, clearing current model and variant');
          setCurrentModel(null);
          setSelectedModelVariant('');
        } else {
          // Models are available - update current model if needed
          setCurrentModel(prevModel => {
            // If no previous model or previous model is not available, set to first available
            if (!prevModel || !available.includes(prevModel)) {
              // Set default variant for the new model
              if (variants[available[0]] && variants[available[0]].length > 0) {
                setSelectedModelVariant(variants[available[0]][0].value);
              } else {
                setSelectedModelVariant('');
              }
              return available[0];
            }
            // Previous model is still available - check if variant is valid
            const currentVariants = variants[prevModel] || [];
            setSelectedModelVariant(prevVariant => {
              if (currentVariants.length > 0) {
                if (!currentVariants.find(v => v.value === prevVariant)) {
                  return currentVariants[0].value;
                }
                return prevVariant;
              }
              return '';
            });
            return prevModel;
          });
        }
      }).catch(error => {
        console.error('[ChatPage] Failed to load available models:', error);
        // Fallback to empty array - user needs to add API keys
        setAvailableModels([]);
        setModelProviders([]);
        setModelVariants({});
        setCurrentModel(null);
        setSelectedModelVariant('');
      });
    } else {
      // Not connected or no userId - clear everything
      setAvailableModels([]);
      setModelProviders([]);
      setModelVariants({});
    }
  }, [backendStatus, userId, setCurrentModel]);

  // Load custom integrations and add them to providers/variants (only if they're available)
  useEffect(() => {
    const loadCustomIntegrations = async () => {
      if (!userId) {
        return;
      }

      try {
        const integrations = await apiService.getCustomIntegrations(userId);
        
        // Store custom integrations for logo access
        setCustomIntegrations(integrations || []);

        // Only add custom integrations that are in availableModels (have API keys)
        // This ensures we only show integrations that the user has actually set up
        if (availableModels.length > 0) {
          const customProviders = (integrations || [])
            .filter(int => availableModels.includes(int.provider_id))
            .map(int => ({
              value: int.provider_id,
              label: int.name.toUpperCase(),
              isCustom: true
            }));

          // Update model providers to include custom integrations
          // Only add if there are custom providers to add
          if (customProviders.length > 0) {
            setModelProviders(prev => {
              const standardProviders = prev.filter(p => !p.isCustom);
              return [...standardProviders, ...customProviders];
            });

            // Add custom integrations to variants (they don't have variants, so empty array)
            setModelVariants(prev => {
              const customVariants = {};
              integrations
                .filter(int => availableModels.includes(int.provider_id))
                .forEach(int => {
                  customVariants[int.provider_id] = [];
                });
              return { ...prev, ...customVariants };
            });
          }
        } else {
          // No available models - ensure custom integrations are not shown
          setModelProviders(prev => prev.filter(p => !p.isCustom));
          setModelVariants(prev => {
            const cleaned = { ...prev };
            Object.keys(cleaned).forEach(key => {
              if (key.startsWith('custom_')) {
                delete cleaned[key];
              }
            });
            return cleaned;
          });
        }

      } catch (error) {
        console.error('[ChatPage] Failed to load custom integrations:', error);
        // On error, remove custom integrations from providers
        setModelProviders(prev => prev.filter(p => !p.isCustom));
      }
    };

    // Only load custom integrations after availableModels has been set
    // This prevents race conditions where custom integrations are loaded before we know which models are available
    if (availableModels !== undefined) {
      loadCustomIntegrations();
    }
  }, [userId, availableModels]);

  // Handle model variant updates when model changes
  useEffect(() => {
    const variants = modelVariants[currentModel] || [];
    const isCustomIntegration = currentModel && currentModel.startsWith('custom_');
    
    if (variants.length > 0) {
      // If current variant is not in the list, select the first one
      if (!variants.find(v => v.value === selectedModelVariant)) {
        setSelectedModelVariant(variants[0].value);
      }
    } else {
      // No variants available - clear the variant
      // For custom integrations, this is expected (they don't have variants)
      // For standard providers, this shouldn't happen, but we'll clear it anyway
      if (isCustomIntegration || variants.length === 0) {
        setSelectedModelVariant('');
      }
    }
    
    // If switching to a custom integration and current variant is from a standard provider, clear it
    if (isCustomIntegration && selectedModelVariant) {
      if (selectedModelVariant.includes('mistral') || 
          selectedModelVariant.includes('gpt') || 
          selectedModelVariant.includes('claude')) {
        setSelectedModelVariant('');
      }
    }
  }, [currentModel, selectedModelVariant, modelVariants]);

  // Load available models on mount and when dependencies change
  useEffect(() => {
    loadAvailableModels();
  }, [loadAvailableModels]);

  // Listen for API key updates to refresh models
  useEffect(() => {
    const handleApiKeysUpdated = () => {
      // Refresh available models when API keys are added/removed
      loadAvailableModels();
    };

    window.addEventListener('apiKeysUpdated', handleApiKeysUpdated);
    
    // Also refresh when page becomes visible (user might have added keys in another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAvailableModels();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('apiKeysUpdated', handleApiKeysUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAvailableModels]);

  return {
    availableModels,
    modelProviders,
    modelVariants,
    selectedModelVariant,
    setSelectedModelVariant,
    customIntegrations,
    loadAvailableModels
  };
};

