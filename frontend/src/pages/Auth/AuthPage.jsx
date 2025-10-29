import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Key, Github } from 'lucide-react';
import './Auth.css';

function AuthPage({ selectedLLM, setConnectedLLMs, connectedLLMs }) {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState('api'); // Changed default to 'api'
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
          <p className="auth-subtitle">Choose your authentication method</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${authMethod === 'account' ? 'active' : ''} oauth-disabled`}
            onClick={() => setAuthMethod('account')}
            disabled
          >
            <User size={18} />
            <span>OAUTH</span>
            <span className="tab-badge">SOON</span>
          </button>
          <button
            className={`auth-tab ${authMethod === 'api' ? 'active' : ''}`}
            onClick={() => setAuthMethod('api')}
          >
            <Key size={18} />
            <span>API KEY</span>
          </button>
        </div>

        <div className="auth-content">
          {authMethod === 'account' ? (
            <div className="oauth-section">
              <p className="auth-description">
                OAuth authentication coming soon
              </p>

              <div className="auth-buttons">
                <button className="auth-btn" disabled>
                  <span>CONTINUE WITH GOOGLE</span>
                </button>
                <button className="auth-btn" disabled>
                  <Github size={18} />
                  <span>CONTINUE WITH GITHUB</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="api-section">
              <p className="auth-description">
                Enter your API key to authenticate
              </p>

              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="api-input"
              />

              <p className="api-hint">
                Your API key is encrypted and stored locally
              </p>
            </div>
          )}
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