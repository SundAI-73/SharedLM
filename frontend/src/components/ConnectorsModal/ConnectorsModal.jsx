import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Globe, Monitor, Folder, MessageSquare, FileText, StickyNote, Settings as SettingsIcon, Box, Laptop } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiService from '../../services/api';
import './ConnectorsModal.css';

// Mock connector data - replace with actual API data
const webConnectors = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Let SharedLm access your filesystem to read and write files.',
    usage: '297K',
    icon: <Folder size={24} />,
    category: 'web'
  },
  {
    id: 'chrome',
    name: 'Control Chrome',
    description: 'Control Google Chrome browser tabs, windows, and navigation',
    usage: '115K',
    icon: <Globe size={24} />,
    category: 'web'
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Provides important design information and context when generating code from Figma',
    usage: '88K',
    icon: <Box size={24} />,
    category: 'web'
  }
];

const desktopConnectors = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Let SharedLm access your filesystem to read and write files.',
    usage: '297K',
    icon: <Folder size={24} />,
    category: 'desktop'
  },
  {
    id: 'imessages',
    name: 'Read and Send iMessages',
    description: 'Send, read, and manage messages through Apple\'s Messages app',
    usage: '204K',
    icon: <MessageSquare size={24} />,
    category: 'desktop'
  },
  {
    id: 'chrome',
    name: 'Control Chrome',
    description: 'Control Google Chrome browser tabs, windows, and navigation',
    usage: '115K',
    icon: <Globe size={24} />,
    category: 'desktop'
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Provides important design information and context when generating code from Fig...',
    usage: '88K',
    icon: <Box size={24} />,
    category: 'desktop'
  },
  {
    id: 'windows-mcp',
    name: 'Windows-MCP',
    description: 'Lightweight MCP Server that enables SharedLm to interact with Windows OS',
    usage: '72K',
    icon: <Laptop size={24} />,
    category: 'desktop'
  },
  {
    id: 'pdf-tools',
    name: 'PDF Tools - Analyze, Extra...',
    description: 'Let SharedLm work with PDFs on your computer: read, analyze, fill forms, extra...',
    usage: '69K',
    icon: <FileText size={24} />,
    category: 'desktop'
  },
  {
    id: 'apple-notes',
    name: 'Read and Write Apple No...',
    description: 'Read, write, and manage notes in Apple Notes',
    usage: '65K',
    icon: <StickyNote size={24} />,
    category: 'desktop'
  },
  {
    id: 'context7',
    name: 'Context7',
    description: 'Up-to-date Code Docs For Any Prompt',
    usage: '52K',
    icon: <Globe size={24} />,
    category: 'desktop'
  },
  {
    id: 'control-mac',
    name: 'Control your Mac',
    description: 'Execute AppleScript to automate tasks on macOS.',
    usage: '50K',
    icon: <Laptop size={24} />,
    category: 'desktop'
  },
  {
    id: 'desktop-commander',
    name: 'Desktop Commander',
    description: 'Build, explore, and automate on your local machine with access to files and terminal.',
    usage: '41K',
    icon: <Monitor size={24} />,
    category: 'desktop'
  }
];

function ConnectorsModal({ isOpen, onClose, onConnectorAdded }) {
  const { userId } = useUser();
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('web');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedConnectors, setAddedConnectors] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAddedConnectors = useCallback(async () => {
    try {
      // Load user's added connectors from API
      // Check localStorage first as fallback
      const savedConnectors = localStorage.getItem(`sharedlm_connectors_${userId}`);
      if (savedConnectors) {
        const connectors = JSON.parse(savedConnectors);
        setAddedConnectors(connectors.map(c => c.connector_id || c.id));
      }
      
      // Also try API if it exists
      try {
        if (apiService.getUserConnectors) {
          const connectors = await apiService.getUserConnectors(userId);
          if (connectors && connectors.length > 0) {
            setAddedConnectors(connectors.map(c => c.connector_id || c.id));
            // Save to localStorage as backup
            localStorage.setItem(`sharedlm_connectors_${userId}`, JSON.stringify(connectors));
            return; // Use API data if available
          }
        }
      } catch (apiError) {
        // API might not be implemented yet, use localStorage
        console.log('API not available, using localStorage');
      }
      
      // If no API data and we have localStorage data, use that
      if (savedConnectors) {
        const connectors = JSON.parse(savedConnectors);
        setAddedConnectors(connectors.map(c => c.connector_id || c.id));
      }
    } catch (error) {
      console.error('Failed to load connectors:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadAddedConnectors();
    }
  }, [isOpen, loadAddedConnectors]);

  const handleAddConnector = async (connector) => {
    try {
      setLoading(true);
      // Add connector - try API first, fallback to localStorage
      let connectorData = {
        connector_id: connector.id,
        id: connector.id,
        name: connector.name,
        description: connector.description,
        category: connector.category
      };
      
      try {
        if (apiService.addUserConnector) {
          await apiService.addUserConnector(userId, connectorData);
        }
      } catch (apiError) {
        console.log('API not available, using localStorage');
      }
      
      // Update localStorage
      const savedConnectors = localStorage.getItem(`sharedlm_connectors_${userId}`);
      const connectors = savedConnectors ? JSON.parse(savedConnectors) : [];
      if (!connectors.find(c => (c.connector_id || c.id) === connector.id)) {
        connectors.push(connectorData);
        localStorage.setItem(`sharedlm_connectors_${userId}`, JSON.stringify(connectors));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('connectorUpdated'));
      }
      
      setAddedConnectors(prev => {
        if (!prev.includes(connector.id)) {
          return [...prev, connector.id];
        }
        return prev;
      });
      notify.success(`Added ${connector.name}`);
      if (onConnectorAdded) {
        onConnectorAdded(connector);
      }
      // Reload connectors list
      await loadAddedConnectors();
    } catch (error) {
      console.error('Failed to add connector:', error);
      notify.error('Failed to add connector');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnector = async (connectorId) => {
    try {
      setLoading(true);
      // Remove connector via API
      if (apiService.removeUserConnector) {
        await apiService.removeUserConnector(userId, connectorId);
      }
      
      // Update local state
      setAddedConnectors(prev => prev.filter(id => id !== connectorId));
      
      // Update localStorage
      const savedConnectors = localStorage.getItem(`sharedlm_connectors_${userId}`);
      if (savedConnectors) {
        const connectors = JSON.parse(savedConnectors);
        const updated = connectors.filter(c => (c.connector_id || c.id) !== connectorId);
        localStorage.setItem(`sharedlm_connectors_${userId}`, JSON.stringify(updated));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('connectorUpdated'));
      }
      
      notify.success('Connector removed');
      // Reload connectors list
      await loadAddedConnectors();
    } catch (error) {
      console.error('Failed to remove connector:', error);
      // Still remove locally
      setAddedConnectors(prev => prev.filter(id => id !== connectorId));
      notify.success('Connector removed');
    } finally {
      setLoading(false);
    }
  };

  const filteredConnectors = (activeTab === 'web' ? webConnectors : desktopConnectors).filter(
    connector => connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 connector.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isConnectorAdded = (connectorId) => addedConnectors.includes(connectorId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="connectors-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="connectors-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="connectors-modal-header">
            <h2 className="connectors-modal-title">Connectors</h2>
            <button className="connectors-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="connectors-modal-description">
            Unlock more with SharedLm when you connect with these SharedLm-reviewed remote and local tools. <button type="button" className="connectors-learn-more" onClick={() => { notify.info('Learn more feature coming soon'); }} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Learn more</button>
          </div>

          <div className="connectors-modal-search-row">
            <div className="connectors-search-container">
              <Search size={18} className="connectors-search-icon" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="connectors-search-input"
              />
            </div>
            <button 
              className="connectors-manage-btn"
              onClick={() => {
                onClose();
                setTimeout(() => {
                  window.location.href = '/settings?tab=connectors';
                }, 100);
              }}
            >
              <SettingsIcon size={16} />
              Manage connectors
            </button>
          </div>

          <div className="connectors-modal-tabs">
            <button
              className={`connectors-tab ${activeTab === 'web' ? 'active' : ''}`}
              onClick={() => setActiveTab('web')}
            >
              Web
            </button>
            <button
              className={`connectors-tab ${activeTab === 'desktop' ? 'active' : ''}`}
              onClick={() => setActiveTab('desktop')}
            >
              Desktop extensions
            </button>
          </div>

          {activeTab === 'desktop' && (
            <div className="connectors-desktop-banner">
              <div className="connectors-desktop-banner-text">
                Open SharedLm for Desktop to let SharedLm work with apps, data, and tools directly on your computer.
              </div>
              <button 
                className="connectors-desktop-btn"
                onClick={() => notify.info('Desktop app feature coming soon')}
              >
                Open SharedLm for Desktop
              </button>
            </div>
          )}

          <div className="connectors-modal-content">
            {searchQuery && filteredConnectors.length === 0 ? (
              <div className="connectors-empty-state">
                <p className="connectors-empty-text">No connectors found matching "{searchQuery}"</p>
              </div>
            ) : filteredConnectors.length === 0 && !searchQuery ? (
              <div className="connectors-empty-state">
                <div className="connectors-empty-icon">
                  <div className="connector-shape connector-shape-1"></div>
                  <div className="connector-shape connector-shape-2"></div>
                </div>
                <p className="connectors-empty-text">No connectors available in this category</p>
              </div>
            ) : (
              <div className="connectors-grid">
                {filteredConnectors.map((connector) => (
                  <motion.div
                    key={connector.id}
                    className="connector-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="connector-card-header">
                      <div className="connector-icon">{connector.icon}</div>
                      <div className="connector-usage">{connector.usage}</div>
                    </div>
                    <h3 className="connector-name">{connector.name}</h3>
                    <p className="connector-description">{connector.description}</p>
                    {isConnectorAdded(connector.id) ? (
                      <button
                        className="connector-btn connector-btn-remove"
                        onClick={() => handleRemoveConnector(connector.id)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        className="connector-btn connector-btn-add"
                        onClick={() => handleAddConnector(connector)}
                        disabled={loading}
                      >
                        Add
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ConnectorsModal;

