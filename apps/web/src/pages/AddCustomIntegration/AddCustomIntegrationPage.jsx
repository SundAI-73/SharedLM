import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api';
import './AddCustomIntegration.css';

function AddCustomIntegrationPage({ setSelectedLLM, setConnectedLLMs, connectedLLMs }) {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [apiKeyPreview, setApiKeyPreview] = useState('');
  const [editingApiKey, setEditingApiKey] = useState(false);

  // Load API key preview for editing
  const loadApiKeyPreview = useCallback(async (providerId) => {
    try {
      const apiKeys = await apiService.getApiKeys(userId);
      const existingKey = apiKeys.find(key => key.provider === providerId);
      if (existingKey && existingKey.key_preview) {
        setApiKeyPreview(existingKey.key_preview);
        setApiKey(''); // Clear the input for new key
      }
    } catch (error) {
      console.error('Failed to load API key preview:', error);
    }
  }, [userId]);


  // Load existing integration if provided via location state
  useEffect(() => {
    const existingIntegration = location.state?.integration;
    const isEditingApiKey = location.state?.editingApiKey;
    
    if (existingIntegration) {
      // Load existing integration for editing
      setFormData({
        name: existingIntegration.name || '',
        baseUrl: existingIntegration.base_url || '',
        logoUrl: existingIntegration.logo_url || ''
      });
      setIntegrationId(existingIntegration.id);
      setIntegrationCreated(true);
      setEditingApiKey(isEditingApiKey || false);
      // If editing API key, also allow editing the integration form
      if (isEditingApiKey) {
        setIsEditing(true);
      }
      
      const llmData = {
        id: existingIntegration.provider_id,
        name: existingIntegration.name,
        provider: 'Custom',
        status: 'available',
        logo: existingIntegration.logo_url,
        isCustom: true,
        baseUrl: existingIntegration.base_url
      };
      setCreatedIntegration(llmData);
      setSelectedLLM(llmData);
      
      // If editing API key, load the current API key preview
      if (isEditingApiKey) {
        loadApiKeyPreview(existingIntegration.provider_id);
      }
    }
  }, [location.state, setSelectedLLM, loadApiKeyPreview]);

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
    if (!createdIntegration) return;

    // If base URL is provided, API key is optional
    // If no base URL, API key is required
    const hasBaseUrl = formData.baseUrl.trim() || createdIntegration.baseUrl;
    if (!hasBaseUrl && !apiKey.trim()) {
      notify.error('API key is required when base URL is not provided');
      return;
    }

    try {
      setConnecting(true);

      // If API key is provided, save it
      if (apiKey.trim()) {
        const result = await apiService.saveApiKey(
          userId,
          createdIntegration.id,
          apiKey.trim(),
          `${createdIntegration.name} API Key`
        );

        if (!result.success) {
          notify.error(result.message || 'Failed to save API key');
          setConnecting(false);
          return;
        }
      }

      // Mark as connected
      if (setConnectedLLMs) {
        const updatedConnected = [...connectedLLMs];
        if (!updatedConnected.includes(createdIntegration.id)) {
          updatedConnected.push(createdIntegration.id);
        }
        setConnectedLLMs(updatedConnected);
      }
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
        detail: { provider: createdIntegration.id, action: 'added' }
      }));
      
      if (editingApiKey) {
        notify.success(`${createdIntegration.name} API key updated successfully`);
        // If editing from Settings, navigate back to Settings
        const fromSettings = location.state?.fromSettings;
        if (fromSettings) {
          navigate('/settings?tab=api-keys');
        } else {
          navigate('/integrations');
        }
      } else {
        notify.success(`${createdIntegration.name} connected successfully`);
        navigate('/integrations');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      notify.error(error.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className={`auth-page ${integrationCreated ? 'two-column-layout' : ''}`}>
      <motion.button
        className="back-button"
        onClick={() => navigate('/integrations')}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.98 }}
      >
        <ArrowLeft size={20} />
        <span>BACK</span>
      </motion.button>

      <div className={`auth-containers-wrapper ${integrationCreated ? 'show-two' : ''}`}>
        {/* Integration Form - Always shown, moves to left after save */}
        <motion.div 
          className={`auth-container integration-form ${integrationCreated ? 'moved-left' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div 
            className="auth-header"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="auth-title">ADD CUSTOM INTEGRATION</h2>
            <p className="auth-subtitle">Configure your custom integration</p>
          </motion.div>

          <div className="auth-content">
            <div className="api-section">
              <motion.div 
                className="form-field-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
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
              </motion.div>

              <motion.div 
                className="form-field-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
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
              </motion.div>

              <motion.div 
                className="form-field-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
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
              </motion.div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!integrationCreated && (
              <motion.div 
                key="initial-actions"
                className="auth-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                <motion.button
                  className="cancel-button"
                  onClick={handleCancel}
                  disabled={loading}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className={`connect-button ${(!formData.name.trim() || loading) ? 'disabled' : ''}`}
                  onClick={handleAddIntegration}
                  disabled={!formData.name.trim() || loading}
                  whileHover={(!formData.name.trim() || loading) ? {} : { scale: 1.02, y: -2 }}
                  whileTap={(!formData.name.trim() || loading) ? {} : { scale: 0.98 }}
                >
                  {loading ? (
                    <span>ADDING...</span>
                  ) : (
                    <span>SAVE</span>
                  )}
                </motion.button>
              </motion.div>
            )}

            {integrationCreated && !isEditing && (
              <motion.button
                key="edit-button"
                className="edit-button"
                onClick={handleEdit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, delay: 0.7 }}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                EDIT
              </motion.button>
            )}

            {integrationCreated && isEditing && (
              <motion.div 
                key="edit-actions"
                className="auth-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <motion.button
                  className="cancel-button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className={`connect-button ${(!formData.name.trim() || loading) ? 'disabled' : ''}`}
                  onClick={handleUpdateIntegration}
                  disabled={!formData.name.trim() || loading}
                  whileHover={(!formData.name.trim() || loading) ? {} : { scale: 1.02, y: -2 }}
                  whileTap={(!formData.name.trim() || loading) ? {} : { scale: 0.98 }}
                >
                  {loading ? (
                    <span>SAVING...</span>
                  ) : (
                    <span>SAVE</span>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* API Key Form - Shows on right after integration is created */}
        <AnimatePresence>
          {integrationCreated && createdIntegration && (
            <motion.div 
              key="api-key-form"
              className="auth-container api-key-form"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.div 
                className="auth-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <h2 className="auth-title">
                  {editingApiKey ? 'EDIT API KEY' : `CONNECT ${createdIntegration.name}`}
                </h2>
                <p className="auth-subtitle">
                  {editingApiKey 
                    ? 'Update your API key'
                    : formData.baseUrl.trim() || createdIntegration.baseUrl 
                      ? 'API key is optional when base URL is provided' 
                      : 'Enter your API key to authenticate'}
                </p>
              </motion.div>

              <div className="auth-content">
                <div className="api-section">
                  {(formData.baseUrl.trim() || createdIntegration.baseUrl) && (
                    <motion.div
                      className="base-url-added-message"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.6 }}
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        border: '1px solid rgba(0, 255, 136, 0.3)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        color: '#00ff88',
                        fontSize: '14px',
                        textAlign: 'center'
                      }}
                    >
                      ✓ Base URL added
                    </motion.div>
                  )}

                  {editingApiKey && apiKeyPreview && (
                    <motion.p 
                      className="api-key-item-description"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.6 }}
                      style={{
                        marginBottom: '12px',
                        fontSize: '0.85rem',
                        color: '#888888'
                      }}
                    >
                      Current key: {apiKeyPreview}
                    </motion.p>
                  )}

                  <motion.p 
                    className="auth-description"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                  >
                    {editingApiKey
                      ? `Enter new ${createdIntegration.name} API key`
                      : formData.baseUrl.trim() || createdIntegration.baseUrl
                        ? `Enter your ${createdIntegration.name} API key (optional)`
                        : `Enter your ${createdIntegration.name} API key to connect`}
                  </motion.p>

                  <motion.div 
                    className="api-input-wrapper"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                  >
                    <input
                      type="password"
                      placeholder={editingApiKey 
                        ? "Enter new API key..." 
                        : formData.baseUrl.trim() || createdIntegration.baseUrl 
                          ? "Enter API key (optional)..." 
                          : "Enter API key..."}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onKeyDown={(e) => {
                        const hasBaseUrl = formData.baseUrl.trim() || createdIntegration.baseUrl;
                        if (e.key === 'Enter' && (apiKey.trim() || hasBaseUrl) && !connecting) {
                          handleConnect();
                        }
                      }}
                      className="api-input"
                      autoFocus={!isEditing}
                      disabled={connecting}
                    />
                  </motion.div>

                  <motion.p 
                    className="api-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.8 }}
                  >
                    {formData.baseUrl.trim() || createdIntegration.baseUrl
                      ? 'API key is optional when base URL is provided. Your API key is encrypted and stored securely.'
                      : 'Your API key is encrypted and stored securely in the database'}
                  </motion.p>
                </div>
              </div>

              <motion.button
                className={`connect-button ${(connecting || (!apiKey.trim() && !(formData.baseUrl.trim() || createdIntegration.baseUrl))) ? 'disabled' : ''}`}
                onClick={handleConnect}
                disabled={connecting || (!apiKey.trim() && !(formData.baseUrl.trim() || createdIntegration.baseUrl))}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.9 }}
                whileHover={(connecting || (!apiKey.trim() && !(formData.baseUrl.trim() || createdIntegration.baseUrl))) ? {} : { scale: 1.02, y: -2 }}
                whileTap={(connecting || (!apiKey.trim() && !(formData.baseUrl.trim() || createdIntegration.baseUrl))) ? {} : { scale: 0.98 }}
              >
                {connecting ? (
                  <span>CONNECTING...</span>
                ) : editingApiKey ? (
                  <span>UPDATE API KEY</span>
                ) : (
                  <span>CONNECT {createdIntegration.name}</span>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AddCustomIntegrationPage;

