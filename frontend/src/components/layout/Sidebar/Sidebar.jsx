
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  FolderOpen,
  Clock,
  BarChart3,
  Settings,
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import logo from '../../../assets/images/logo main.svg';
import './Sidebar.css';

const NothingSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Update main content margin when sidebar collapses
  useEffect(() => {
    const mainElement = document.querySelector('.nothing-main');
    if (mainElement) {
      if (isCollapsed) {
        mainElement.style.marginLeft = '80px';
      } else {
        mainElement.style.marginLeft = '280px';
      }
    }
  }, [isCollapsed]);

  const menuItems = [
    {
      id: 'integrations',
      path: '/integrations',
      label: 'INTEGRATIONS',
      icon: <Layers size={18} strokeWidth={1.5} />
    },
    {
      id: 'projects',
      path: '/projects',
      label: 'PROJECTS',
      icon: <FolderOpen size={18} strokeWidth={1.5} />
    },
    {
      id: 'history',
      path: '/history',
      label: 'HISTORY',
      icon: <Clock size={18} strokeWidth={1.5} />
    },
    {
      id: 'analytics',
      path: '/analytics',
      label: 'ANALYTICS',
      icon: <BarChart3 size={18} strokeWidth={1.5} />
    },
    {
      id: 'settings',
      path: '/settings',
      label: 'SETTINGS',
      icon: <Settings size={18} strokeWidth={1.5} />
    },
  ];

  const handleNewChat = () => {
    navigate('/chat');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={`nothing-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* BOX 1: Logo Box - Separate container for logo */}
      <div className="logo-box">
        <div className="sidebar-logo">
          <img src={logo} alt="Shared LM Logo" className="logo-image" />
        </div>
        {!isCollapsed && <span className="sidebar-logo-text">SHARED LM</span>}
        <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
          {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* BOX 2: Navigation Box - Contains all menu items AND New Chat button */}
      <div className="navigation-box">
        {/* Navigation Items */}
        <div className="nav-items-container">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              {!isCollapsed && <span className="sidebar-item-label">{item.label}</span>}
              {/* Show indicator dot only on active page */}
              {location.pathname === item.path && <span className="indicator-dot"></span>}
            </button>
          ))}
        </div>

        {/* Spacer inside the box */}
        <div className="box-spacer"></div>

        {/* NEW CHAT Button */}
        <button
          onClick={handleNewChat}
          className={`sidebar-item new-chat-button ${location.pathname === '/chat' ? 'active-chat' : ''}`}
          title={isCollapsed ? 'NEW CHAT' : ''}
        >
          <span className="sidebar-item-icon">
            <MessageSquare size={18} strokeWidth={1.5} />
          </span>
          {!isCollapsed && <span className="sidebar-item-label">NEW CHAT</span>}
          {!isCollapsed && (
            <div className="plus-icon-container">
              <Plus size={16} strokeWidth={2} />
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default NothingSidebar;