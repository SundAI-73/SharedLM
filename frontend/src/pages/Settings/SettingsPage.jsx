import React, { useState } from 'react';
import { Settings, User, Shield, CreditCard, Zap, Database, LogOut } from 'lucide-react';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [defaultModel, setDefaultModel] = useState('gpt-4');
  const [language, setLanguage] = useState('english');
  const { analyticsEnabled, setAnalyticsEnabled } = useUser();
  
  // Get user data from localStorage
  const [displayName, setDisplayName] = useState(localStorage.getItem('sharedlm_user_name') || '');
  const userEmail = localStorage.getItem('sharedlm_user_email') || '';
  const userId = localStorage.getItem('sharedlm_user_id') || '';

  const settingsTabs = [
    { id: 'general', label: 'GENERAL', icon: <Settings size={18} /> },
    { id: 'account', label: 'ACCOUNT', icon: <User size={18} /> },
    { id: 'privacy', label: 'PRIVACY', icon: <Shield size={18} /> },
    { id: 'pricing', label: 'PRICING', icon: <CreditCard size={18} /> },
    { id: 'integrations', label: 'INTEGRATIONS', icon: <Zap size={18} /> },
    { id: 'store', label: 'STORE', icon: <Database size={18} /> }
  ];

  const modelOptions = [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'claude', label: 'Claude' },
    { value: 'gemini', label: 'Gemini' }
  ];

  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('sharedlm_user_id');
    localStorage.removeItem('sharedlm_user_email');
    localStorage.removeItem('sharedlm_user_name');
    localStorage.removeItem('sharedlm_session');
    navigate('/login');
  };

  const handleUpdateDisplayName = () => {
    localStorage.setItem('sharedlm_user_name', displayName);
    alert('Display name updated!');
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">SETTINGS</h1>
          <p className="page-subtitle">Customize your SharedLM experience</p>
        </div>

        <div className="settings-layout">
          {/* Settings Navigation */}
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

          {/* Settings Content */}
          <div className="settings-content-wrapper">
            <div className="settings-content">
              {activeTab === 'general' && (
                <div className="settings-section">
                  <h3 className="section-title">GENERAL SETTINGS</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Default Model</label>
                      <p className="setting-description">Choose your preferred AI model</p>
                    </div>
                    <CustomDropdown 
                      value={defaultModel}
                      onChange={setDefaultModel}
                      options={modelOptions}
                      className="setting-dropdown"
                    />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Response Length</label>
                      <p className="setting-description">Maximum tokens per response</p>
                    </div>
                    <input type="number" defaultValue="2048" className="setting-input" />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Auto-save Conversations</label>
                      <p className="setting-description">Automatically save chat history</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Stream Responses</label>
                      <p className="setting-description">Show AI responses as they generate</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Language</label>
                      <p className="setting-description">Interface language preference</p>
                    </div>
                    <CustomDropdown 
                      value={language}
                      onChange={setLanguage}
                      options={languageOptions}
                      className="setting-dropdown"
                    />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Analytics Page</label>
                      <p className="setting-description">Enable or disable analytics dashboard</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={analyticsEnabled}
                        onChange={(e) => setAnalyticsEnabled(e.target.checked)}
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
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="setting-input"
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

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Change Password</label>
                      <p className="setting-description">Update your account password</p>
                    </div>
                    <button className="button-base button-secondary">CHANGE PASSWORD</button>
                  </div>

                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Two-Factor Authentication</label>
                      <p className="setting-description">Add an extra layer of security</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="action-buttons">
                    <button 
                      className="button-base button-primary"
                      onClick={handleUpdateDisplayName}
                    >
                      SAVE CHANGES
                    </button>
                  </div>

                  <div className="danger-zone">
                    <h4 className="danger-title">DANGER ZONE</h4>
                    <div className="action-buttons">
                      <button className="button-base button-danger" onClick={handleLogout}>
                        <LogOut size={14} style={{ marginRight: '8px' }} />
                        LOGOUT
                      </button>
                      <button className="button-base button-danger">DELETE ACCOUNT</button>
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
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Share Chat History</label>
                      <p className="setting-description">Allow SharedLM to use your chats for improvement</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Memory Storage</label>
                      <p className="setting-description">Store conversation context across sessions</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="action-buttons">
                    <button className="button-base button-secondary">EXPORT DATA</button>
                    <button className="button-base button-secondary">DOWNLOAD CHATS</button>
                    <button className="button-base button-danger">CLEAR ALL DATA</button>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="settings-section">
                  <h3 className="section-title">PRICING & BILLING</h3>
                  
                  <div className="pricing-card-container">
                    <div className="pricing-card active">
                      <div className="plan-badge">CURRENT PLAN</div>
                      <h4 className="plan-name">FREE TIER</h4>
                      <div className="plan-price">$0<span>/month</span></div>
                      <ul className="plan-features">
                        <li>100 messages/day</li>
                        <li>Basic models access</li>
                        <li>7-day chat history</li>
                        <li>Community support</li>
                      </ul>
                    </div>

                    <div className="pricing-card">
                      <h4 className="plan-name">PRO</h4>
                      <div className="plan-price">$20<span>/month</span></div>
                      <ul className="plan-features">
                        <li>Unlimited messages</li>
                        <li>All models access</li>
                        <li>Unlimited history</li>
                        <li>Priority support</li>
                        <li>Advanced features</li>
                      </ul>
                      <button className="button-base button-primary">UPGRADE</button>
                    </div>

                    <div className="pricing-card">
                      <h4 className="plan-name">ENTERPRISE</h4>
                      <div className="plan-price">Custom</div>
                      <ul className="plan-features">
                        <li>Custom limits</li>
                        <li>Private deployment</li>
                        <li>SLA guarantee</li>
                        <li>Dedicated support</li>
                      </ul>
                      <button className="button-base button-secondary">CONTACT SALES</button>
                    </div>
                  </div>

                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Payment Method</label>
                      <p className="setting-description">Manage your payment information</p>
                    </div>
                    <button className="button-base button-secondary">MANAGE PAYMENT</button>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="settings-section">
                  <h3 className="section-title">API INTEGRATIONS</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">OpenAI API Key</label>
                      <p className="setting-description">Your OpenAI API credentials</p>
                    </div>
                    <input type="password" placeholder="sk-..." className="setting-input" />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Anthropic API Key</label>
                      <p className="setting-description">Your Anthropic API credentials</p>
                    </div>
                    <input type="password" placeholder="sk-..." className="setting-input" />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Google AI API Key</label>
                      <p className="setting-description">Your Google AI credentials</p>
                    </div>
                    <input type="password" placeholder="AIza..." className="setting-input" />
                  </div>

                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Webhook URL</label>
                      <p className="setting-description">Receive chat events to your endpoint</p>
                    </div>
                    <input type="url" placeholder="https://your-webhook.com" className="setting-input" />
                  </div>

                  <div className="action-buttons">
                    <button className="button-base button-primary">SAVE API KEYS</button>
                    <button className="button-base button-secondary">TEST CONNECTION</button>
                  </div>
                </div>
              )}

              {activeTab === 'store' && (
                <div className="settings-section">
                  <h3 className="section-title">DATA STORAGE</h3>
                  
                  <div className="storage-overview">
                    <div className="storage-stat">
                      <span className="storage-label">Total Storage Used</span>
                      <span className="storage-value">2.4 GB</span>
                    </div>
                    <div className="storage-bar">
                      <div className="storage-fill" style={{ width: '24%' }}></div>
                    </div>
                    <p className="storage-info">24% of 10 GB used</p>
                  </div>

                  <div className="section-divider"></div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Chat History</label>
                      <p className="setting-description">1.2 GB • 247 conversations</p>
                    </div>
                    <button className="button-base button-secondary">MANAGE</button>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Memory Cache</label>
                      <p className="setting-description">800 MB • Cross-session memories</p>
                    </div>
                    <button className="button-base button-secondary">CLEAR CACHE</button>
                  </div>

                  <div className="setting-item no-divider">
                    <div className="setting-info">
                      <label className="setting-label">Project Files</label>
                      <p className="setting-description">400 MB • 12 projects</p>
                    </div>
                    <button className="button-base button-secondary">VIEW FILES</button>
                  </div>

                  <div className="action-buttons">
                    <button className="button-base button-primary">EXPORT ALL DATA</button>
                    <button className="button-base button-secondary">IMPORT DATA</button>
                    <button className="button-base button-danger">DELETE ALL DATA</button>
                  </div>
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