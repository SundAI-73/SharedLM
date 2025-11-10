import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api/index';
import mistralLogo from '../../assets/images/m-boxed-orange.png';
import openaiLogo from '../../assets/images/openai-logo.svg';
import anthropicLogo from '../../assets/images/claude-color.svg';
import './Integrations.css';

function IntegrationsPage({ connectedLLMs, setSelectedLLM, setConnectedLLMs }) {
  const navigate = useNavigate();
  const notify = useNotification();
  const { userId } = useUser();
  const modalRef = useRef(null);

  const [customIntegrations, setCustomIntegrations] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFormData, setCustomFormData] = useState({
    name: '',
    baseUrl: '',
    logoUrl: ''
  });
  const [loadingCustom, setLoadingCustom] = useState(false);

  const defaultLLMs = [
    { 
      id: 'mistral', 
      name: 'MISTRAL', 
      provider: 'Mistral AI', 
      status: 'available', 
      logo: mistralLogo 
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
      name: 'CLAUDE', 
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

  useEffect(() => {
    const connected = [];
    
    if (localStorage.getItem('sharedlm_api_openai')) {
      connected.push('openai');
    }
    if (localStorage.getItem('sharedlm_api_anthropic')) {
      connected.push('anthropic');
    }
    if (localStorage.getItem('sharedlm_api_mistral')) {
      connected.push('mistral');
    }
    
    if (connected.length > 0 && setConnectedLLMs) {
      setConnectedLLMs(connected);
    }

    loadCustomIntegrations();
  }, [setConnectedLLMs, userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowCustomModal(false);
      }
    };

    if (showCustomModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomModal]);

  const loadCustomIntegrations = async () => {
    if (!userId) return;

    try {
      const integrations = await apiService.getCustomIntegrations(userId);
      setCustomIntegrations(integrations);
    } catch (error) {
      console.error('Failed to load custom integrations:', error);
    }
  };

  const handleLLMClick = (llm) => {
    if (llm.status === 'available' && !connectedLLMs.includes(llm.id)) {
      setSelectedLLM(llm);
      navigate('/auth');
    } else if (connectedLLMs.includes(llm.id)) {
      notify.info(`${llm.name} is already connected. Manage your API key in Settings.`);
    }
  };

  const handleCustomIntegrationClick = () => {
    setShowCustomModal(true);
  };

  const handleCustomFormChange = (field, value) => {
    setCustomFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateCustomIntegration = async () => {
    if (!customFormData.name.trim()) {
      notify.error('Please enter an integration name');
      return;
    }

    try {
      setLoadingCustom(true);

      const result = await apiService.createCustomIntegration(userId, {
        name: customFormData.name.trim(),
        base_url: customFormData.baseUrl.trim() || null,
        logo_url: customFormData.logoUrl.trim() || null,
        api_type: 'openai'
      });

      if (result.success) {
        notify.success('Custom integration created successfully');
        
        await loadCustomIntegrations();
        
        setShowCustomModal(false);
        setCustomFormData({ name: '', baseUrl: '', logoUrl: '' });
        
        const integration = result.integration;
        setSelectedLLM({
          id: integration.provider_id,
          name: integration.name,
          provider: 'Custom',
          status: 'available',
          logo: integration.logo_url,
          isCustom: true,
          baseUrl: integration.base_url
        });
        
        navigate('/auth');
      }
    } catch (error) {
      notify.error(error.message || 'Failed to create custom integration');
    } finally {
      setLoadingCustom(false);
    }
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
        await loadCustomIntegrations();
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

      {showCustomModal && (
        <div className="modal-overlay">
          <div className="modal-content" ref={modalRef}>
            <h2 className="modal-title">ADD CUSTOM INTEGRATION</h2>
            
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Integration Name *</label>
                <input
                  type="text"
                  placeholder="e.g., My Local LLM, Ollama, etc."
                  value={customFormData.name}
                  onChange={(e) => handleCustomFormChange('name', e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Base URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., http://localhost:11434/v1"
                  value={customFormData.baseUrl}
                  onChange={(e) => handleCustomFormChange('baseUrl', e.target.value)}
                  className="form-input"
                />
                <p className="form-hint">Leave empty if using default OpenAI-compatible endpoint</p>
              </div>

              <div className="form-group">
                <label className="form-label">Logo URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={customFormData.logoUrl}
                  onChange={(e) => handleCustomFormChange('logoUrl', e.target.value)}
                  className="form-input"
                />
                <p className="form-hint">Direct link to an image file</p>
              </div>

              <div className="modal-actions">
                <button 
                  className="button-base button-secondary" 
                  onClick={() => {
                    setShowCustomModal(false);
                    setCustomFormData({ name: '', baseUrl: '', logoUrl: '' });
                  }}
                  disabled={loadingCustom}
                >
                  Cancel
                </button>
                <button 
                  className="button-base button-primary" 
                  onClick={handleCreateCustomIntegration}
                  disabled={!customFormData.name.trim() || loadingCustom}
                >
                  {loadingCustom ? 'Creating...' : 'Add Integration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntegrationsPage;