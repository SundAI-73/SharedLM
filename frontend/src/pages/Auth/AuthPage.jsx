import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key } from 'lucide-react';
import './Auth.css';

function AuthPage({ selectedLLM, setConnectedLLMs, connectedLLMs }) {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');

  const handleConnect = () => {
    if (selectedLLM && apiKey.trim()) {
      setConnectedLLMs([...connectedLLMs, selectedLLM.id]);
      navigate('/integrations');
    }
  };

  if (!selectedLLM) {
    navigate('/integrations');
    return null;
  }

  return (
    <div className="auth-page">
      <button
        className="back-button"
        onClick={() => navigate('/integrations')}
      >
        <ArrowLeft size={20} />
        <span>BACK</span>
      </button>

      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">CONNECT {selectedLLM.name}</h2>
          <p className="auth-subtitle">Enter your API key to authenticate</p>
        </div>

        <div className="auth-content">
          <div className="api-section">
            <p className="auth-description">
              Enter your {selectedLLM.name} API key to connect
            </p>

            <div className="api-input-wrapper">
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && apiKey.trim()) {
                    handleConnect();
                  }
                }}
                className="api-input"
                autoFocus
              />
            </div>

            <p className="api-hint">
              Your API key is encrypted and stored securely
            </p>
          </div>
        </div>

        <button
          className={`connect-button ${!apiKey.trim() ? 'disabled' : ''}`}
          onClick={handleConnect}
          disabled={!apiKey.trim()}
        >
          <span>CONNECT {selectedLLM.name}</span>
        </button>
      </div>
    </div>
  );
}

export default AuthPage;