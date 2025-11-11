import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiService from '../../services/api';
import './ApiKeysModal.css';

const availableProviders = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-4 Turbo, GPT-3.5, and more',
    placeholder: 'sk-...',
    format: 'starts with sk-'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Sonnet, Claude Opus, Claude Haiku',
    placeholder: 'sk-ant-...',
    format: 'starts with sk-ant-'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Small, Medium, and Large models',
    placeholder: 'Enter Mistral API key...',
    format: ''
  },
  {
    id: 'inception',
    name: 'Inception Labs',
    description: 'Mercury, Mercury Coder, and more',
    placeholder: 'Enter Inception API key...',
    format: ''
  }
];

function ApiKeysModal({ isOpen, onClose, onApiKeyAdded }) {
  const { userId } = useUser();
  const notify = useNotification();
  const modalRef = useRef(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedApiKeys, setSavedApiKeys] = useState([]);
  const [customIntegrations, setCustomIntegrations] = useState([]);

  const loadSavedApiKeys = useCallback(async () => {
    try {
      const keys = await apiService.getApiKeys(userId);
      setSavedApiKeys(keys.map(k => k.provider));
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setSavedApiKeys([]);
    }
  }, [userId]);

  const loadCustomIntegrations = useCallback(async () => {
    try {
      const integrations = await apiService.getCustomIntegrations(userId);
      setCustomIntegrations(integrations || []);
    } catch (error) {
      console.error('Failed to load custom integrations:', error);
      setCustomIntegrations([]);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadSavedApiKeys();
      loadCustomIntegrations();
    }
  }, [isOpen, loadSavedApiKeys, loadCustomIntegrations]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setApiKeyValue('');
    setVisible(false);
  };

  const handleSaveApiKey = async () => {
    if (!selectedProvider || !apiKeyValue.trim()) {
      notify.error('Please enter an API key');
      return;
    }

    // Validate key format
    if (selectedProvider.id === 'openai' && !apiKeyValue.trim().startsWith('sk-')) {
      notify.error('Invalid OpenAI API key format (must start with sk-)');
      return;
    }
    if (selectedProvider.id === 'anthropic' && !apiKeyValue.trim().startsWith('sk-ant-')) {
      notify.error('Invalid Anthropic API key format (must start with sk-ant-)');
      return;
    }

    try {
      setLoading(true);
      const result = await apiService.saveApiKey(
        userId,
        selectedProvider.id,
        apiKeyValue.trim(),
        `${selectedProvider.name.toUpperCase()} API Key`
      );

      if (result.success) {
        notify.success(`${selectedProvider.name} API key saved successfully`);
        setApiKeyValue('');
        setSelectedProvider(null);
        await loadSavedApiKeys();
        
        // Dispatch event to notify other components (like ChatPage) that models changed
        window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
          detail: { provider: selectedProvider.id, action: 'added' }
        }));
        
        if (onApiKeyAdded) {
          onApiKeyAdded();
        }
      }
    } catch (error) {
      notify.error(error.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  // Combine standard providers with custom apis
  const allProviders = [
    ...availableProviders,
    ...customIntegrations
      .filter(int => !savedApiKeys.includes(int.provider_id))
      .map(int => ({
        id: int.provider_id,
        name: int.name,
        description: `Custom api: ${int.name}`,
        placeholder: 'Enter API key...',
        format: ''
      }))
  ];

  const availableProvidersToShow = allProviders.filter(
    provider => !savedApiKeys.includes(provider.id)
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">ADD API KEY</h2>
        
        <div className="modal-form">
          {!selectedProvider ? (
            <>
              {availableProvidersToShow.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888888' }}>
                  <p>All available API keys have been added</p>
                  <p className="form-hint" style={{ marginTop: '10px' }}>Go to Settings to manage your API keys</p>
                </div>
              ) : (
                <>
                  <p className="form-hint" style={{ textAlign: 'center', marginBottom: '20px' }}>
                      Select a provider to add an API key
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                      {availableProvidersToShow.map((provider) => (
                        <div
                          key={provider.id}
                          style={{
                            background: '#1F1F1F',
                            border: '1px solid #2A2A2A',
                            borderRadius: '12px',
                            padding: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '12px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#3A3A3A';
                            e.currentTarget.style.background = '#242424';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#2A2A2A';
                            e.currentTarget.style.background = '#1F1F1F';
                          }}
                          onClick={() => handleProviderSelect(provider)}
                        >
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: '#2A2A2A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#B94539'
                          }}>
                            <Zap size={24} />
                          </div>
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#E0E0E0',
                            margin: 0,
                            fontFamily: "'Courier New', monospace"
                          }}>{provider.name}</h3>
                          <p style={{
                            fontSize: '0.75rem',
                            color: '#888888',
                            margin: 0,
                            fontFamily: "'Courier New', monospace",
                            lineHeight: '1.4'
                          }}>{provider.description}</p>
                          <button style={{
                            background: '#B94539',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '0.875rem',
                            fontFamily: "'Courier New', monospace",
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            marginTop: 'auto'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#A0382E'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#B94539'}
                          >Add</button>
                        </div>
                      ))}
                    </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">API Name *</label>
                <input
                  type="text"
                  value={selectedProvider.name}
                  disabled
                  className="form-input"
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  API Key *
                  {selectedProvider.format && (
                    <span style={{ fontWeight: 'normal', color: '#888888', fontSize: '0.8rem', marginLeft: '8px' }}>
                      ({selectedProvider.format})
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={visible ? "text" : "password"}
                    value={apiKeyValue}
                    onChange={(e) => setApiKeyValue(e.target.value)}
                    placeholder={selectedProvider.placeholder}
                    className="form-input"
                    style={{ paddingRight: '45px' }}
                    autoFocus
                  />
                  <button
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#888888',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setVisible(!visible)}
                    type="button"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2A2A2A';
                      e.currentTarget.style.color = '#E0E0E0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = '#888888';
                    }}
                  >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="button-base button-secondary" 
                  onClick={() => {
                    setSelectedProvider(null);
                    setApiKeyValue('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="button-base button-primary" 
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyValue.trim() || loading}
                >
                  {loading ? 'Validating...' : 'Add API'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiKeysModal;

