import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api';
import './Auth.css';

function AuthPage({ selectedLLM, setConnectedLLMs, connectedLLMs }) {
  const navigate = useNavigate();
  const notify = useNotification();
  const { userId } = useUser();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!selectedLLM || !apiKey.trim()) return;

    // Validate key format
    if (selectedLLM.id === 'openai' && !apiKey.startsWith('sk-')) {
      notify.error('Invalid OpenAI API key format (must start with sk-)');
      return;
    }
    if (selectedLLM.id === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      notify.error('Invalid Anthropic API key format (must start with sk-ant-)');
      return;
    }

    try {
      setLoading(true);

      // Save to database
      const result = await apiService.saveApiKey(
        userId,
        selectedLLM.id,
        apiKey.trim(),
        `${selectedLLM.name} API Key`
      );

      if (result.success) {
        // Also save to localStorage for quick access
        localStorage.setItem(`sharedlm_api_${selectedLLM.id}`, apiKey.trim());
        
        // Mark as connected
        setConnectedLLMs([...connectedLLMs, selectedLLM.id]);
        
        notify.success(`${selectedLLM.name} connected successfully`);
        navigate('/integrations');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      notify.error(error.message || 'Failed to save API key');
    } finally {
      setLoading(false);
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
                placeholder={
                  selectedLLM.id === 'openai' ? 'sk-...' : 
                  selectedLLM.id === 'anthropic' ? 'sk-ant-...' : 
                  'Enter API key...'
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && apiKey.trim() && !loading) {
                    handleConnect();
                  }
                }}
                className="api-input"
                autoFocus
                disabled={loading}
              />
            </div>

            <p className="api-hint">
              Your API key is encrypted and stored securely in the database
            </p>
          </div>
        </div>

        <button
          className={`connect-button ${(!apiKey.trim() || loading) ? 'disabled' : ''}`}
          onClick={handleConnect}
          disabled={!apiKey.trim() || loading}
        >
          {loading ? (
            <span>CONNECTING...</span>
          ) : (
            <span>CONNECT {selectedLLM.name}</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default AuthPage;