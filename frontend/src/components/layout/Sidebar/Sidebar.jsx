// src/components/layout/Sidebar/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Layers,
  MessageSquare,
  FolderOpen,
  Clock,
  User,
  ChevronLeft,
  ChevronDown,
  Settings,
  BarChart3,  // Add this import
  Store,       // Add this import
  LogOut       // Add this import
} from 'lucide-react';
import DotMatrix from '../../common/DotMatrix/DotMatrix';
import './Sidebar.css';

const NothingSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);  // Add this state
  const location = useLocation();

  const menuItems = [
    { id: 'integrations', path: '/integrations', icon: <Layers size={20} strokeWidth={1.5} />, label: 'INTEGRATIONS' },
    { id: 'chat', path: '/chat', icon: <MessageSquare size={20} strokeWidth={1.5} />, label: 'NEW CHAT' },
    { id: 'projects', path: '/projects', icon: <FolderOpen size={20} strokeWidth={1.5} />, label: 'PROJECTS' },
    { id: 'history', path: '/history', icon: <Clock size={20} strokeWidth={1.5} />, label: 'HISTORY' },
    { id: 'analytics', path: '/analytics', icon: <BarChart3 size={20} strokeWidth={1.5} />, label: 'ANALYTICS' },
  ];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const handleStore = () => {
    window.location.href = '/store';  // Or open modal/external link
  };

  return (
    <aside className={`nothing-sidebar ${isExpanded ? 'expanded' : ''}`}>
      <div className="sidebar-header">
        <DotMatrix size={5} text="S" />
        {isExpanded && (
          <span className="sidebar-logo-text led-text">SHARED</span>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <Link
            key={item.id}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {isExpanded && (
              <span className="sidebar-item-label led-text">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        {/* Settings Link */}
        <Link
          to="/settings"
          className={`sidebar-item ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          <span className="sidebar-item-icon">
            <Settings size={20} strokeWidth={1.5} />
          </span>
          {isExpanded && <span className="sidebar-item-label led-text">SETTINGS</span>}
        </Link>

        {/* User Dropdown */}
        <div className="user-dropdown-wrapper">
          <button
            className="sidebar-item user-trigger"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          >
            <span className="sidebar-item-icon">
              <User size={20} strokeWidth={1.5} />
            </span>
            {isExpanded && (
              <>
                <span className="sidebar-item-label led-text">USER</span>
                <ChevronDown
                  size={16}
                  className={`dropdown-arrow ${userDropdownOpen ? 'open' : ''}`}
                />
              </>
            )}
          </button>

          {userDropdownOpen && isExpanded && (
            <div className="user-dropdown-menu">
              <button className="dropdown-item" onClick={handleStore}>
                <Store size={16} />
                <span className="led-text">STORE</span>
              </button>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <LogOut size={16} />
                <span className="led-text">LOGOUT</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        className="sidebar-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronLeft
          size={16}
          style={{
            transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.3s ease'
          }}
        />
      </button>
    </aside>
  );
};

export default NothingSidebar;