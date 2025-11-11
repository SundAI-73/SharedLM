import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Layers, FolderOpen, Clock, BarChart3, Settings,
  MessageSquare, Plus, PanelLeftClose, PanelLeft, Star, Menu, X
} from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import logo from '../../../assets/images/logo main.svg';
import './Sidebar.css';

const NothingSidebar = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { analyticsEnabled, starredProjects, toggleStarProject } = useUser();

  // Check if mobile view
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      // Close mobile menu on desktop
      if (window.innerWidth > 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

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

  // Update main margin only on desktop
  useEffect(() => {
    if (!isMobile) {
      const mainElement = document.querySelector('.nothing-main');
      if (mainElement) {
        mainElement.style.marginLeft = isCollapsed ? '76px' : '280px';
      }
    }
  }, [isCollapsed, isMobile]);

  const handleNewChat = useCallback(() => {
    // Navigate to chat and clear any conversation state
    // Add timestamp to ensure state change is detected even when already on /chat
    // If already on /chat, add a temporary query param to force navigation
    const timestamp = Date.now();
    const isAlreadyOnChat = location.pathname === '/chat';
    
    if (isAlreadyOnChat) {
      // Add temporary query param to force React Router to treat as new navigation
      // The query param will be cleaned up by ChatPage after processing
      navigate(`/chat?new=${timestamp}`, { 
        state: { newChat: true, timestamp },
        replace: false
      });
    } else {
      navigate('/chat', { 
        state: { newChat: true, timestamp },
        replace: false
      });
    }
    setIsMobileOpen(false);
  }, [navigate, location.pathname]);

  const toggleSidebar = useCallback(() => setIsCollapsed(prev => !prev), []);
  
  const toggleMobileMenu = useCallback(() => setIsMobileOpen(prev => !prev), []);

  const handleProjectClick = useCallback((id) => {
    navigate(`/projects/${id}`);
    setIsMobileOpen(false);
  }, [navigate]);

  const handleUnstarProject = useCallback((e, projectId) => {
    e.stopPropagation();
    const project = starredProjects.find(p => p.id === projectId);
    if (project) {
      toggleStarProject(project);
    }
  }, [starredProjects, toggleStarProject]);

  const handleMenuItemClick = useCallback((path) => {
    navigate(path);
    setIsMobileOpen(false);
  }, [navigate]);

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      {isMobile && (
        <button 
          className="mobile-menu-toggle" 
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="mobile-sidebar-overlay active" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`nothing-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo Box */}
        <div className="logo-box">
          <div className="sidebar-logo">
            <img src={logo} alt="Shared LM Logo" className="logo-image" />
          </div>
          {!isCollapsed && <span className="sidebar-logo-text">SHARED LM</span>}
          {!isMobile && (
            <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
              {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
            </button>
          )}
        </div>

        {/* Navigation Box */}
        <div className="navigation-box">
          <div className="nav-items-container">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.path)}
                className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                title={isCollapsed && !isMobile ? item.label : ''}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                {(!isCollapsed || isMobile) && <span className="sidebar-item-label">{item.label}</span>}
                {location.pathname === item.path && <span className="indicator-dot" />}
              </button>
            ))}
          </div>

          {/* Starred Projects */}
          {starredProjects.length > 0 && (
            <div className="starred-projects-section">
              {(!isCollapsed || isMobile) && (
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
                    title={isCollapsed && !isMobile ? project.name : ''}
                  >
                    <span className="sidebar-item-icon">
                      <FolderOpen size={18} strokeWidth={1.5} />
                    </span>
                    {(!isCollapsed || isMobile) && (
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
            title={isCollapsed && !isMobile ? 'NEW CHAT' : ''}
          >
            <span className="sidebar-item-icon">
              <MessageSquare size={18} strokeWidth={1.5} />
            </span>
            {(!isCollapsed || isMobile) && <span className="sidebar-item-label">NEW CHAT</span>}
            {(!isCollapsed || isMobile) && (
              <div className="plus-icon-container">
                <Plus size={16} strokeWidth={2} />
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
});

NothingSidebar.displayName = 'NothingSidebar';

export default NothingSidebar;