import React, { useState, useEffect, useCallback } from 'react';
import { Settings, User, BarChart3, Brain, Link, RefreshCw, Zap, Eye, EyeOff, Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import ConnectorsModal from '../../components/ConnectorsModal/ConnectorsModal';
import ApiKeysModal from '../../components/ApiKeysModal/ApiKeysModal';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../services/api';
import { clearAuth } from '../../utils/auth';
import { logEvent, EventType, LogLevel } from '../../utils/auditLogger';
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
  const [usageData, setUsageData] = useState({
    currentSession: { percentage: 0, limit: 100, used: 0 },
    openai: { percentage: 0, limit: 100, used: 0 },
    anthropic: { percentage: 0, limit: 100, used: 0 },
    mistral: { percentage: 0, limit: 100, used: 0 }
  });
  const [lastUpdated, setLastUpdated] = useState('just now');
  const [loadingUsage, setLoadingUsage] = useState(false);

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
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editKeyValue, setEditKeyValue] = useState('');
  const [visibleKeys, setVisibleKeys] = useState({});
  const [fullApiKeys, setFullApiKeys] = useState({});

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

  // Load usage data
  const loadUsageData = useCallback(async () => {
    try {
      setLoadingUsage(true);
      
      // Get current session usage from sessionStorage
      const sessionStartTime = sessionStorage.getItem('sharedlm_session_start');
      const sessionMessages = parseInt(sessionStorage.getItem('sharedlm_session_messages') || '0');
      const currentTime = Date.now();
      
      // Calculate session usage (assuming 100 messages per session limit)
      const sessionLimit = 100;
      const sessionUsed = sessionMessages;
      const sessionPercentage = Math.min((sessionUsed / sessionLimit) * 100, 100);
      
      // Load custom integrations if not already loaded
      let integrations = customIntegrations;
      if (integrations.length === 0) {
        try {
          integrations = await apiService.getCustomIntegrations(userId) || [];
        } catch (e) {
          console.error('Failed to load custom integrations for usage:', e);
          integrations = [];
        }
      }
      
      // Get provider usage from localStorage or API
      // Initialize with default values
      const usage = {
        currentSession: { 
          percentage: sessionPercentage, 
          limit: sessionLimit, 
          used: sessionUsed 
        },
        openai: { percentage: 0, limit: 100, used: 0 },
        anthropic: { percentage: 0, limit: 100, used: 0 },
        mistral: { percentage: 0, limit: 100, used: 0 }
      };
      
      // Load provider-specific usage from localStorage
      // This tracks usage per provider across sessions
      const providers = ['openai', 'anthropic', 'mistral'];
      providers.forEach(provider => {
        const providerUsage = localStorage.getItem(`sharedlm_usage_${provider}_${userId}`);
        if (providerUsage) {
          try {
            const parsed = JSON.parse(providerUsage);
            const limit = parsed.limit || 100;
            const used = parsed.used || 0;
            usage[provider] = {
              percentage: Math.min((used / limit) * 100, 100),
              limit: limit,
              used: used
            };
          } catch (e) {
            console.error(`Failed to parse usage for ${provider}:`, e);
          }
        }
      });
      
      // Load custom integrations usage
      integrations.forEach(integration => {
        const providerId = integration.provider_id;
        const providerUsage = localStorage.getItem(`sharedlm_usage_${providerId}_${userId}`);
        if (providerUsage) {
          try {
            const parsed = JSON.parse(providerUsage);
            const limit = parsed.limit || 100;
            const used = parsed.used || 0;
            usage[providerId] = {
              percentage: Math.min((used / limit) * 100, 100),
              limit: limit,
              used: used
            };
          } catch (e) {
            console.error(`Failed to parse usage for ${providerId}:`, e);
          }
        } else {
          // Initialize if not exists
          usage[providerId] = {
            percentage: 0,
            limit: 100,
            used: 0
          };
        }
      });
      
      // TODO: In the future, fetch real usage from backend API endpoint
      // For now, we track usage locally based on message counts
      
      setUsageData(usage);

  // Update last updated time
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastUpdated(timeStr);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoadingUsage(false);
    }
  }, [userId, customIntegrations]);

  // Load usage data when usage tab is opened (after API keys are loaded)
  useEffect(() => {
    if (activeTab === 'usage') {
      // Only load usage data after API keys have finished loading
      if (!loadingApiKeys) {
        loadUsageData();
      }
      
      // Refresh usage data every 30 seconds when on usage tab (only if not loading)
    const interval = setInterval(() => {
        if (!loadingApiKeys) {
          loadUsageData();
        }
      }, 30000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [activeTab, loadUsageData, loadingApiKeys, apiKeys]);

  // Listen for message events to update usage in real-time
  // This should work regardless of which tab is active
  useEffect(() => {
    const handleMessageSent = (event) => {
      // Update current session usage
      const sessionMessages = parseInt(sessionStorage.getItem('sharedlm_session_messages') || '0') + 1;
      sessionStorage.setItem('sharedlm_session_messages', sessionMessages.toString());
      
      // Update provider usage if provider is specified in event
      if (event.detail?.provider) {
        const provider = event.detail.provider;
        const providerUsageKey = `sharedlm_usage_${provider}_${userId}`;
        const currentUsage = localStorage.getItem(providerUsageKey);
        
        if (currentUsage) {
          try {
            const parsed = JSON.parse(currentUsage);
            parsed.used = (parsed.used || 0) + 1;
            localStorage.setItem(providerUsageKey, JSON.stringify(parsed));
          } catch (e) {
            console.error(`Failed to update usage for ${provider}:`, e);
          }
        } else {
          // Initialize usage for provider
          localStorage.setItem(providerUsageKey, JSON.stringify({
            used: 1,
            limit: 100
          }));
        }
      }
      
      // Reload usage data if on usage tab
      if (activeTab === 'usage') {
        loadUsageData();
      }
    };
    
    window.addEventListener('messageSent', handleMessageSent);
    
    // Initialize session start time if not set
    if (!sessionStorage.getItem('sharedlm_session_start')) {
      sessionStorage.setItem('sharedlm_session_start', Date.now().toString());
      sessionStorage.setItem('sharedlm_session_messages', '0');
    }
    
    return () => {
      window.removeEventListener('messageSent', handleMessageSent);
    };
  }, [activeTab, userId, loadUsageData]);

  // Load API keys from database
  const loadApiKeys = useCallback(async () => {
    try {
      setLoadingApiKeys(true);
      
      const [keys, integrations] = await Promise.all([
        apiService.getApiKeys(userId),
        apiService.getCustomIntegrations(userId)
      ]);
      
      setCustomIntegrations(integrations);
      
      // Initialize keyState with all standard providers
      const keyState = {
        openai: { value: '', visible: false, saved: false, preview: '' },
        anthropic: { value: '', visible: false, saved: false, preview: '' },
        mistral: { value: '', visible: false, saved: false, preview: '' },
        inception: { value: '', visible: false, saved: false, preview: '' }
      };

      // Add custom integrations to keyState
      integrations.forEach(int => {
        keyState[int.provider_id] = { value: '', visible: false, saved: false, preview: '' };
      });

      // Process all keys from database - this will include any keys the user has added
      keys.forEach(key => {
        // Initialize provider in keyState if it doesn't exist (for any provider)
        if (!keyState[key.provider]) {
          keyState[key.provider] = { value: '', visible: false, saved: false, preview: '' };
        }
        
        // Only set saved to true if the key exists and is active
        if (key.is_active !== false) {
          keyState[key.provider] = {
            value: '',
            visible: false,
            saved: true,
            preview: key.key_preview
          };
        }
      });

      // Ensure all standard providers that weren't found in keys are explicitly set to saved: false
      // This is important to prevent showing providers that don't have keys
      ['openai', 'anthropic', 'mistral', 'inception'].forEach(provider => {
        if (!keys.find(k => k.provider === provider)) {
          keyState[provider] = {
            ...keyState[provider],
            saved: false
          };
        }
      });
      
      // Log all keys found for debugging
      console.log('[SettingsPage] Loaded API keys:', keys.map(k => ({ provider: k.provider, is_active: k.is_active, preview: k.key_preview })));
      console.log('[SettingsPage] KeyState after processing:', Object.keys(keyState).map(k => ({ provider: k, saved: keyState[k].saved })));

      setApiKeys(keyState);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      // On error, ensure all providers are set to saved: false to prevent showing unlinked providers
      setApiKeys({
        openai: { value: '', visible: false, saved: false, preview: '' },
        anthropic: { value: '', visible: false, saved: false, preview: '' },
        mistral: { value: '', visible: false, saved: false, preview: '' },
        inception: { value: '', visible: false, saved: false, preview: '' }
      });
    } finally {
      setLoadingApiKeys(false);
    }
  }, [userId]);

  // Load API keys on mount and when switching to API keys tab or usage tab
  useEffect(() => {
    if (activeTab === 'api-keys' || activeTab === 'usage') {
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
      // Log logout event
      logEvent(EventType.LOGOUT, LogLevel.INFO, 'User logged out', { userId });
      
      // Use auth utility to clear all auth data
      clearAuth();
      
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
        // DO NOT save API keys to localStorage - they should only be in the backend
        // localStorage is vulnerable to XSS attacks
        // API keys are stored securely in the backend database
        
        // Log API key save event
        logEvent(EventType.API_KEY_SAVED, LogLevel.INFO, 'API key saved', {
          userId,
          provider
        });
        
        // Reload keys to get updated state
        await loadApiKeys();
        
        // Clear input
        setApiKeys(prev => ({
          ...prev,
          [provider]: { ...prev[provider], value: '' }
        }));

        // Dispatch event to notify other components (like ChatPage) that models changed
        window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
          detail: { provider, action: 'added' }
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
        
        // Log API key deletion event
        logEvent(EventType.API_KEY_DELETED, LogLevel.INFO, 'API key deleted', {
          userId,
          provider
        });
        
        // Remove from localStorage if it exists (cleanup)
        localStorage.removeItem(`sharedlm_api_${provider}`);
        
        await loadApiKeys();
        
        // Dispatch event to notify other components (like ChatPage) that models changed
        window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
          detail: { provider, action: 'removed' }
        }));
        
        notify.success(`${providerName} API key removed`);
      } catch (error) {
        notify.error(error.message || 'Failed to remove API key');
      }
    }
  };

  const handleEditApiKey = (provider) => {
    const isCustom = provider.startsWith('custom_');
    
    if (isCustom) {
      // For custom integrations, navigate to edit page with integration data
      const customIntegration = customIntegrations.find(int => int.provider_id === provider);
      if (customIntegration) {
        navigate('/add-custom-integration', {
          state: { 
            integration: customIntegration,
            editingApiKey: true,
            fromSettings: true
          }
        });
      }
    } else {
      // For standard API keys, show edit modal/form
      setEditingKey(provider);
      setEditKeyValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditKeyValue('');
    // Hide any visible keys when canceling edit
    setVisibleKeys({});
  };

  const handleSaveEditApiKey = async (provider) => {
    const key = editKeyValue.trim();
    
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
      // Save to database (this will update the existing key)
      const result = await apiService.saveApiKey(
        userId,
        provider,
        key,
        `${provider.toUpperCase()} API Key`
      );

      if (result.success) {
        // Log API key update event
        logEvent(EventType.API_KEY_SAVED, LogLevel.INFO, 'API key updated', {
          userId,
          provider
        });
        
        // Reload keys to get updated state
        await loadApiKeys();
        
        // Clear edit state
        setEditingKey(null);
        setEditKeyValue('');

        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
          detail: { provider, action: 'updated' }
        }));

        const customIntegration = customIntegrations.find(int => int.provider_id === provider);
        const providerName = customIntegration ? customIntegration.name : provider.toUpperCase();
        notify.success(`${providerName} API key updated successfully`);
      }
    } catch (error) {
      notify.error(error.message || 'Failed to update API key');
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
    <div className="page-container">
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
                  
                  {loadingUsage || loadingApiKeys ? (
                    <div className="usage-loading" style={{ textAlign: 'center', padding: '40px', color: '#666666' }}>
                      Loading usage data...
                    </div>
                  ) : (
                  <div className="usage-section">
                      {/* Current Session - Always show */}
                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">Current session</label>
                          <span className="usage-percentage">{Math.round(usageData.currentSession.percentage)}% used</span>
                      </div>
                      <p className="usage-description">Starts when a message is sent</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.currentSession.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                      {/* Only show providers that have saved API keys */}
                      {/* Strictly check that saved is explicitly true (not just truthy) */}
                      {apiKeys.openai?.saved === true && (
                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">OpenAI</label>
                            <span className="usage-percentage">{Math.round(usageData.openai.percentage)}% used</span>
                      </div>
                      <p className="usage-description">OpenAI API usage</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.openai.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                      )}

                      {apiKeys.anthropic?.saved === true && (
                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">Anthropic</label>
                            <span className="usage-percentage">{Math.round(usageData.anthropic.percentage)}% used</span>
                      </div>
                      <p className="usage-description">Anthropic API usage</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.anthropic.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                      )}

                      {apiKeys.mistral?.saved === true && (
                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">Mistral</label>
                            <span className="usage-percentage">{Math.round(usageData.mistral.percentage)}% used</span>
                      </div>
                      <p className="usage-description">Mistral API usage</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.mistral.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                      )}

                      {apiKeys.inception?.saved === true && (
                    <div className="usage-item">
                      <div className="usage-header">
                        <label className="usage-label">Inception</label>
                            <span className="usage-percentage">{Math.round(usageData.inception?.percentage || 0)}% used</span>
                      </div>
                      <p className="usage-description">Inception API usage</p>
                      <div className="usage-progress-bar">
                        <div 
                          className="usage-progress-fill" 
                          style={{ width: `${usageData.inception?.percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                      )}

                      {/* Show custom integrations that have saved API keys */}
                      {Object.keys(apiKeys)
                        .filter(key => key.startsWith('custom_') && apiKeys[key]?.saved === true)
                        .map(customKey => {
                          const customIntegration = customIntegrations.find(
                            int => int.provider_id === customKey
                          );
                          
                          if (!customIntegration) return null;

                          const usage = usageData[customKey] || { percentage: 0, limit: 100, used: 0 };

                          return (
                            <div key={customKey} className="usage-item">
                              <div className="usage-header">
                                <label className="usage-label">{customIntegration.name}</label>
                                <span className="usage-percentage">{Math.round(usage.percentage)}% used</span>
                              </div>
                              <p className="usage-description">{customIntegration.name} API usage</p>
                              <div className="usage-progress-bar">
                                <div 
                                  className="usage-progress-fill" 
                                  style={{ width: `${usage.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}

                      {/* Show message if no providers are linked */}
                      {!loadingApiKeys && 
                       apiKeys.openai?.saved !== true && 
                       apiKeys.anthropic?.saved !== true && 
                       apiKeys.mistral?.saved !== true && 
                       apiKeys.inception?.saved !== true && 
                       Object.keys(apiKeys).filter(key => key.startsWith('custom_') && apiKeys[key]?.saved === true).length === 0 && (
                        <div className="usage-empty" style={{ textAlign: 'center', padding: '40px', color: '#666666' }}>
                          <p>No API keys linked. Add API keys in the API Keys section to track usage.</p>
                        </div>
                      )}

                    <div className="usage-updated">
                        <button 
                          onClick={loadUsageData}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            color: 'inherit',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                          title="Refresh usage data"
                        >
                      <RefreshCw size={14} />
                        </button>
                      <span>Last updated: {lastUpdated}</span>
                    </div>
                  </div>
                  )}
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
                  <div className="api-keys-section-header">
                    <div>
                  <h3 className="section-title">API INTEGRATIONS</h3>
                      <p className="section-description">Connect your AI model API keys to use them in conversations.</p>
                    </div>
                            <button 
                      className="api-keys-add-btn"
                      onClick={() => setShowApiKeysModal(true)}
                            >
                      <Plus size={16} />
                      Add API key
                            </button>
                          </div>
                  
                  {loadingApiKeys ? (
                    <div className="api-keys-loading">
                      <p>Loading API keys...</p>
                        </div>
                          ) : (
                            <>
                      {/* Show only saved API keys */}
                      {(() => {
                        const savedKeys = [];
                        
                        // Add standard providers if saved
                        if (apiKeys.openai?.saved === true) {
                          savedKeys.push({ provider: 'openai', name: 'OpenAI', preview: apiKeys.openai.preview });
                        }
                        if (apiKeys.anthropic?.saved === true) {
                          savedKeys.push({ provider: 'anthropic', name: 'Anthropic', preview: apiKeys.anthropic.preview });
                        }
                        if (apiKeys.mistral?.saved === true) {
                          savedKeys.push({ provider: 'mistral', name: 'Mistral AI', preview: apiKeys.mistral.preview });
                        }
                        if (apiKeys.inception?.saved === true) {
                          savedKeys.push({ provider: 'inception', name: 'Inception', preview: apiKeys.inception.preview });
                        }
                        
                        // Add custom integrations if saved
                        Object.keys(apiKeys)
                          .filter(key => key.startsWith('custom_') && apiKeys[key]?.saved === true)
                          .forEach(customKey => {
                          const customIntegration = customIntegrations.find(
                            int => int.provider_id === customKey
                          );
                            if (customIntegration) {
                              savedKeys.push({ 
                                provider: customKey, 
                                name: customIntegration.name, 
                                preview: apiKeys[customKey].preview 
                              });
                            }
                          });
                        
                        if (savedKeys.length === 0) {
                          return (
                            <div className="api-keys-empty">
                              <p>No API keys added yet</p>
                              <p className="api-keys-empty-hint">Click "Add API key" above to add API keys</p>
                            </div>
                          );
                        }

                          // Separate standard and custom keys
                          const standardKeys = savedKeys.filter(key => !key.provider.startsWith('custom_'));
                          const customKeys = savedKeys.filter(key => key.provider.startsWith('custom_'));
                          
                          return (
                          <div className="api-keys-list">
                            {/* Standard API Keys */}
                            {standardKeys.map((key) => {
                              const isEditing = editingKey === key.provider;
                              
                              return (
                              <div key={key.provider} className="api-key-item">
                                <div className="api-key-item-info">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h4 className="api-key-item-name">{key.name}</h4>
                                  </div>
                                  {isEditing ? (
                                    <div style={{ marginTop: '12px' }}>
                                      <p className="api-key-item-description" style={{ marginBottom: '8px' }}>
                                        Current key: {key.preview}
                                      </p>
                                      <input
                                        type="password"
                                        value={editKeyValue}
                                        onChange={(e) => setEditKeyValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && editKeyValue.trim()) {
                                            handleSaveEditApiKey(key.provider);
                                          } else if (e.key === 'Escape') {
                                            handleCancelEdit();
                                          }
                                        }}
                                        placeholder="Enter new API key..."
                                        className="input-base"
                                        style={{ marginBottom: '8px' }}
                                        autoFocus
                                      />
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                          className="button-base button-primary"
                                          onClick={() => handleSaveEditApiKey(key.provider)}
                                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                        >
                                          <Check size={14} style={{ marginRight: '4px' }} />
                                          Save
                                        </button>
                                        <button
                                          className="button-base button-secondary"
                                          onClick={handleCancelEdit}
                                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                        >
                                          <X size={14} style={{ marginRight: '4px' }} />
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <p className="api-key-item-description" style={{ margin: 0 }}>
                                        Saved key: {visibleKeys[key.provider] ? (fullApiKeys[key.provider] || key.preview) : key.preview}
                                      </p>
                                      <button
                                        onClick={async () => {
                                          if (!visibleKeys[key.provider]) {
                                            // Show the key - need to fetch it
                                            try {
                                              const fullKey = await apiService.getApiKeyValue(userId, key.provider);
                                              setFullApiKeys(prev => ({ ...prev, [key.provider]: fullKey }));
                                              setVisibleKeys(prev => ({ ...prev, [key.provider]: true }));
                                            } catch (error) {
                                              notify.error(error.message || 'Failed to retrieve API key');
                                            }
                                          } else {
                                            // Hide the key
                                            setVisibleKeys(prev => ({ ...prev, [key.provider]: false }));
                                          }
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          padding: '4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          color: '#888888',
                                          transition: 'color 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                                        onMouseLeave={(e) => e.target.style.color = '#888888'}
                                        title={visibleKeys[key.provider] ? 'Hide API key' : 'Show API key'}
                                      >
                                        {visibleKeys[key.provider] ? (
                                          <EyeOff size={16} />
                                        ) : (
                                          <Eye size={16} />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {!isEditing && (
                                  <div className="api-key-item-actions">
                                    <button 
                                      className="button-base button-secondary api-key-item-btn"
                                      onClick={() => handleTestConnection(key.provider)}
                                    >
                                      TEST
                                    </button>
                                    <button 
                                      className="button-base button-secondary api-key-item-btn"
                                      onClick={() => handleEditApiKey(key.provider)}
                                      style={{ marginRight: '8px' }}
                                    >
                                      <Edit2 size={16} />
                                      Edit
                                    </button>
                                    <button 
                                      className="button-base button-danger api-key-item-btn"
                                      onClick={() => handleRemoveApiKey(key.provider)}
                                    >
                                      <Trash2 size={16} />
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                              );
                            })}
                            
                            {/* Custom Integrations Section */}
                            {customKeys.length > 0 && (
                              <>
                                <div style={{
                                  marginTop: standardKeys.length > 0 ? '32px' : '0',
                                  marginBottom: '16px',
                                  paddingBottom: '8px',
                                  borderBottom: '1px solid #1F1F1F'
                                }}>
                                  <h3 style={{
                                    fontSize: '0.85rem',
                                    color: '#888888',
                                    fontWeight: 400,
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    margin: 0
                                  }}>
                                    CUSTOM
                                  </h3>
                                </div>
                                {customKeys.map((key) => {
                                  const isEditing = editingKey === key.provider;
                                  
                                  return (
                                  <div key={key.provider} className="api-key-item">
                                    <div className="api-key-item-info">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h4 className="api-key-item-name">{key.name}</h4>
                                      </div>
                                      {isEditing ? (
                                        <div style={{ marginTop: '12px' }}>
                                          <p className="api-key-item-description" style={{ marginBottom: '8px' }}>
                                            Current key: {key.preview}
                                          </p>
                                          <input
                                            type="password"
                                            value={editKeyValue}
                                            onChange={(e) => setEditKeyValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && editKeyValue.trim()) {
                                                handleSaveEditApiKey(key.provider);
                                              } else if (e.key === 'Escape') {
                                                handleCancelEdit();
                                              }
                                            }}
                                            placeholder="Enter new API key..."
                                            className="input-base"
                                            style={{ marginBottom: '8px' }}
                                            autoFocus
                                          />
                                          <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                              className="button-base button-primary"
                                              onClick={() => handleSaveEditApiKey(key.provider)}
                                              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                            >
                                              <Check size={14} style={{ marginRight: '4px' }} />
                                              Save
                                            </button>
                                            <button
                                              className="button-base button-secondary"
                                              onClick={handleCancelEdit}
                                              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                            >
                                              <X size={14} style={{ marginRight: '4px' }} />
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <p className="api-key-item-description" style={{ margin: 0 }}>
                                            Saved key: {visibleKeys[key.provider] ? (fullApiKeys[key.provider] || key.preview) : key.preview}
                                          </p>
                                          <button
                                            onClick={async () => {
                                              if (!visibleKeys[key.provider]) {
                                                // Show the key - need to fetch it
                                                try {
                                                  const fullKey = await apiService.getApiKeyValue(userId, key.provider);
                                                  setFullApiKeys(prev => ({ ...prev, [key.provider]: fullKey }));
                                                  setVisibleKeys(prev => ({ ...prev, [key.provider]: true }));
                                                } catch (error) {
                                                  notify.error(error.message || 'Failed to retrieve API key');
                                                }
                                              } else {
                                                // Hide the key
                                                setVisibleKeys(prev => ({ ...prev, [key.provider]: false }));
                                              }
                                            }}
                                            style={{
                                              background: 'transparent',
                                              border: 'none',
                                              cursor: 'pointer',
                                              padding: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              color: '#888888',
                                              transition: 'color 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                                            onMouseLeave={(e) => e.target.style.color = '#888888'}
                                            title={visibleKeys[key.provider] ? 'Hide API key' : 'Show API key'}
                                          >
                                            {visibleKeys[key.provider] ? (
                                              <EyeOff size={16} />
                                            ) : (
                                              <Eye size={16} />
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {!isEditing && (
                                      <div className="api-key-item-actions">
                                        <button 
                                          className="button-base button-secondary api-key-item-btn"
                                          onClick={() => handleTestConnection(key.provider)}
                                        >
                                          TEST
                                        </button>
                                        <button 
                                          className="button-base button-secondary api-key-item-btn"
                                          onClick={() => handleEditApiKey(key.provider)}
                                          style={{ marginRight: '8px' }}
                                        >
                                          <Edit2 size={16} />
                                          Edit
                                        </button>
                                        <button 
                                          className="button-base button-danger api-key-item-btn"
                                          onClick={() => handleRemoveApiKey(key.provider)}
                                        >
                                          <Trash2 size={16} />
                                          Remove
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                              </>
                            )}
                            </div>
                          );
                      })()}

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

      <ApiKeysModal
        isOpen={showApiKeysModal}
        onClose={() => setShowApiKeysModal(false)}
        onApiKeyAdded={() => {
          // Reload API keys when one is added
          loadApiKeys();
        }}
      />
    </div>
  );
}

export default SettingsPage;