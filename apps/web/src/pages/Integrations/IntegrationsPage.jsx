import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api/index';
import mistralLogo from '../../assets/images/m-boxed-orange.png';
import openaiLogo from '../../assets/images/openai-logo.svg';
import anthropicLogo from '../../assets/images/claude-color.svg';
import inceptionLogo from '../../assets/images/inception-labs.png';
import './Integrations.css';

function IntegrationsPage({ connectedLLMs, setSelectedLLM, setConnectedLLMs }) {
  const navigate = useNavigate();
  const notify = useNotification();
  const { userId } = useUser();

  const [customIntegrations, setCustomIntegrations] = useState([]);

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
    if (!userId) return;
    
    try {
      // Fetch API keys from database
      const apiKeys = await apiService.getApiKeys(userId);
      const connectedFromKeys = apiKeys
        .filter(key => key.is_active)
        .map(key => key.provider);
      
      // Fetch custom integrations
      const integrations = await apiService.getCustomIntegrations(userId);
      setCustomIntegrations(integrations);
      
      const connectedFromIntegrations = integrations
        .filter(int => int.is_active)
        .map(int => int.provider_id);
      
      // Merge both lists and remove duplicates
      const allConnected = [...new Set([...connectedFromKeys, ...connectedFromIntegrations])];
      
      if (allConnected.length > 0 && setConnectedLLMs) {
        setConnectedLLMs(allConnected);
      }
    } catch (error) {
      console.error('Failed to load connected models:', error);
    }
  }, [userId, setConnectedLLMs]);

  useEffect(() => {
    loadConnectedModels();
  }, [loadConnectedModels]);


  const handleLLMClick = (llm) => {
    if (llm.status === 'available' && !connectedLLMs.includes(llm.id)) {
      setSelectedLLM(llm);
      navigate('/auth');
    } else if (connectedLLMs.includes(llm.id)) {
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
        <div className="page-header">
          <h1 className="page-title">MULTI LM</h1>
          <p className="page-subtitle">Connect and manage your AI models</p>
        </div>

        <div className="page-main-content">
          <div className="grid-4 integrations-grid">
            {defaultLLMs.map(llm => (
              <button
                key={llm.id}
                className={`card-base integration-card ${connectedLLMs.includes(llm.id) ? 'connected' : ''}`}
                onClick={() => handleLLMClick(llm)}
                disabled={llm.status === 'coming'}
                style={{
                  opacity: llm.status === 'coming' ? 0.5 : 1,
                  cursor: llm.status === 'coming' ? 'not-allowed' : 
                          connectedLLMs.includes(llm.id) ? 'default' : 'pointer'
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
                    ) : connectedLLMs.includes(llm.id) ? (
                      <Check size={20} color="#00ff88" />
                    ) : null}
                  </div>
                  <div className="integration-text">
                    <h3 className="integration-name">{llm.name}</h3>
                    <p className="integration-provider">{llm.provider}</p>
                  </div>
                </div>
                {connectedLLMs.includes(llm.id) && (
                  <div className="connected-indicator"></div>
                )}
              </button>
            ))}
          </div>

          <div className="custom-section">
            <p className="custom-label">CUSTOM INTEGRATIONS</p>
            
            {customIntegrations.length > 0 && (
              <div className="grid-4 custom-integrations-grid">
                {customIntegrations.map(integration => (
                  <div key={integration.id} className="card-base integration-card custom-integration-item">
                    <button
                      className="custom-integration-delete"
                      onClick={() => handleDeleteCustomIntegration(integration.id, integration.name)}
                      title="Delete integration"
                    >
                      <X size={16} />
                    </button>
                    
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
                  </div>
                ))}
              </div>
            )}
            
            <button
              className="button-base button-primary custom-integration-btn"
              onClick={handleCustomIntegrationClick}
            >
              ADD CUSTOM INTEGRATION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsPage;