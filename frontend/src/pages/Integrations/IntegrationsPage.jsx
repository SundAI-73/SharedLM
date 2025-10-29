import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Integrations.css';

function IntegrationsPage({ connectedLLMs, setSelectedLLM }) {
  const navigate = useNavigate();

  const llms = [
    // Available models
    { id: 'openai', name: 'GPT-4O', provider: 'OpenAI', status: 'available' },
    { id: 'anthropic', name: 'CLAUDE 3.5', provider: 'Anthropic', status: 'available' },
    { id: 'google', name: 'GEMINI 2.0', provider: 'Google AI', status: 'available' },
    { id: 'mistral', name: 'MIXTRAL', provider: 'Mistral AI', status: 'available' },
    { id: 'meta', name: 'LLAMA 3', provider: 'Meta', status: 'available' },
    { id: 'cohere', name: 'COMMAND', provider: 'Cohere', status: 'available' },
    { id: 'deepseek', name: 'DEEPSEEK-V3', provider: 'DeepSeek', status: 'available' },
    { id: 'ai21', name: 'JURASSIC-2', provider: 'AI21 Labs', status: 'available' },
    { id: '01ai', name: 'YI-LARGE', provider: '01.AI', status: 'available' },
    { id: 'microsoft', name: 'PHI-3', provider: 'Microsoft', status: 'available' },
    { id: 'nvidia', name: 'NEMOTRON-4', provider: 'NVIDIA', status: 'available' },
    { id: 'ibm', name: 'GRANITE', provider: 'IBM', status: 'available' },
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

        {/* LLM Grid */}
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
            className="button-base button-primary custom-integration-btn coming-soon"
            onClick={handleCustomIntegration}
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