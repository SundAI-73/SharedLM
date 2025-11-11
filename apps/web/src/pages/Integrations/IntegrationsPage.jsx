import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api/index';
import mistralLogo from '../../assets/images/m-boxed-orange.png';
import openaiLogo from '../../assets/images/openai-logo.svg';
import anthropicLogo from '../../assets/images/claude-color.svg';
import inceptionLogo from '../../assets/images/inception-labs.png';
import './Integrations.css';

function IntegrationsPage({ connectedLLMs = [], setConnectedLLMs, setSelectedLLM }) {
  const navigate = useNavigate();
  const notify = useNotification();
  const { userId } = useUser();

  const [customIntegrations, setCustomIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const defaultLLMs = [
    { 
      id: 'mistral', 
      name: 'MISTRAL', 
      provider: 'Mistral AI', 
      status: 'available', 
      logo: mistralLogo 
    },
    { 
      id: 'inception', 
      name: 'Inception', 
      provider: 'Inception Labs', 
      status: 'available',
      logo: inceptionLogo
    },
    { 
      id: 'openai', 
      name: 'Chat-GPT', 
      provider: 'OpenAI', 
      status: 'available', 
      logo: openaiLogo 
    },
    { 
      id: 'anthropic', 
      name: 'claude', 
      provider: 'Anthropic', 
      status: 'available', 
      logo: anthropicLogo 
    },
    { 
      id: 'deepseek', 
      name: 'DEEPSEEK', 
      provider: 'DeepSeek', 
      status: 'coming', 
      logo: null 
    },
    { 
      id: 'google', 
      name: 'GEMINI', 
      provider: 'Google AI', 
      status: 'coming', 
      logo: null 
    },
    { 
      id: 'meta', 
      name: 'LLAMA', 
      provider: 'Meta', 
      status: 'coming', 
      logo: null 
    },
  ];

  const loadConnectedModels = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      // Fetch API keys from database
      // Backend already filters for is_active == True, so all returned keys are active
      const apiKeys = await apiService.getApiKeys(userId);
      console.log('[IntegrationsPage] Loaded API keys:', apiKeys);
      
      // Backend returns only active keys, so we can use all of them
      const connectedFromKeys = (apiKeys || []).map(key => key.provider);
      
      console.log('[IntegrationsPage] Connected from keys:', connectedFromKeys);
      
      // Fetch custom integrations
      const integrations = await apiService.getCustomIntegrations(userId);
      console.log('[IntegrationsPage] Loaded custom integrations:', integrations);
      setCustomIntegrations(integrations || []);
      
      // Filter for active custom integrations (backend might return all, so filter here)
      const connectedFromIntegrations = (integrations || [])
        .filter(int => int.is_active === true)
        .map(int => int.provider_id);
      
      console.log('[IntegrationsPage] Connected from integrations:', connectedFromIntegrations);
      
      // Merge both lists and remove duplicates
      const allConnected = [...new Set([...connectedFromKeys, ...connectedFromIntegrations])];
      
      console.log('[IntegrationsPage] All connected models:', allConnected);
      console.log('[IntegrationsPage] Current connectedLLMs prop:', connectedLLMs);
      
      // Always update the connected LLMs state, even if empty
      if (setConnectedLLMs) {
        setConnectedLLMs(allConnected);
        console.log('[IntegrationsPage] Updated connectedLLMs state to:', allConnected);
      } else {
        console.warn('[IntegrationsPage] setConnectedLLMs is not provided');
      }
    } catch (error) {
      console.error('[IntegrationsPage] Failed to load connected models:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, setConnectedLLMs]);

  useEffect(() => {
    loadConnectedModels();
  }, [loadConnectedModels]);

  // Listen for API key updates to refresh the connected models list
  useEffect(() => {
    const handleApiKeysUpdated = () => {
      loadConnectedModels();
    };

    window.addEventListener('apiKeysUpdated', handleApiKeysUpdated);
    
    // Also refresh when page becomes visible (user might have added keys in another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadConnectedModels();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('apiKeysUpdated', handleApiKeysUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadConnectedModels]);


  const handleLLMClick = (llm) => {
    const isConnected = Array.isArray(connectedLLMs) && connectedLLMs.includes(llm.id);
    if (llm.status === 'available' && !isConnected) {
      setSelectedLLM(llm);
      navigate('/auth');
    } else if (isConnected) {
      notify.info(`${llm.name} is already connected. Manage your API key in Settings.`);
    }
  };

  const handleCustomIntegrationClick = () => {
    navigate('/add-custom-integration');
  };


  const handleDeleteCustomIntegration = async (integrationId, integrationName) => {
    const confirmed = await notify.confirm({
      title: 'Delete Custom Integration',
      message: `Are you sure you want to delete "${integrationName}"? This will also remove its API key.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      try {
        await apiService.deleteCustomIntegration(integrationId);
        notify.success('Custom integration deleted');
        await loadConnectedModels();
      } catch (error) {
        notify.error(error.message || 'Failed to delete custom integration');
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="page-title">MULTI LM</h1>
          <p className="page-subtitle">Connect and manage your AI models</p>
        </motion.div>

        <div className="page-main-content">
          <motion.div 
            className="grid-4 integrations-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {defaultLLMs.map((llm, index) => {
              const isConnected = Array.isArray(connectedLLMs) && connectedLLMs.includes(llm.id);
              return (
              <motion.button
                key={llm.id}
                className={`card-base integration-card ${isConnected ? 'connected' : ''}`}
                onClick={() => handleLLMClick(llm)}
                disabled={llm.status === 'coming'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: llm.status === 'coming' ? 0.5 : 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                whileHover={llm.status !== 'coming' ? { y: -4, scale: 1.02 } : {}}
                whileTap={llm.status !== 'coming' ? { scale: 0.98 } : {}}
                style={{
                  cursor: llm.status === 'coming' ? 'not-allowed' : 
                          isConnected ? 'default' : 'pointer'
                }}
              >
                {llm.status === 'coming' && (
                  <div className="coming-soon-badge">SOON</div>
                )}
                <div className="integration-content">
                  <div className="integration-icon-placeholder">
                    {llm.logo ? (
                      <img 
                        src={llm.logo} 
                        alt={`${llm.name} logo`} 
                        className="integration-logo"
                      />
                    ) : isConnected ? (
                      <Check size={20} color="#00ff88" />
                    ) : null}
                  </div>
                  <div className="integration-text">
                    <h3 className="integration-name">{llm.name}</h3>
                    <p className="integration-provider">{llm.provider}</p>
                  </div>
                </div>
                {isConnected && (
                  <div className="connected-indicator"></div>
                )}
              </motion.button>
              );
            })}
          </motion.div>

          <motion.div 
            className="custom-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <motion.p 
              className="custom-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              CUSTOM INTEGRATIONS
            </motion.p>
            
            <AnimatePresence>
              {customIntegrations.length > 0 && (
                <motion.div 
                  className="grid-4 custom-integrations-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {customIntegrations.map((integration, index) => {
                    const isCustomConnected = Array.isArray(connectedLLMs) && connectedLLMs.includes(integration.provider_id);
                    return (
                    <motion.div 
                      key={integration.id} 
                      className={`card-base integration-card custom-integration-item ${isCustomConnected ? 'connected' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      <motion.button
                        className="custom-integration-delete"
                        onClick={() => handleDeleteCustomIntegration(integration.id, integration.name)}
                        title="Delete integration"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={16} />
                      </motion.button>
                      
                      <div className="integration-content">
                        <div className="integration-icon-placeholder">
                          {integration.logo_url ? (
                            <img 
                              src={integration.logo_url} 
                              alt={`${integration.name} logo`}
                              className="integration-logo"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <Check size={20} color="#B94539" />
                          )}
                        </div>
                        <div className="integration-text">
                          <h3 className="integration-name">{integration.name}</h3>
                          <p className="integration-provider">Custom</p>
                        </div>
                      </div>
                      {isCustomConnected && (
                        <div className="connected-indicator"></div>
                      )}
                    </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.button
              className="button-base button-primary custom-integration-btn"
              onClick={handleCustomIntegrationClick}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              ADD CUSTOM INTEGRATION
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsPage;
