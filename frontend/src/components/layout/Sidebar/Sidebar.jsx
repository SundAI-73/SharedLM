import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Layers, FolderOpen, Clock, BarChart3, Settings,
  MessageSquare, Plus, PanelLeftClose, PanelLeft, Star
} from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import logo from '../../../assets/images/logo main.svg';
import './Sidebar.css';

const NothingSidebar = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { analyticsEnabled } = useUser();
  
  const [starredProjects, setStarredProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('sharedlm_starred_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Memoize menu items
  const menuItems = useMemo(() => {
    const base = [
      { id: 'integrations', path: '/integrations', label: 'INTEGRATIONS', 
        icon: <Layers size={18} strokeWidth={1.5} /> },
      { id: 'projects', path: '/projects', label: 'PROJECTS', 
        icon: <FolderOpen size={18} strokeWidth={1.5} /> },
      { id: 'history', path: '/history', label: 'HISTORY', 
        icon: <Clock size={18} strokeWidth={1.5} /> }
    ];

    if (analyticsEnabled) {
      base.push({ id: 'analytics', path: '/analytics', label: 'ANALYTICS', 
        icon: <BarChart3 size={18} strokeWidth={1.5} /> });
    }

    base.push({ id: 'settings', path: '/settings', label: 'SETTINGS', 
      icon: <Settings size={18} strokeWidth={1.5} /> });

    return base;
  }, [analyticsEnabled]);

  // Persist starred projects
  useEffect(() => {
    localStorage.setItem('sharedlm_starred_projects', JSON.stringify(starredProjects));
  }, [starredProjects]);

  // Update main margin
  useEffect(() => {
    const mainElement = document.querySelector('.nothing-main');
    if (mainElement) {
      mainElement.style.marginLeft = isCollapsed ? '80px' : '280px';
    }
  }, [isCollapsed]);

  const handleNewChat = useCallback(() => navigate('/chat'), [navigate]);
  const toggleSidebar = useCallback(() => setIsCollapsed(prev => !prev), []);
  const handleProjectClick = useCallback((id) => navigate(`/projects/${id}`), [navigate]);
  
  const handleUnstarProject = useCallback((e, projectId) => {
    e.stopPropagation();
    setStarredProjects(prev => prev.filter(p => p.id !== projectId));
  }, []);

  return (
    <aside className={`nothing-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo Box */}
      <div className="logo-box">
        <div className="sidebar-logo">
          <img src={logo} alt="Shared LM Logo" className="logo-image" />
        </div>
        {!isCollapsed && <span className="sidebar-logo-text">SHARED LM</span>}
        <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
          {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Navigation Box */}
      <div className="navigation-box">
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
              {location.pathname === item.path && <span className="indicator-dot" />}
            </button>
          ))}
        </div>

        {/* Starred Projects */}
        {starredProjects.length > 0 && (
          <div className="starred-projects-section">
            {!isCollapsed && (
              <div className="starred-header">
                <Star size={12} className="starred-header-icon" />
                <span className="starred-title">STARRED</span>
              </div>
            )}
            
            <div className="starred-projects-list">
              {starredProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className={`sidebar-item starred-project-item ${
                    location.pathname === `/projects/${project.id}` ? 'active' : ''
                  }`}
                  title={isCollapsed ? project.name : ''}
                >
                  <span className="sidebar-item-icon">
                    <FolderOpen size={18} strokeWidth={1.5} />
                  </span>
                  {!isCollapsed && (
                    <>
                      <span className="sidebar-item-label starred-project-name">
                        {project.name}
                      </span>
                      <button
                        className="unstar-btn"
                        onClick={(e) => handleUnstarProject(e, project.id)}
                        title="Unstar project"
                      >
                        <Star size={12} fill="#B94539" color="#B94539" />
                      </button>
                    </>
                  )}
                  {location.pathname === `/projects/${project.id}` && 
                    <span className="indicator-dot" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="box-spacer" />

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className={`sidebar-item new-chat-button ${
            location.pathname === '/chat' ? 'active-chat' : ''
          }`}
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
});

NothingSidebar.displayName = 'NothingSidebar';

export default NothingSidebar;