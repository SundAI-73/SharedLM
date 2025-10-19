// src/pages/AuthPage.jsx
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
    <div className="auth-page">
      <button className="back-btn" onClick={() => navigate('/link-llm')}>
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="auth-container">
        <div className="auth-header">
          <div className="llm-display">
            {selectedLLM.icon}
            <h2>Connect to {selectedLLM.name}</h2>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab ${authMethod === 'account' ? 'active' : ''}`}
            onClick={() => setAuthMethod('account')}
          >
            <User size={18} />
            OAuth
          </button>
          <button
            className={`tab ${authMethod === 'api' ? 'active' : ''}`}
            onClick={() => setAuthMethod('api')}
          >
            <Key size={18} />
            API Key
          </button>
        </div>

        <div className="auth-content">
          {authMethod === 'account' ? (
            <div className="oauth-section">
              <p className="auth-description">
                Sign in with your account to connect {selectedLLM.name}
              </p>
              
              <div className="oauth-buttons">
                <button className="oauth-btn google">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                
                <button className="oauth-btn github">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </button>
              </div>
            </div>
          ) : (
            <div className="api-section">
              <p className="auth-description">
                Enter your API key to connect {selectedLLM.name}
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
          className="connect-btn"
          onClick={handleConnect}
          disabled={authMethod === 'api' && !apiKey}
        >
          Connect {selectedLLM.name}
        </button>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          background: #000000;
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .back-btn {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50px;
          padding: 0.5rem 1rem;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 3rem;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .auth-container {
          width: 100%;
          max-width: 450px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 2rem;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .llm-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: white;
        }

        .llm-display h2 {
          font-size: 1.5rem;
          font-weight: 400;
        }

        .auth-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.75rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
        }

        .tab.active {
          background: white;
          color: black;
          border-color: white;
        }

        .auth-content {
          margin-bottom: 2rem;
        }

        .auth-description {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .oauth-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .oauth-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0.875rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .oauth-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .oauth-btn.google {
          background: white;
          color: #333;
        }

        .oauth-btn.google:hover {
          background: rgba(255, 255, 255, 0.95);
        }

        .oauth-btn.github {
          background: #24292e;
        }

        .oauth-btn.github:hover {
          background: #2f363d;
        }

        .api-input {
          width: 100%;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 0.95rem;
          outline: none;
          margin-bottom: 0.75rem;
        }

        .api-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .api-input:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .api-hint {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.8rem;
          text-align: center;
        }

        .connect-btn {
          width: 100%;
          padding: 0.875rem;
          background: white;
          color: black;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .connect-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.9);
        }

        .connect-btn:disabled {
          background: rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.4);
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default AuthPage;