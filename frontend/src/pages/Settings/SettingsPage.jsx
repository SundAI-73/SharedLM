import React, { useState, useEffect } from 'react';
import { Settings, User, Shield, Zap, LogOut, Eye, EyeOff, Copy, Lock } from 'lucide-react';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import './Settings.css';

function SettingsPage() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('general');
  const { analyticsEnabled, setAnalyticsEnabled, userId } = useUser();
  
  // Get user data from localStorage
  const [displayName, setDisplayName] = useState(localStorage.getItem('sharedlm_user_name') || '');
  const [tempDisplayName, setTempDisplayName] = useState(displayName);
  const userEmail = localStorage.getItem('sharedlm_user_email') || '';

  // General Settings State
  const [autoSave, setAutoSave] = useState(true);
  const [streamResponses, setStreamResponses] = useState(true);
  
  // Privacy Settings State
  const [dataCollection, setDataCollection] = useState(false);
  const [shareChatHistory, setShareChatHistory] = useState(false);
  const [memoryStorage, setMemoryStorage] = useState(true);

  // Change Password State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Two-Factor Authentication State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return localStorage.getItem('sharedlm_2fa_enabled') === 'true';
  });
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [secretKey, setSecretKey] = useState('');

  // API Keys State - Now loaded from database
  const [apiKeys, setApiKeys] = useState({
    openai: { value: '', visible: false, saved: false, preview: '' },
    anthropic: { value: '', visible: false, saved: false, preview: '' },
    mistral: { value: '', visible: false, saved: false, preview: '' }
  });
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);

  const settingsTabs = [
    { id: 'general', label: 'GENERAL', icon: <Settings size={18} /> },
    { id: 'account', label: 'ACCOUNT', icon: <User size={18} /> },
    { id: 'privacy', label: 'PRIVACY', icon: <Shield size={18} /> },
    { id: 'integrations', label: 'API KEYS', icon: <Zap size={18} /> }
  ];

  // Load API keys from database
  const loadApiKeys = async () => {
    try {
      setLoadingApiKeys(true);
      const keys = await apiService.getApiKeys(userId);
      
      const keyState = {
        openai: { value: '', visible: false, saved: false, preview: '' },
        anthropic: { value: '', visible: false, saved: false, preview: '' },
        mistral: { value: '', visible: false, saved: false, preview: '' }
      };

      keys.forEach(key => {
        if (keyState[key.provider]) {
          keyState[key.provider] = {
            value: '', // Don't load actual key for security
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
  };

  // Load API keys on mount and when switching to integrations tab
  useEffect(() => {
    loadApiKeys();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'integrations') {
      loadApiKeys();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    const confirmed = await notify.confirm({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
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
      notify.success('Logged out successfully');
      navigate('/login');
    }
  };

  const handleUpdateDisplayName = () => {
    if (tempDisplayName.trim()) {
      localStorage.setItem('sharedlm_user_name', tempDisplayName.trim());
      setDisplayName(tempDisplayName.trim());
      notify.success('Display name updated successfully');
    } else {
      notify.error('Display name cannot be empty');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await notify.confirm({
      title: 'Delete Account',
      message: 'This will permanently delete your account and all data. This action cannot be undone.',
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      notify.error('Account deletion is not yet implemented');
    }
  };

  const handleExportData = () => {
    notify.info('Data export feature coming soon');
  };

  const handleClearAllData = async () => {
    const confirmed = await notify.confirm({
      title: 'Clear All Data',
      message: 'This will delete all your conversations, projects, and memory. This action cannot be undone.',
      confirmText: 'Clear Data',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      notify.error('Data clearing is not yet implemented');
    }
  };

  // Change Password Handlers
  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      notify.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      notify.error('New password must be at least 8 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify.error('New passwords do not match');
      return;
    }

    try {
      const response = await apiService.changePassword(
        userId,
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowChangePassword(false);
        notify.success('Password changed successfully');
      }
    } catch (error) {
      notify.error(error.message || 'Failed to change password');
    }
  };

  // Two-Factor Authentication Handlers
  const handleToggle2FA = () => {
    if (twoFactorEnabled) {
      handleDisable2FA();
    } else {
      const newSecretKey = generateSecretKey();
      setSecretKey(newSecretKey);
      setShow2FASetup(true);
    }
  };

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleVerify2FA = () => {
    if (verificationCode.length === 6) {
      localStorage.setItem('sharedlm_2fa_enabled', 'true');
      localStorage.setItem('sharedlm_2fa_secret', secretKey);
      setTwoFactorEnabled(true);
      setShow2FASetup(false);
      setVerificationCode('');
      notify.success('Two-factor authentication enabled successfully');
    } else {
      notify.error('Please enter a valid 6-digit code');
    }
  };

  const handleDisable2FA = async () => {
    const confirmed = await notify.confirm({
      title: 'Disable Two-Factor Authentication',
      message: 'This will make your account less secure. Are you sure?',
      confirmText: 'Disable',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      localStorage.removeItem('sharedlm_2fa_enabled');
      localStorage.removeItem('sharedlm_2fa_secret');
      setTwoFactorEnabled(false);
      notify.success('Two-factor authentication disabled');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secretKey);
    notify.success('Secret key copied to clipboard');
  };

  // API Keys Handlers - Now using database
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
    const confirmed = await notify.confirm({
      title: 'Remove API Key',
      message: `Remove ${provider.toUpperCase()} API key? You won't be able to use this model until you add a new key.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      try {
        await apiService.deleteApiKey(userId, provider);
        
        // Also remove from localStorage
        localStorage.removeItem(`sharedlm_api_${provider}`);
        
        // Reload keys
        await loadApiKeys();
        
        notify.success(`${provider.toUpperCase()} API key removed`);
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

    try {
      notify.info(`Testing ${provider.toUpperCase()} connection...`);
      
      const result = await apiService.testApiKey(userId, provider);
      
      if (result.success) {
        notify.success(`${provider.toUpperCase()} connection successful`);
      }
    } catch (error) {
      notify.error(error.message || `${provider.toUpperCase()} connection failed`);
    }
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">SETTINGS</h1>
          <p className="page-subtitle">Customize your SharedLM experience</p>
        </div>

        <div className="settings-layout">
          <div className="settings-nav">
            {settingsTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-content-wrapper">
            <div className="settings-content">
              {activeTab === 'general' && (
                <div className="settings-section">
                  <h3 className="section-title">GENERAL SETTINGS</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Auto-save Conversations</label>
                      <p className="setting-description">Automatically save chat history</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={autoSave}
                        onChange={(e) => {
                          setAutoSave(e.target.checked);
                          notify.success(e.target.checked ? 'Auto-save enabled' : 'Auto-save disabled');
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Stream Responses</label>
                      <p className="setting-description">Show AI responses as they generate</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={streamResponses}
                        onChange={(e) => {
                          setStreamResponses(e.target.checked);
                          notify.success(e.target.checked ? 'Streaming enabled' : 'Streaming disabled');
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

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
                </div>
              )}

              {activeTab === 'account' && (
                <div className="settings-section">
                  <h3 className="section-title">ACCOUNT SETTINGS</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Email Address</label>
                      <p className="setting-description">Your account email</p>
                    </div>
                    <input 
                      type="email" 
                      value={userEmail}
                      className="setting-input" 
                      readOnly
                      style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Display Name</label>
                      <p className="setting-description">How your name appears in the app</p>
                    </div>
                    <input 
                      type="text" 
                      value={tempDisplayName}
                      onChange={(e) => setTempDisplayName(e.target.value)}
                      className="setting-input"
                      placeholder="Enter display name"
                    />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">User ID</label>
                      <p className="setting-description">Your unique identifier</p>
                    </div>
                    <input 
                      type="text" 
                      value={userId}
                      className="setting-input" 
                      disabled 
                      style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* Change Password Section */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Change Password</label>
                      <p className="setting-description">Update your account password</p>
                    </div>
                    <button 
                      className="button-base button-secondary"
                      onClick={() => setShowChangePassword(!showChangePassword)}
                    >
                      {showChangePassword ? 'CANCEL' : 'CHANGE PASSWORD'}
                    </button>
                  </div>

                  {showChangePassword && (
                    <div className="password-change-section">
                      <div className="password-input-group">
                        <label className="password-label">CURRENT PASSWORD</label>
                        <div className="password-input-wrapper">
                          <Lock size={16} className="password-input-icon" />
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                            placeholder="Enter current password"
                            className="password-input"
                          />
                          <button
                            className="password-toggle-btn"
                            onClick={() => togglePasswordVisibility('current')}
                          >
                            {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="password-input-group">
                        <label className="password-label">NEW PASSWORD</label>
                        <div className="password-input-wrapper">
                          <Lock size={16} className="password-input-icon" />
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                            placeholder="Minimum 8 characters"
                            className="password-input"
                          />
                          <button
                            className="password-toggle-btn"
                            onClick={() => togglePasswordVisibility('new')}
                          >
                            {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="password-input-group">
                        <label className="password-label">CONFIRM NEW PASSWORD</label>
                        <div className="password-input-wrapper">
                          <Lock size={16} className="password-input-icon" />
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            placeholder="Re-enter new password"
                            className="password-input"
                          />
                          <button
                            className="password-toggle-btn"
                            onClick={() => togglePasswordVisibility('confirm')}
                          >
                            {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button 
                        className="button-base button-primary"
                        onClick={handleChangePassword}
                        style={{ marginTop: '15px' }}
                        disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      >
                        UPDATE PASSWORD
                      </button>
                    </div>
                  )}

                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Two-Factor Authentication</label>
                      <p className="setting-description">
                        {twoFactorEnabled ? 'Extra security is enabled' : 'Add an extra layer of security'}
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={twoFactorEnabled}
                        onChange={handleToggle2FA}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {show2FASetup && (
                    <div className="twofa-setup-section">
                      <h4 className="twofa-title">Setup Two-Factor Authentication</h4>
                      
                      <div className="twofa-step">
                        <p className="twofa-instruction">
                          1. Install an authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                      </div>

                      <div className="twofa-step">
                        <p className="twofa-instruction">
                          2. Scan this QR code or enter the secret key manually:
                        </p>
                        <div className="secret-key-container">
                          <code className="secret-key">{secretKey}</code>
                          <button 
                            className="copy-secret-btn"
                            onClick={handleCopySecret}
                            title="Copy secret key"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="twofa-step">
                        <p className="twofa-instruction">
                          3. Enter the 6-digit code from your authenticator app:
                        </p>
                        <input
                          type="text"
                          className="verification-input"
                          placeholder="000000"
                          maxLength="6"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>

                      <div className="twofa-actions">
                        <button 
                          className="button-base button-secondary"
                          onClick={() => {
                            setShow2FASetup(false);
                            setVerificationCode('');
                          }}
                        >
                          CANCEL
                        </button>
                        <button 
                          className="button-base button-primary"
                          onClick={handleVerify2FA}
                          disabled={verificationCode.length !== 6}
                        >
                          VERIFY & ENABLE
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="action-buttons">
                    <button 
                      className="button-base button-primary"
                      onClick={handleUpdateDisplayName}
                      disabled={tempDisplayName === displayName || !tempDisplayName.trim()}
                    >
                      SAVE CHANGES
                    </button>
                  </div>

                  <div className="danger-zone">
                    <h4 className="danger-title">DANGER ZONE</h4>
                    <div className="action-buttons">
                      <button 
                        className="button-base button-danger" 
                        onClick={handleLogout}
                      >
                        <LogOut size={14} style={{ marginRight: '8px' }} />
                        LOGOUT
                      </button>
                      <button 
                        className="button-base button-danger"
                        onClick={handleDeleteAccount}
                      >
                        DELETE ACCOUNT
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="settings-section">
                  <h3 className="section-title">PRIVACY & SECURITY</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Data Collection</label>
                      <p className="setting-description">Allow anonymous usage statistics</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={dataCollection}
                        onChange={(e) => {
                          setDataCollection(e.target.checked);
                          notify.success(e.target.checked ? 'Data collection enabled' : 'Data collection disabled');
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Share Chat History</label>
                      <p className="setting-description">Allow SharedLM to use your chats for improvement</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={shareChatHistory}
                        onChange={(e) => {
                          setShareChatHistory(e.target.checked);
                          notify.success(e.target.checked ? 'Chat sharing enabled' : 'Chat sharing disabled');
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Memory Storage</label>
                      <p className="setting-description">Store conversation context across sessions</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={memoryStorage}
                        onChange={(e) => {
                          setMemoryStorage(e.target.checked);
                          notify.success(e.target.checked ? 'Memory storage enabled' : 'Memory storage disabled');
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="action-buttons">
                    <button 
                      className="button-base button-secondary"
                      onClick={handleExportData}
                    >
                      EXPORT DATA
                    </button>
                    <button 
                      className="button-base button-danger"
                      onClick={handleClearAllData}
                    >
                      CLEAR ALL DATA
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="settings-section">
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

                      <div className="api-hint-section">
                        <p className="api-hint">
                          <strong>Note:</strong> Your API keys are encrypted and stored securely in the database. They are never shared with third parties. Get your API keys from the respective provider dashboards.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;