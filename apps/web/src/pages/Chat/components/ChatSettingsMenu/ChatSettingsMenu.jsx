import React from 'react';
import { Clock, Search, Globe, Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ChatSettingsMenu = ({ 
  showSettingsMenu, 
  setShowSettingsMenu, 
  setShowConnectorsModal,
  settingsMenuRef 
}) => {
  const navigate = useNavigate();

  if (!showSettingsMenu) return null;

  return (
    <div className="chat-settings-menu" ref={settingsMenuRef}>
      <div className="settings-menu-item">
        <div className="settings-menu-item-left">
          <Clock size={16} className="settings-menu-icon" />
          <span>Extended thinking</span>
        </div>
        <label className="toggle-switch-small">
          <input type="checkbox" defaultChecked />
          <span className="toggle-slider-small"></span>
        </label>
      </div>
      <div className="settings-menu-item">
        <div className="settings-menu-item-left">
          <Search size={16} className="settings-menu-icon" />
          <span>Research</span>
        </div>
        <label className="toggle-switch-small">
          <input type="checkbox" defaultChecked />
          <span className="toggle-slider-small"></span>
        </label>
      </div>
      <div className="settings-menu-item">
        <div className="settings-menu-item-left">
          <Globe size={16} className="settings-menu-icon" />
          <span>Web search</span>
        </div>
        <label className="toggle-switch-small">
          <input type="checkbox" defaultChecked />
          <span className="toggle-slider-small"></span>
        </label>
      </div>
      <div className="settings-menu-divider"></div>
      <div 
        className="settings-menu-item settings-menu-action"
        onClick={() => {
          setShowSettingsMenu(false);
          setShowConnectorsModal(true);
        }}
      >
        <div className="settings-menu-item-left">
          <Plus size={16} className="settings-menu-icon" />
          <span>Add connectors</span>
        </div>
      </div>
      <div 
        className="settings-menu-item settings-menu-action"
        onClick={() => {
          setShowSettingsMenu(false);
          navigate('/settings?tab=connectors');
        }}
      >
        <div className="settings-menu-item-left">
          <Settings size={16} className="settings-menu-icon" />
          <span>Manage connectors</span>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsMenu;

