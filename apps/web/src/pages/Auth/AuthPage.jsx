import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api';
import './Auth.css';

function AuthPage({ selectedLLM, setSelectedLLM, setConnectedLLMs, connectedLLMs }) {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotification();
  const { userId } = useUser();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Use integration from location state if selectedLLM is not set
  // This handles the case when navigating from AddCustomIntegrationPage
  const currentLLM = selectedLLM || location.state?.integration;
  
  // Update parent state if we have location state but not prop
  useEffect(() => {
    if (!selectedLLM && location.state?.integration && setSelectedLLM) {
      setSelectedLLM(location.state.integration);
    }
  }, [selectedLLM, location.state, setSelectedLLM]);

  const handleConnect = async () => {
    if (!currentLLM || !apiKey.trim()) return;

    // Validate key format
    if (currentLLM.id === 'openai' && !apiKey.startsWith('sk-')) {
      notify.error('Invalid OpenAI API key format (must start with sk-)');
      return;
    }
    if (currentLLM.id === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      notify.error('Invalid Anthropic API key format (must start with sk-ant-)');
      return;
    }

    try {
      setLoading(true);

      // Save to database
      const result = await apiService.saveApiKey(
        userId,
        currentLLM.id,
        apiKey.trim(),
        `${currentLLM.name} API Key`
      );

      if (result.success) {
        // DO NOT save API keys to localStorage - they should only be in the backend
        // localStorage is vulnerable to XSS attacks
        // API keys are stored securely in the backend database
        
        // Mark as connected
        setConnectedLLMs([...connectedLLMs, currentLLM.id]);
        
        notify.success(`${currentLLM.name} connected successfully`);
        navigate('/integrations');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      notify.error(error.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  if (!currentLLM) {
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
          <h2 className="auth-title">CONNECT {currentLLM.name}</h2>
          <p className="auth-subtitle">Enter your API key to authenticate</p>
        </div>

        <div className="auth-content">
          <div className="api-section">
            <p className="auth-description">
              Enter your {currentLLM.name} API key to connect
            </p>

            <div className="api-input-wrapper">
              <input
                type="password"
                placeholder={
                  currentLLM.id === 'openai' ? 'sk-...' : 
                  currentLLM.id === 'anthropic' ? 'sk-ant-...' : 
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
            <span>CONNECT {currentLLM.name}</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default AuthPage;