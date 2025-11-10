import React, { useState, useEffect, useCallback } from 'react';
import { Settings, User, BarChart3, Brain, Link, RefreshCw, Zap, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import ConnectorsModal from '../../components/ConnectorsModal/ConnectorsModal';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../services/api';
import './Settings.css';

function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotification();
  const { analyticsEnabled, setAnalyticsEnabled, userId } = useUser();
  
  // Get tab from URL query parameter
  const urlParams = new URLSearchParams(location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'general');
  
  // Update active tab when URL changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  // Name fields - load from localStorage
  const savedFullName = localStorage.getItem('sharedlm_full_name') || '';
  const savedCallName = localStorage.getItem('sharedlm_user_name') || '';
  const [fullName, setFullName] = useState(savedFullName);
  const [claudeCallName, setClaudeCallName] = useState(savedCallName);
  const [originalFullName, setOriginalFullName] = useState(savedFullName);
  const [originalCallName, setOriginalCallName] = useState(savedCallName);
  const [showNameSaveButtons, setShowNameSaveButtons] = useState(false);
  
  const [workDescription, setWorkDescription] = useState('other');
  const [responseCompletions, setResponseCompletions] = useState(false);
  
  // Usage State
  const [usageData] = useState({
    currentSession: { percentage: 0, limit: 100 },
    openai: { percentage: 0, limit: 100 },
    anthropic: { percentage: 0, limit: 100 },
    mistral: { percentage: 0, limit: 100 }
  });
  const [lastUpdated, setLastUpdated] = useState('just now');

  // Capabilities State
  const [artifactsEnabled, setArtifactsEnabled] = useState(true);
  const [codeExecutionEnabled, setCodeExecutionEnabled] = useState(false);
  const [locationMetadataEnabled, setLocationMetadataEnabled] = useState(true);
  const [searchReferenceChatsEnabled, setSearchReferenceChatsEnabled] = useState(true);
  const [generateMemoryFromHistoryEnabled, setGenerateMemoryFromHistoryEnabled] = useState(true);
  const [memoryText] = useState('Work context Gagan is a Software Engineering gradua student at Northeastern University working as a co-op student in data analytics at a');
  const [memoryUpdated] = useState('22 hours ago');

  // API Keys State
  const [apiKeys, setApiKeys] = useState({
    openai: { value: '', visible: false, saved: false, preview: '' },
    anthropic: { value: '', visible: false, saved: false, preview: '' },
    mistral: { value: '', visible: false, saved: false, preview: '' }
  });
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [customIntegrations, setCustomIntegrations] = useState([]);
  const [userConnectors, setUserConnectors] = useState([]);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);

  const settingsTabs = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'account', label: 'Account', icon: <User size={18} /> },
    { id: 'usage', label: 'Usage', icon: <BarChart3 size={18} /> },
    { id: 'capabilities', label: 'Capabilities', icon: <Brain size={18} /> },
    { id: 'connectors', label: 'Connectors', icon: <Link size={18} /> },
    { id: 'api-keys', label: 'API Keys', icon: <Zap size={18} /> }
  ];

  // Load user connectors
  const loadUserConnectors = useCallback(async () => {
    try {
      setLoadingConnectors(true);
      // Load user's connectors - try API first, fallback to localStorage
      let connectors = [];
      
      try {
        if (apiService.getUserConnectors) {
          connectors = await apiService.getUserConnectors(userId) || [];
        }
      } catch (apiError) {
        console.log('API not available, using localStorage');
      }
      
      // Fallback to localStorage if API doesn't return data
      if (connectors.length === 0) {
        const savedConnectors = localStorage.getItem(`sharedlm_connectors_${userId}`);
        if (savedConnectors) {
          connectors = JSON.parse(savedConnectors);
        }
      }
      
      setUserConnectors(connectors);
    } catch (error) {
      console.error('Failed to load connectors:', error);
    } finally {
      setLoadingConnectors(false);
    }
  }, [userId]);

  // Listen for storage events to refresh when connectors are added from modal
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === `sharedlm_connectors_${userId}` && activeTab === 'connectors') {
        loadUserConnectors();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom events (since storage events don't fire in same tab)
    window.addEventListener('connectorUpdated', loadUserConnectors);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('connectorUpdated', loadUserConnectors);
    };
  }, [activeTab, userId, loadUserConnectors]);

  // Update last updated time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated('just now');
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Load API keys from database
  const loadApiKeys = useCallback(async () => {
    try {
      setLoadingApiKeys(true);
      
      const [keys, integrations] = await Promise.all([
        apiService.getApiKeys(userId),
        apiService.getCustomIntegrations(userId)
      ]);
      
      setCustomIntegrations(integrations);
      
      const keyState = {
        openai: { value: '', visible: false, saved: false, preview: '' },
        anthropic: { value: '', visible: false, saved: false, preview: '' },
        mistral: { value: '', visible: false, saved: false, preview: '' }
      };

      integrations.forEach(int => {
        keyState[int.provider_id] = { value: '', visible: false, saved: false, preview: '' };
      });

      keys.forEach(key => {
        if (keyState[key.provider]) {
          keyState[key.provider] = {
            value: '',
            visible: false,
            saved: true,
            preview: key.key_preview
          };
        }
      });

      setApiKeys(keyState);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoadingApiKeys(false);
    }
  }, [userId]);

  // Load API keys on mount and when switching to API keys tab
  useEffect(() => {
    if (activeTab === 'api-keys') {
      loadApiKeys();
    }
  }, [activeTab, loadApiKeys]);

  // Load connectors on mount and when switching to connectors tab
  useEffect(() => {
    if (activeTab === 'connectors') {
      loadUserConnectors();
    }
  }, [activeTab, loadUserConnectors]);

  const handleRemoveConnector = async (connectorId) => {
    try {
      // Try API first
      try {
        if (apiService.removeUserConnector) {
          await apiService.removeUserConnector(userId, connectorId);
        }
      } catch (apiError) {
        console.log('API not available, using localStorage');
      }
      
      // Update localStorage
      const savedConnectors = localStorage.getItem(`sharedlm_connectors_${userId}`);
      if (savedConnectors) {
        const connectors = JSON.parse(savedConnectors);
        const updated = connectors.filter(c => (c.connector_id || c.id) !== connectorId);
        localStorage.setItem(`sharedlm_connectors_${userId}`, JSON.stringify(updated));
      }
      
      await loadUserConnectors();
      notify.success('Connector removed');
    } catch (error) {
      console.error('Failed to remove connector:', error);
      notify.error('Failed to remove connector');
    }
  };

  const handleLogoutAllDevices = async () => {
    const confirmed = await notify.confirm({
      title: 'Log out of all devices',
      message: 'Are you sure you want to log out of all devices? You will need to log in again on all devices.',
      confirmText: 'Log out',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      localStorage.removeItem('sharedlm_user_id');
      localStorage.removeItem('sharedlm_user_email');
      localStorage.removeItem('sharedlm_user_name');
      localStorage.removeItem('sharedlm_session');
      localStorage.removeItem('sharedlm_api_openai');
      localStorage.removeItem('sharedlm_api_anthropic');
      localStorage.removeItem('sharedlm_api_mistral');
      notify.success('Logged out of all devices successfully');
      navigate('/login');
    }
  };

  // Check if name fields have changed
  useEffect(() => {
    const hasChanges = fullName !== originalFullName || claudeCallName !== originalCallName;
    setShowNameSaveButtons(hasChanges);
  }, [fullName, claudeCallName, originalFullName, originalCallName]);

  // Handle save name changes
  const handleSaveNameChanges = () => {
    // Save full name
    const trimmedFullName = fullName.trim();
    localStorage.setItem('sharedlm_full_name', trimmedFullName);
    
    // Save call name and use it as the primary display name
    const newCallName = claudeCallName.trim() || trimmedFullName;
    localStorage.setItem('sharedlm_user_name', newCallName);
    
    // Update original values
    setOriginalFullName(trimmedFullName);
    setOriginalCallName(claudeCallName.trim());
    
    // Hide save buttons
    setShowNameSaveButtons(false);
    
    notify.success('Name updated successfully');
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('userNameUpdated', { 
      detail: { 
        fullName: trimmedFullName, 
        displayName: newCallName 
      } 
    }));
  };

  // Handle cancel name changes
  const handleCancelNameChanges = () => {
    setFullName(originalFullName);
    setClaudeCallName(originalCallName);
    setShowNameSaveButtons(false);
  };

  // API Keys Handlers
  const toggleApiKeyVisibility = (provider) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: { ...prev[provider], visible: !prev[provider].visible }
    }));
  };

  const handleApiKeyChange = (provider, value) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: { ...prev[provider], value: value }
    }));
  };

  const handleSaveApiKey = async (provider) => {
    const key = apiKeys[provider].value.trim();
    
    if (!key) {
      notify.error('API key cannot be empty');
      return;
    }

    // Validate key format
    if (provider === 'openai' && !key.startsWith('sk-')) {
      notify.error('Invalid OpenAI API key format (must start with sk-)');
      return;
    }
    if (provider === 'anthropic' && !key.startsWith('sk-ant-')) {
      notify.error('Invalid Anthropic API key format (must start with sk-ant-)');
      return;
    }

    try {
      // Save to database
      const result = await apiService.saveApiKey(
        userId,
        provider,
        key,
        `${provider.toUpperCase()} API Key`
      );

      if (result.success) {
        // Also save to localStorage for quick access
        localStorage.setItem(`sharedlm_api_${provider}`, key);
        
        // Reload keys to get updated state
        await loadApiKeys();
        
        // Clear input
        setApiKeys(prev => ({
          ...prev,
          [provider]: { ...prev[provider], value: '' }
        }));

        notify.success(`${provider.toUpperCase()} API key saved successfully`);
      }
    } catch (error) {
      notify.error(error.message || 'Failed to save API key');
    }
  };

  const handleRemoveApiKey = async (provider) => {
    const customIntegration = customIntegrations.find(int => int.provider_id === provider);
    const providerName = customIntegration ? customIntegration.name : provider.toUpperCase();

    const confirmed = await notify.confirm({
      title: 'Remove API Key',
      message: `Remove ${providerName} API key? You won't be able to use this model until you add a new key.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      try {
        await apiService.deleteApiKey(userId, provider);
        
        localStorage.removeItem(`sharedlm_api_${provider}`);
        
        await loadApiKeys();
        
        notify.success(`${providerName} API key removed`);
      } catch (error) {
        notify.error(error.message || 'Failed to remove API key');
      }
    }
  };

  const handleTestConnection = async (provider) => {
    if (!apiKeys[provider].saved) {
      notify.error('Please save the API key first');
      return;
    }

    const customIntegration = customIntegrations.find(int => int.provider_id === provider);
    const providerName = customIntegration ? customIntegration.name : provider.toUpperCase();

    try {
      notify.info(`Testing ${providerName} connection...`);
      
      const result = await apiService.testApiKey(userId, provider);
      
      if (result.success) {
        notify.success(`${providerName} connection successful`);
      }
    } catch (error) {
      notify.error(error.message || `${providerName} connection failed`);
    }
  };


  return (
    <motion.div 
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="page-content">
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="page-title">SETTINGS</h1>
          <p className="page-subtitle">Customize your SharedLM experience</p>
        </motion.div>

        <div className="settings-layout">
          <motion.div 
            className="settings-nav"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {settingsTabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </motion.div>

          <motion.div 
            className="settings-content-wrapper"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            key={activeTab}
          >
            <div className="settings-content">
              {activeTab === 'general' && (
                <motion.div 
                  className="settings-section"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Full Name and SharedLM Call Name in single row */}
                  <div className="setting-item setting-item-row">
                    <div className="setting-field-group">
                      <div className="setting-info">
                        <label className="setting-label">Full name</label>
                      </div>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="setting-input"
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="setting-field-group">
                      <div className="setting-info">
                        <label className="setting-label">What should we call you?</label>
                      </div>
                      <input 
                        type="text" 
                        value={claudeCallName}
                        onChange={(e) => setClaudeCallName(e.target.value)}
                        className="setting-input"
                        placeholder="Enter name"
                      />
                    </div>
                  </div>

                  {/* Save/Cancel buttons for name changes */}
                  {showNameSaveButtons && (
                    <div className="name-actions">
                      <button 
                        className="button-base button-secondary"
                        onClick={handleCancelNameChanges}
                      >
                        CANCEL
                      </button>
                      <button 
                        className="button-base button-primary"
                        onClick={handleSaveNameChanges}
                        disabled={!claudeCallName.trim() && !fullName.trim()}
                      >
                        SAVE CHANGES
                      </button>
                    </div>
                  )}

                  {/* What best describes your work? */}
                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">What best describes your work?</label>
                    </div>
                    <CustomDropdown
                      value={workDescription}
                      onChange={setWorkDescription}
                      options={[
                        { value: 'software', label: 'Software Development' },
                        { value: 'design', label: 'Design' },
                        { value: 'writing', label: 'Writing' },
                        { value: 'research', label: 'Research' },
                        { value: 'education', label: 'Education' },
                        { value: 'business', label: 'Business' },
                        { value: 'other', label: 'Other' }
                      ]}
                    />
                  </div>

                  {/* Notifications Section */}
                  <div className="settings-subsection">
                    <h4 className="subsection-title">NOTIFICATIONS</h4>
                    
                    <div className="setting-item">
                      <div className="setting-info">
                        <label className="setting-label">Response completions</label>
                        <p className="setting-description">
                          Get notified when SharedLM has finished a response. Most useful for long-running tasks like tool calls and Research.
                        </p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={responseCompletions}
                          onChange={(e) => {
                            setResponseCompletions(e.target.checked);
                            notify.success(e.target.checked ? 'Response completions enabled' : 'Response completions disabled');
                          }}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  {/* Analytics Page Toggle */}
                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Analytics Page</label>
                      <p className="setting-description">Enable or disable analytics dashboard</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={analyticsEnabled}
                        onChange={(e) => {
                          setAnalyticsEnabled(e.target.checked);
                          notify.success(e.target.checked ? 'Analytics enabled' : 'Analytics disabled');
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </motion.div>
              )}

              {activeTab === 'account' && (
                <motion.div 
                  className="settings-section"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="section-title">Account</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Log out of all devices</label>
                    </div>
                    <button 
                      className="button-base button-secondary account-action-btn"
                      onClick={handleLogoutAllDevices}
                    >
                      Log out
                    </button>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Delete account</label>
                      <p className="setting-description">Please contact your administrator to deprovision your account.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'usage' && (
                <motion.div 
                  className="settings-section"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="section-title">YOUR USAGE LIMITS</h3>
                  
                  <div className="usage-section">
                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">Current session</label>
                        <span className="usage-percentage">{usageData.currentSession.percentage}% used</span>
                      </div>
                      <p className="usage-description">Starts when a message is sent</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.currentSession.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">OpenAI</label>
                        <span className="usage-percentage">{usageData.openai.percentage}% used</span>
                      </div>
                      <p className="usage-description">OpenAI API usage</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.openai.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">Anthropic</label>
                        <span className="usage-percentage">{usageData.anthropic.percentage}% used</span>
                      </div>
                      <p className="usage-description">Anthropic API usage</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.anthropic.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">Mistral</label>
                        <span className="usage-percentage">{usageData.mistral.percentage}% used</span>
                      </div>
                      <p className="usage-description">Mistral API usage</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.mistral.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="usage-updated">
                      <RefreshCw size={14} />
                      <span>Last updated: {lastUpdated}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'capabilities' && (
                <motion.div 
                  className="settings-section"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="section-title">Capabilities</h3>
                  <p className="section-description">Control which capabilities SharedLM uses in your conversations.</p>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Artifacts</label>
                        <p className="setting-description">
                        Ask SharedLM to generate content like code snippets, text documents, or website designs, and SharedLM will create an Artifact that appears in a dedicated window alongside your conversation.
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={artifactsEnabled}
                        onChange={(e) => setArtifactsEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Code execution and file creation</label>
                        <p className="setting-description">
                        SharedLM can execute code and create and edit docs, spreadsheets, presentations, PDFs, and data reports.
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={codeExecutionEnabled}
                        onChange={(e) => setCodeExecutionEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Location metadata</label>
                        <p className="setting-description">
                        Allow SharedLM to use coarse location metadata (city/region) to improve product experiences. <button type="button" onClick={(e) => { e.preventDefault(); }} className="link-text" style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Learn more</button>.
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={locationMetadataEnabled}
                        onChange={(e) => setLocationMetadataEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="settings-subsection">
                    <h4 className="subsection-title">Memory</h4>
                    
                    <div className="setting-item">
                      <div className="setting-info">
                        <label className="setting-label">Search and reference chats</label>
                        <p className="setting-description">
                          Allow SharedLM to search for relevant details in past chats. <button type="button" onClick={(e) => { e.preventDefault(); }} className="link-text" style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Learn more</button>.
                        </p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox"
                          checked={searchReferenceChatsEnabled}
                          onChange={(e) => setSearchReferenceChatsEnabled(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="setting-item no-divider">
                      <div className="setting-info">
                        <label className="setting-label">Generate memory from chat history</label>
                        <p className="setting-description">
                          Allow SharedLM to remember relevant context from your chats. This setting controls memory for both chats and projects. <button type="button" onClick={(e) => { e.preventDefault(); }} className="link-text" style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Learn more</button>.
                        </p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox"
                          checked={generateMemoryFromHistoryEnabled}
                          onChange={(e) => setGenerateMemoryFromHistoryEnabled(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="memory-card">
                      <div className="memory-text">{memoryText}</div>
                      <div className="memory-info">
                        <div className="memory-label">Memory from your chats</div>
                        <div className="memory-updated">Updated {memoryUpdated} from your chats</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'connectors' && (
                <motion.div 
                  className="settings-section"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="connectors-section-header">
                    <div>
                      <h3 className="section-title">Connectors</h3>
                      <p className="section-description">Allow SharedLM to reference other apps and services for more context.</p>
                    </div>
                    <button
                      className="connectors-add-btn"
                      onClick={() => setShowConnectorsModal(true)}
                    >
                      <Plus size={16} />
                      Add connectors
                    </button>
                  </div>
                  
                  {loadingConnectors ? (
                    <div className="connectors-loading">
                      <p>Loading connectors...</p>
                    </div>
                  ) : userConnectors.length === 0 ? (
                    <div className="connectors-empty">
                      <p>No connectors added yet</p>
                      <p className="connectors-empty-hint">Click "Add connectors" above to add connectors</p>
                    </div>
                  ) : (
                    <div className="connectors-list">
                      {userConnectors.map((connector) => (
                        <div key={connector.id || connector.connector_id} className="connector-item">
                          <div className="connector-item-info">
                            <h4 className="connector-item-name">{connector.name || connector.connector_id}</h4>
                            <p className="connector-item-description">
                              {connector.description || `Connector: ${connector.connector_id}`}
                            </p>
                          </div>
                          <button
                            className="connector-remove-btn"
                            onClick={() => handleRemoveConnector(connector.id || connector.connector_id)}
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'api-keys' && (
                <motion.div 
                  className="settings-section"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="section-title">API INTEGRATIONS</h3>
                  
                  {loadingApiKeys ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666666' }}>
                      Loading API keys...
                    </div>
                  ) : (
                    <>
                      {/* OpenAI API Key */}
                      <div className="api-key-section">
                        <div className="api-key-header">
                          <div className="api-key-info">
                            <label className="setting-label">OpenAI API Key</label>
                            <p className="setting-description">
                              {apiKeys.openai.saved 
                                ? `Saved key: ${apiKeys.openai.preview}`
                                : 'Your OpenAI API credentials (starts with sk-)'}
                            </p>
                          </div>
                          {apiKeys.openai.saved && (
                            <span className="api-key-badge">SAVED</span>
                          )}
                        </div>
                        
                        {!apiKeys.openai.saved && (
                          <div className="api-key-input-group">
                            <input 
                              type={apiKeys.openai.visible ? "text" : "password"}
                              value={apiKeys.openai.value}
                              onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                              placeholder="sk-..."
                              className="setting-input api-key-input"
                            />
                            <button 
                              className="api-key-toggle-btn"
                              onClick={() => toggleApiKeyVisibility('openai')}
                            >
                              {apiKeys.openai.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        )}

                        <div className="api-key-actions">
                          {!apiKeys.openai.saved ? (
                            <button 
                              className="button-base button-primary"
                              onClick={() => handleSaveApiKey('openai')}
                              disabled={!apiKeys.openai.value.trim()}
                            >
                              SAVE KEY
                            </button>
                          ) : (
                            <>
                              <button 
                                className="button-base button-secondary"
                                onClick={() => handleTestConnection('openai')}
                              >
                                TEST
                              </button>
                              <button 
                                className="button-base button-danger"
                                onClick={() => handleRemoveApiKey('openai')}
                              >
                                REMOVE
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Anthropic API Key */}
                      <div className="api-key-section">
                        <div className="api-key-header">
                          <div className="api-key-info">
                            <label className="setting-label">Anthropic API Key</label>
                            <p className="setting-description">
                              {apiKeys.anthropic.saved 
                                ? `Saved key: ${apiKeys.anthropic.preview}`
                                : 'Your Anthropic API credentials (starts with sk-ant-)'}
                            </p>
                          </div>
                          {apiKeys.anthropic.saved && (
                            <span className="api-key-badge">SAVED</span>
                          )}
                        </div>
                        
                        {!apiKeys.anthropic.saved && (
                          <div className="api-key-input-group">
                            <input 
                              type={apiKeys.anthropic.visible ? "text" : "password"}
                              value={apiKeys.anthropic.value}
                              onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                              placeholder="sk-ant-..."
                              className="setting-input api-key-input"
                            />
                            <button 
                              className="api-key-toggle-btn"
                              onClick={() => toggleApiKeyVisibility('anthropic')}
                            >
                              {apiKeys.anthropic.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        )}

                        <div className="api-key-actions">
                          {!apiKeys.anthropic.saved ? (
                            <button 
                              className="button-base button-primary"
                              onClick={() => handleSaveApiKey('anthropic')}
                              disabled={!apiKeys.anthropic.value.trim()}
                            >
                              SAVE KEY
                            </button>
                          ) : (
                            <>
                              <button 
                                className="button-base button-secondary"
                                onClick={() => handleTestConnection('anthropic')}
                              >
                                TEST
                              </button>
                              <button 
                                className="button-base button-danger"
                                onClick={() => handleRemoveApiKey('anthropic')}
                              >
                                REMOVE
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mistral API Key */}
                      <div className="api-key-section">
                        <div className="api-key-header">
                          <div className="api-key-info">
                            <label className="setting-label">Mistral AI API Key</label>
                            <p className="setting-description">
                              {apiKeys.mistral.saved 
                                ? `Saved key: ${apiKeys.mistral.preview}`
                                : 'Your Mistral AI API credentials'}
                            </p>
                          </div>
                          {apiKeys.mistral.saved && (
                            <span className="api-key-badge">SAVED</span>
                          )}
                        </div>
                        
                        {!apiKeys.mistral.saved && (
                          <div className="api-key-input-group">
                            <input 
                              type={apiKeys.mistral.visible ? "text" : "password"}
                              value={apiKeys.mistral.value}
                              onChange={(e) => handleApiKeyChange('mistral', e.target.value)}
                              placeholder="Enter Mistral API key..."
                              className="setting-input api-key-input"
                            />
                            <button 
                              className="api-key-toggle-btn"
                              onClick={() => toggleApiKeyVisibility('mistral')}
                            >
                              {apiKeys.mistral.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        )}

                        <div className="api-key-actions">
                          {!apiKeys.mistral.saved ? (
                            <button 
                              className="button-base button-primary"
                              onClick={() => handleSaveApiKey('mistral')}
                              disabled={!apiKeys.mistral.value.trim()}
                            >
                              SAVE KEY
                            </button>
                          ) : (
                            <>
                              <button 
                                className="button-base button-secondary"
                                onClick={() => handleTestConnection('mistral')}
                              >
                                TEST
                              </button>
                              <button 
                                className="button-base button-danger"
                                onClick={() => handleRemoveApiKey('mistral')}
                              >
                                REMOVE
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {Object.keys(apiKeys)
                        .filter(key => key.startsWith('custom_'))
                        .map(customKey => {
                          const customIntegration = customIntegrations.find(
                            int => int.provider_id === customKey
                          );
                          
                          if (!customIntegration) return null;

                          return (
                            <div key={customKey} className="api-key-section">
                              <div className="api-key-header">
                                <div className="api-key-info">
                                  <label className="setting-label">{customIntegration.name} API Key</label>
                                  <p className="setting-description">
                                    {apiKeys[customKey].saved 
                                      ? `Saved key: ${apiKeys[customKey].preview}`
                                      : `Your ${customIntegration.name} API credentials`}
                                  </p>
                                </div>
                                {apiKeys[customKey].saved && (
                                  <span className="api-key-badge">SAVED</span>
                                )}
                              </div>
                              
                              {!apiKeys[customKey].saved && (
                                <div className="api-key-input-group">
                                  <input 
                                    type={apiKeys[customKey].visible ? "text" : "password"}
                                    value={apiKeys[customKey].value}
                                    onChange={(e) => handleApiKeyChange(customKey, e.target.value)}
                                    placeholder="Enter API key..."
                                    className="setting-input api-key-input"
                                  />
                                  <button 
                                    className="api-key-toggle-btn"
                                    onClick={() => toggleApiKeyVisibility(customKey)}
                                  >
                                    {apiKeys[customKey].visible ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              )}

                              <div className="api-key-actions">
                                {!apiKeys[customKey].saved ? (
                                  <button 
                                    className="button-base button-primary"
                                    onClick={() => handleSaveApiKey(customKey)}
                                    disabled={!apiKeys[customKey].value.trim()}
                                  >
                                    SAVE KEY
                                  </button>
                                ) : (
                                  <>
                                    <button 
                                      className="button-base button-secondary"
                                      onClick={() => handleTestConnection(customKey)}
                                    >
                                      TEST
                                    </button>
                                    <button 
                                      className="button-base button-danger"
                                      onClick={() => handleRemoveApiKey(customKey)}
                                    >
                                      REMOVE
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}

                      <div className="api-hint-section">
                        <p className="api-hint">
                          <strong>Note:</strong> Your API keys are encrypted and stored securely in the database. They are never shared with third parties. Get your API keys from the respective provider dashboards.
                        </p>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <ConnectorsModal
        isOpen={showConnectorsModal}
        onClose={() => setShowConnectorsModal(false)}
        onConnectorAdded={(connector) => {
          // Reload connectors when one is added
          loadUserConnectors();
        }}
      />
    </motion.div>
  );
}

export default SettingsPage;