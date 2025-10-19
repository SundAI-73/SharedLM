// src/pages/LinkLLMPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Brain, Zap, Sparkles, Search, Cloud } from 'lucide-react';

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

      <style jsx>{`
        .llm-page {
          min-height: 100vh;
          background: #000000;
          padding: 3rem 2rem;
        }

        .page-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 300;
          color: white;
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          margin-bottom: 4rem;
          font-size: 1rem;
        }

        .llm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .llm-pill {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: transparent;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .llm-pill:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .llm-pill.connected {
          background: white;
          border-color: white;
        }

        .llm-icon {
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .llm-pill.connected .llm-icon {
          color: #000000;
        }

        .llm-info {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .llm-name {
          color: white;
          font-size: 1rem;
          font-weight: 500;
        }

        .llm-desc {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .llm-pill.connected .llm-name {
          color: #000000;
        }

        .llm-pill.connected .llm-desc {
          color: rgba(0, 0, 0, 0.6);
        }

        .connected-dot {
          position: absolute;
          right: 1.5rem;
          width: 8px;
          height: 8px;
          background: #00ff88;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}

export default LinkLLMPage;