import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import mistralLogo from '../../assets/images/m-boxed-orange.png';
import openaiLogo from '../../assets/images/openai-logo.svg';
import anthropicLogo from '../../assets/images/claude-color.svg';
import './Integrations.css';

function IntegrationsPage({ connectedLLMs, setSelectedLLM, setConnectedLLMs }) {
  const navigate = useNavigate();
  const notify = useNotification();

  // Check localStorage for saved API keys on mount
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
  }, [setConnectedLLMs]);

  const llms = [
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
    { 
      id: 'microsoft', 
      name: 'CoPilot', 
      provider: 'Microsoft', 
      status: 'coming', 
      logo: null 
    },
  ];

  const handleLLMClick = (llm) => {
    if (llm.status === 'available' && !connectedLLMs.includes(llm.id)) {
      setSelectedLLM(llm);
      navigate('/auth');
    } else if (connectedLLMs.includes(llm.id)) {
      notify.info(`${llm.name} is already connected. Manage your API key in Settings.`);
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
          {llms.map(llm => (
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
          <button
            className="button-base button-primary custom-integration-btn coming-soon"
            disabled
          >
            ADD CUSTOM INTEGRATIONS
            <span className="coming-soon-badge">SOON</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsPage;