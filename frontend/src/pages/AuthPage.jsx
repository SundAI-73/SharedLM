import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Key } from 'lucide-react';

function AuthPage({ selectedLLM, setConnectedLLMs, connectedLLMs }) {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState('account');
  const [apiKey, setApiKey] = useState('');

  const handleConnect = () => {
    if (selectedLLM) {
      setConnectedLLMs([...connectedLLMs, selectedLLM.id]);
      navigate('/link-llm');
    }
  };

  if (!selectedLLM) {
    navigate('/link-llm');
    return null;
  }

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/link-llm')}>
        <ArrowLeft size={20} /> Back
      </button>

      <div className="auth-container">
        <div className="auth-header">
          <div className="llm-icon" style={{ color: selectedLLM.color }}>
            {selectedLLM.icon}
          </div>
          <h2>Connect to {selectedLLM.name}</h2>
          <p>Choose your authentication method</p>
        </div>

        <div className="auth-options">
          <div 
            className={`auth-option ${authMethod === 'account' ? 'selected' : ''}`}
            onClick={() => setAuthMethod('account')}
          >
            <User size={24} />
            <div>
              <h4>1. Connect using your account</h4>
              <p>Sign in with Google, GitHub, or email</p>
            </div>
          </div>

          {authMethod === 'account' && (
            <div className="auth-buttons">
              <button className="oauth-btn">
                <span>🔍</span> Continue with Google
              </button>
              <button className="oauth-btn">
                <span>💻</span> Continue with GitHub
              </button>
            </div>
          )}

          <div 
            className={`auth-option ${authMethod === 'api' ? 'selected' : ''}`}
            onClick={() => setAuthMethod('api')}
          >
            <Key size={24} />
            <div>
              <h4>2. Use API Key</h4>
              <p>Connect using your API credentials</p>
            </div>
          </div>

          {authMethod === 'api' && (
            <div className="api-input">
              <input 
                type="password" 
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          )}
        </div>

        <button className="connect-btn" onClick={handleConnect}>
          Connect to {selectedLLM.name}
        </button>
      </div>
    </div>
  );
}

export default AuthPage;