// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Key, Github } from 'lucide-react';
import './Auth.css';

function AuthPage({ selectedLLM, setConnectedLLMs, connectedLLMs }) {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState('account');
  const [apiKey, setApiKey] = useState('');

  const handleConnect = () => {
    if (selectedLLM) {
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
        <span className="led-text">BACK</span>
      </button>

      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title led-text">CONNECT {selectedLLM.name}</h2>
          <p className="auth-subtitle">Choose your authentication method</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${authMethod === 'account' ? 'active' : ''}`}
            onClick={() => setAuthMethod('account')}
          >
            <User size={18} />
            <span className="led-text">OAUTH</span>
          </button>
          <button
            className={`auth-tab ${authMethod === 'api' ? 'active' : ''}`}
            onClick={() => setAuthMethod('api')}
          >
            <Key size={18} />
            <span className="led-text">API KEY</span>
          </button>
        </div>

        <div className="auth-content">
          {authMethod === 'account' ? (
            <div className="oauth-section">
              <p className="auth-description">
                Sign in with your account to continue
              </p>
              
              <div className="auth-buttons">
                <button className="auth-btn">
                  <span className="led-text">CONTINUE WITH GOOGLE</span>
                </button>
                <button className="auth-btn">
                  <Github size={18} />
                  <span className="led-text">CONTINUE WITH GITHUB</span>
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
          className={`connect-button ${authMethod === 'api' && !apiKey ? 'disabled' : ''}`}
          onClick={handleConnect}
          disabled={authMethod === 'api' && !apiKey}
        >
          <span className="led-text">CONNECT {selectedLLM.name}</span>
        </button>
      </div>

    </div>
  );
}

export default AuthPage;