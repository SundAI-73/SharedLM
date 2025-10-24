// src/pages/SettingsPage.jsx
import React, { useState } from 'react';
import { Settings, Palette, Shield, Zap, Database } from 'lucide-react';

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const settingsTabs = [
    { id: 'general', label: 'GENERAL', icon: <Settings size={18} /> },
    { id: 'appearance', label: 'APPEARANCE', icon: <Palette size={18} /> },
    { id: 'privacy', label: 'PRIVACY', icon: <Shield size={18} /> },
    { id: 'integrations', label: 'INTEGRATIONS', icon: <Zap size={18} /> },
    { id: 'data', label: 'DATA', icon: <Database size={18} /> }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title led-text">SETTINGS</h1>
        <p className="page-subtitle">Customize your SharedLM experience</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Settings Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {settingsTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                border: `1px ${activeTab === tab.id ? 'solid' : 'dashed'} ${activeTab === tab.id ? '#fff' : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: '12px',
                color: activeTab === tab.id ? '#fff' : '#666',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '0.875rem',
                letterSpacing: '1px',
                fontFamily: 'monospace'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="card-nothing" style={{ padding: '30px' }}>
          {activeTab === 'general' && (
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '24px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                GENERAL SETTINGS
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Default Model</label>
                    <p style={{ color: '#666', fontSize: '0.75rem', margin: 0 }}>Choose your preferred AI model</p>
                  </div>
                  <select style={{
                    background: 'transparent',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    minWidth: '150px',
                    cursor: 'pointer'
                  }}>
                    <option>GPT-4</option>
                    <option>Claude</option>
                    <option>Gemini</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Response Length</label>
                    <p style={{ color: '#666', fontSize: '0.75rem', margin: 0 }}>Maximum tokens per response</p>
                  </div>
                  <input 
                    type="number" 
                    defaultValue="2048"
                    style={{
                      background: 'transparent',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      width: '150px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Auto-save Conversations</label>
                    <p style={{ color: '#666', fontSize: '0.75rem', margin: 0 }}>Automatically save chat history</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                    <input type="checkbox" defaultChecked style={{ display: 'none' }} />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: '#00ff88',
                      borderRadius: '24px',
                      transition: '0.3s'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '16px',
                        width: '16px',
                        left: '28px',
                        bottom: '4px',
                        background: '#fff',
                        borderRadius: '50%',
                        transition: '0.3s'
                      }}></span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '24px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                APPEARANCE
              </h3>
              <p style={{ color: '#666' }}>Theme customization options coming soon...</p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '24px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                PRIVACY & SECURITY
              </h3>
              <button style={{
                padding: '8px 20px',
                background: 'transparent',
                border: '1px solid #ff3b30',
                borderRadius: '50px',
                color: '#ff3b30',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}>
                CLEAR DATA
              </button>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '24px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                API INTEGRATIONS
              </h3>
              <p style={{ color: '#666' }}>Manage your API connections and settings...</p>
            </div>
          )}

          {activeTab === 'data' && (
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '24px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                DATA MANAGEMENT
              </h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-nothing">EXPORT JSON</button>
                <button className="btn-nothing">IMPORT</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;