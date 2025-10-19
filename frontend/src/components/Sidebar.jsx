import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, MessageSquare, FolderOpen, Clock, User, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Clean background - no gradient */}
        <div className="sidebar-bg"></div>
        
        {/* Content */}
        <div className="sidebar-content">
          {/* Logo Section */}
          <div className="logo-section">
            <div className="logo">
              <Sparkles size={20} />
              {!isCollapsed && <span>SharedLM</span>}
            </div>
          </div>

          {/* Navigation Pills */}
          <div className="nav-pills-container">
            <Link to="/link-llm" className={`nav-pill ${location.pathname === '/link-llm' ? 'active' : ''}`}>
              <Layers size={18} strokeWidth={2} />
              {!isCollapsed && <span>Multi LLM</span>}
            </Link>

            <Link to="/chat" className={`nav-pill ${location.pathname === '/chat' ? 'active' : ''}`}>
              <MessageSquare size={18} strokeWidth={2} />
              {!isCollapsed && <span>New Chat</span>}
            </Link>

            <Link to="/projects" className={`nav-pill ${location.pathname === '/projects' ? 'active' : ''}`}>
              <FolderOpen size={18} strokeWidth={2} />
              {!isCollapsed && <span>Projects</span>}
            </Link>

            <Link to="/chats" className={`nav-pill ${location.pathname === '/chats' ? 'active' : ''}`}>
              <Clock size={18} strokeWidth={2} />
              {!isCollapsed && <span>Chats</span>}
            </Link>

            <div className="nav-pill user-pill">
              <User size={18} strokeWidth={2} />
              {!isCollapsed && <span>User</span>}
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        <button 
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
          transition: width 0.3s ease;
        }

        .sidebar.collapsed {
          width: 80px;
        }

        /* Clean black background */
        .sidebar-bg {
          position: absolute;
          inset: 0;
          background: #000000;
        }

        /* Content */
        .sidebar-content {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 2rem 1rem;
        }

        /* Logo */
        .logo-section {
          margin-bottom: 3rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.125rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          padding: 0 0.75rem;
        }

        .sidebar.collapsed .logo {
          justify-content: center;
          padding: 0;
        }

        /* Navigation Pills Container */
        .nav-pills-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* Pill Buttons - Minimalist Design */
        .nav-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          background: transparent;
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          transition: all 0.2s ease;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
        }

        .sidebar.collapsed .nav-pill {
          padding: 0.75rem;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          margin: 0 auto;
        }

        /* Hover state */
        .nav-pill:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.3);
          color: rgba(255, 255, 255, 0.9);
        }

        /* Active state - White background with black text */
        .nav-pill.active {
          background: #ffffff;
          border-color: #ffffff;
          color: #000000;
        }

        .nav-pill.active:hover {
          background: #ffffff;
          color: #000000;
        }

        /* User pill at bottom */
        .user-pill {
          margin-top: auto;
        }

        /* Icons */
        .nav-pill svg {
          flex-shrink: 0;
        }

        /* Hide text when collapsed */
        .sidebar.collapsed span {
          display: none;
        }

        /* Toggle Button */
        .sidebar-toggle {
          position: absolute;
          right: -15px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          background: #ffffff;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }

        .sidebar-toggle:hover {
          transform: translateY(-50%) scale(1.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .sidebar-toggle svg {
          color: #000000;
        }

        /* Clean typography */
        .nav-pill span {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          letter-spacing: -0.01em;
        }
      `}</style>
    </>
  );
}

export default Sidebar;