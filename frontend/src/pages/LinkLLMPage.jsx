// src/pages/LinkLLMPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Brain, Zap, Sparkles, Search, Cloud } from 'lucide-react';
import './style.css';

function LinkLLMPage({ connectedLLMs, setSelectedLLM }) {
  const navigate = useNavigate();

  const llms = [
    { id: 'claude', name: 'Claude', icon: <Bot size={32} strokeWidth={1.5} />, description: 'Anthropic AI' },
    { id: 'chatgpt', name: 'ChatGPT', icon: <Brain size={32} strokeWidth={1.5} />, description: 'OpenAI' },
    { id: 'gemini', name: 'Gemini', icon: <Sparkles size={32} strokeWidth={1.5} />, description: 'Google AI' },
    { id: 'perplexity', name: 'Perplexity', icon: <Search size={32} strokeWidth={1.5} />, description: 'Search AI' },
    { id: 'mistral', name: 'Mistral', icon: <Cloud size={32} strokeWidth={1.5} />, description: 'Open LLM' },
    { id: 'cursor', name: 'Cursor', icon: <Zap size={32} strokeWidth={1.5} />, description: 'Code AI' },
  ];

  const handleLLMClick = (llm) => {
    if (!connectedLLMs.includes(llm.id)) {
      setSelectedLLM(llm);
      navigate('/auth');
    }
  };

  return (
    <div className="llm-page">
      <div className="page-container">
        <h1 className="page-title">Multi LLM</h1>
        <p className="page-subtitle">Connect and manage your AI models</p>

        <div className="llm-grid">
          {llms.map(llm => (
            <button
              key={llm.id}
              className={`llm-pill ${connectedLLMs.includes(llm.id) ? 'connected' : ''}`}
              onClick={() => handleLLMClick(llm)}
            >
              <div className="llm-icon">{llm.icon}</div>
              <div className="llm-info">
                <span className="llm-name">{llm.name}</span>
                <span className="llm-desc">{llm.description}</span>
              </div>
              {connectedLLMs.includes(llm.id) && (
                <span className="connected-dot"></span>
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

export default LinkLLMPage;