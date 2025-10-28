import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Integrations.css';

function IntegrationsPage({ connectedLLMs, setSelectedLLM }) {
  const navigate = useNavigate();

  const llms = [
    { id: 'mistral', name: 'MISTRAL', provider: 'Open Source', status: 'available' },
    { id: 'claude', name: 'CLAUDE', provider: 'Anthropic', status: 'coming' },
    { id: 'chatgpt', name: 'CHATGPT', provider: 'OpenAI', status: 'coming' },
    { id: 'gemini', name: 'GEMINI', provider: 'Google', status: 'available' },
    { id: 'copilot', name: 'CO PIOLET', provider: 'Microsoft', status: 'available' },
    { id: 'cursor', name: 'CURSOR', provider: 'Code AI', status: 'available' },
    { id: 'llama', name: 'LLAMA 3', provider: 'Meta', status: 'coming' },
    { id: 'perplexity', name: 'PERPLEXITY', provider: 'Search AI', status: 'coming' },
    { id: 'grok', name: 'GROK', provider: 'xAI', status: 'coming' },
  ];

  const handleLLMClick = (llm) => {
    if (llm.status === 'available' && !connectedLLMs.includes(llm.id)) {
      setSelectedLLM(llm);
      navigate('/auth');
    }
  };

  const handleCustomIntegration = () => {
    console.log('Custom integration clicked');
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">MULTI LM</h1>
          <p className="page-subtitle">Connect and manage your AI models</p>
        </div>

        {}
        <div className="grid-4 integrations-grid">
          {llms.map(llm => (
            <button
              key={llm.id}
              className={`card-base integration-card ${connectedLLMs.includes(llm.id) ? 'connected' : ''}`}
              onClick={() => handleLLMClick(llm)}
              disabled={llm.status === 'coming'}
              style={{
                opacity: llm.status === 'coming' ? 0.5 : 1,
                cursor: llm.status === 'coming' ? 'not-allowed' : 'pointer'
              }}
            >
              {llm.status === 'coming' && (
                <div className="coming-soon-badge">SOON</div>
              )}
              <div className="integration-content">
                <div className="integration-icon-placeholder"></div>
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

        {/* Custom Section */}
        <div className="custom-section">
          <p className="custom-label">CUSTOM INTEGRATIONS</p>
          <button
            className="button-base button-primary custom-integration-btn"
            onClick={handleCustomIntegration}
          >
            ADD CUSTOM INTEGRATIONS
          </button>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsPage;
