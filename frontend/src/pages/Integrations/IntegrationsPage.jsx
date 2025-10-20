// src/pages/IntegrationsPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Brain, Zap, Sparkles, Search, Cloud, CheckCircle, Plus } from 'lucide-react';
import './Integrations.css';

function IntegrationsPage({ connectedLLMs, setSelectedLLM }) {
  const navigate = useNavigate();

  const llms = [
    { id: 'claude', name: 'CLAUDE', icon: <Bot size={24} strokeWidth={1} />, provider: 'Anthropic' },
    { id: 'chatgpt', name: 'CHATGPT', icon: <Brain size={24} strokeWidth={1} />, provider: 'OpenAI' },
    { id: 'gemini', name: 'GEMINI', icon: <Sparkles size={24} strokeWidth={1} />, provider: 'Google' },
    { id: 'perplexity', name: 'PERPLEXITY', icon: <Search size={24} strokeWidth={1} />, provider: 'Search AI' },
    { id: 'mistral', name: 'MISTRAL', icon: <Cloud size={24} strokeWidth={1} />, provider: 'Open LLM' },
    { id: 'cursor', name: 'CURSOR', icon: <Zap size={24} strokeWidth={1} />, provider: 'Code AI' },
  ];

  const handleLLMClick = (llm) => {
    if (!connectedLLMs.includes(llm.id)) {
      setSelectedLLM(llm);
      navigate('/auth');
    }
  };

  const handleCustomIntegration = () => {
    console.log('Custom integration clicked');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title led-text">MULTI LLM</h1>
        <p className="page-subtitle">CONNECT AND MANAGE YOUR AI MODELS</p>
      </div>

      <div className="integrations-grid">
        {llms.map(llm => (
          <button
            key={llm.id}
            className={`integration-card ${connectedLLMs.includes(llm.id) ? 'connected' : ''}`}
            onClick={() => handleLLMClick(llm)}
          >
            <div className="integration-content">
              <h3 className="integration-name led-text">{llm.name}</h3>
            </div>
            {connectedLLMs.includes(llm.id) && (
              <div className="connected-indicator">
                <CheckCircle size={16} />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="custom-section">
        <p className="custom-label led-text">CUSTOM INTEGRATIONS</p>
        <button 
          className="custom-integration-btn"
          onClick={handleCustomIntegration}
        >
          <span className="led-text">ADD CUSTOM INTEGRATIONS</span>
        </button>
      </div>

      <style>{`
        
      `}</style>
    </div>
  );
}

export default IntegrationsPage;