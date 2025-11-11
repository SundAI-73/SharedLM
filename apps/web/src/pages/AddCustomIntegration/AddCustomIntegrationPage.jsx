import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api';
import './AddCustomIntegration.css';

function AddCustomIntegrationPage({ setSelectedLLM, setConnectedLLMs, connectedLLMs }) {
  const navigate = useNavigate();
  const notify = useNotification();
  const { userId } = useUser();
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [integrationCreated, setIntegrationCreated] = useState(false);
  const [createdIntegration, setCreatedIntegration] = useState(null);
  const [integrationId, setIntegrationId] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateUrl = (url) => {
    if (!url || !url.trim()) return null;
    try {
      const urlObj = new URL(url.trim());
      // Only allow http and https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return 'URL must use http or https protocol';
      }
      return null;
    } catch (e) {
      return 'Invalid URL format';
    }
  };

  const handleAddIntegration = async () => {
    if (!formData.name.trim()) {
      notify.error('Please enter an integration name');
      return;
    }

    // Validate URLs if provided
    if (formData.baseUrl.trim()) {
      const baseUrlError = validateUrl(formData.baseUrl);
      if (baseUrlError) {
        notify.error(`Base URL: ${baseUrlError}`);
        return;
      }
    }

    if (formData.logoUrl.trim()) {
      const logoUrlError = validateUrl(formData.logoUrl);
      if (logoUrlError) {
        notify.error(`Logo URL: ${logoUrlError}`);
        return;
      }
    }

    // Validate name length
    if (formData.name.trim().length > 255) {
      notify.error('Integration name is too long (max 255 characters)');
      return;
    }

    try {
      setLoading(true);

      const result = await apiService.createCustomIntegration(userId, {
        name: formData.name.trim(),
        base_url: formData.baseUrl.trim() || null,
        logo_url: formData.logoUrl.trim() || null,
        api_type: 'openai'
      });

      if (result.success) {
        notify.success('Custom integration created successfully');
        
        const integration = result.integration;
        const llmData = {
          id: integration.provider_id,
          name: integration.name,
          provider: 'Custom',
          status: 'available',
          logo: integration.logo_url,
          isCustom: true,
          baseUrl: integration.base_url
        };
        
        // Set the selected LLM
        setSelectedLLM(llmData);
        
        // Mark integration as created and store the data
        setCreatedIntegration(llmData);
        setIntegrationId(integration.id);
        setIntegrationCreated(true);
        // Keep form data for editing
        setFormData({
          name: integration.name,
          baseUrl: integration.base_url || '',
          logoUrl: integration.logo_url || ''
        });
      }
    } catch (error) {
      console.error('Failed to create custom integration:', error);
      notify.error(error.message || 'Failed to create custom integration');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/integrations');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Restore form data from created integration
    if (createdIntegration) {
      setFormData({
        name: createdIntegration.name,
        baseUrl: createdIntegration.baseUrl || '',
        logoUrl: createdIntegration.logo || ''
      });
    }
    setIsEditing(false);
  };

  const handleUpdateIntegration = async () => {
    if (!formData.name.trim()) {
      notify.error('Please enter an integration name');
      return;
    }

    if (!integrationId) {
      notify.error('Integration ID not found');
      return;
    }

    // Validate URLs if provided
    if (formData.baseUrl.trim()) {
      const baseUrlError = validateUrl(formData.baseUrl);
      if (baseUrlError) {
        notify.error(`Base URL: ${baseUrlError}`);
        return;
      }
    }

    if (formData.logoUrl.trim()) {
      const logoUrlError = validateUrl(formData.logoUrl);
      if (logoUrlError) {
        notify.error(`Logo URL: ${logoUrlError}`);
        return;
      }
    }

    // Validate name length
    if (formData.name.trim().length > 255) {
      notify.error('Integration name is too long (max 255 characters)');
      return;
    }

    try {
      setLoading(true);

      const result = await apiService.updateCustomIntegration(integrationId, {
        name: formData.name.trim(),
        base_url: formData.baseUrl.trim() || null,
        logo_url: formData.logoUrl.trim() || null,
        api_type: 'openai'
      });

      if (result.success) {
        notify.success('Custom integration updated successfully');
        
        const integration = result.integration;
        const llmData = {
          id: integration.provider_id,
          name: integration.name,
          provider: 'Custom',
          status: 'available',
          logo: integration.logo_url,
          isCustom: true,
          baseUrl: integration.base_url
        };
        
        // Update the created integration data
        setCreatedIntegration(llmData);
        setSelectedLLM(llmData);
        setIsEditing(false);
        // Update form data to reflect any backend changes (like provider_id if name changed)
        setFormData({
          name: integration.name,
          baseUrl: integration.base_url || '',
          logoUrl: integration.logo_url || ''
        });
      }
    } catch (error) {
      console.error('Failed to update custom integration:', error);
      notify.error(error.message || 'Failed to update custom integration');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!createdIntegration || !apiKey.trim()) return;

    try {
      setConnecting(true);

      // Save to database
      const result = await apiService.saveApiKey(
        userId,
        createdIntegration.id,
        apiKey.trim(),
        `${createdIntegration.name} API Key`
      );

      if (result.success) {
        // Mark as connected
        if (setConnectedLLMs) {
          setConnectedLLMs([...connectedLLMs, createdIntegration.id]);
        }
        
        notify.success(`${createdIntegration.name} connected successfully`);
        navigate('/integrations');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      notify.error(error.message || 'Failed to save API key');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className={`auth-page ${integrationCreated ? 'two-column-layout' : ''}`}>
      <button
        className="back-button"
        onClick={() => navigate('/integrations')}
      >
        <ArrowLeft size={20} />
        <span>BACK</span>
      </button>

      <div className={`auth-containers-wrapper ${integrationCreated ? 'show-two' : ''}`}>
        {/* Integration Form - Always shown, moves to left after save */}
        <div className={`auth-container integration-form ${integrationCreated ? 'moved-left' : ''}`}>
          <div className="auth-header">
            <h2 className="auth-title">ADD CUSTOM INTEGRATION</h2>
            <p className="auth-subtitle">Configure your custom integration</p>
          </div>

          <div className="auth-content">
            <div className="api-section">
              <div className="form-field-group">
                <label className="form-label">
                  Integration Name *
                </label>
                <div className="api-input-wrapper">
                  <input
                    type="text"
                    placeholder="e.g., My Local LLM, Ollama, etc."
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="api-input"
                    autoFocus={!integrationCreated || isEditing}
                    disabled={loading || (integrationCreated && !isEditing)}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-label">
                  Base URL (Optional)
                </label>
                <div className="api-input-wrapper">
                  <input
                    type="text"
                    placeholder="e.g., http://localhost:11434/v1"
                    value={formData.baseUrl}
                    onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                    className="api-input"
                    disabled={loading || (integrationCreated && !isEditing)}
                  />
                </div>
                <p className="form-hint-text">
                  Leave empty if using default OpenAI-compatible endpoint
                </p>
              </div>

              <div className="form-field-group">
                <label className="form-label">
                  Logo URL (Optional)
                </label>
                <div className="api-input-wrapper">
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                    className="api-input"
                    disabled={loading || (integrationCreated && !isEditing)}
                  />
                </div>
                <p className="form-hint-text">
                  Direct link to an image file
                </p>
              </div>
            </div>
          </div>

          {!integrationCreated && (
            <div className="auth-actions">
              <button
                className="cancel-button"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={`connect-button ${(!formData.name.trim() || loading) ? 'disabled' : ''}`}
                onClick={handleAddIntegration}
                disabled={!formData.name.trim() || loading}
              >
                {loading ? (
                  <span>ADDING...</span>
                ) : (
                  <span>SAVE</span>
                )}
              </button>
            </div>
          )}

          {integrationCreated && !isEditing && (
            <button
              className="edit-button"
              onClick={handleEdit}
            >
              EDIT
            </button>
          )}

          {integrationCreated && isEditing && (
            <div className="auth-actions">
              <button
                className="cancel-button"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={`connect-button ${(!formData.name.trim() || loading) ? 'disabled' : ''}`}
                onClick={handleUpdateIntegration}
                disabled={!formData.name.trim() || loading}
              >
                {loading ? (
                  <span>SAVING...</span>
                ) : (
                  <span>SAVE</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* API Key Form - Shows on right after integration is created */}
        {integrationCreated && createdIntegration && (
          <div className="auth-container api-key-form">
            <div className="auth-header">
              <h2 className="auth-title">CONNECT {createdIntegration.name}</h2>
              <p className="auth-subtitle">Enter your API key to authenticate</p>
            </div>

            <div className="auth-content">
              <div className="api-section">
                <p className="auth-description">
                  Enter your {createdIntegration.name} API key to connect
                </p>

                <div className="api-input-wrapper">
                  <input
                    type="password"
                    placeholder="Enter API key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && apiKey.trim() && !connecting) {
                        handleConnect();
                      }
                    }}
                    className="api-input"
                    autoFocus={!isEditing}
                    disabled={connecting}
                  />
                </div>

                <p className="api-hint">
                  Your API key is encrypted and stored securely in the database
                </p>
              </div>
            </div>

            <button
              className={`connect-button ${(!apiKey.trim() || connecting) ? 'disabled' : ''}`}
              onClick={handleConnect}
              disabled={!apiKey.trim() || connecting}
            >
              {connecting ? (
                <span>CONNECTING...</span>
              ) : (
                <span>CONNECT {createdIntegration.name}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddCustomIntegrationPage;

