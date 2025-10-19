import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Link as LinkIcon, MessageSquare, FolderOpen, Clock, Plus, Sparkles } from 'lucide-react';

function Sidebar() {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>
          <Sparkles size={24} />
          LLM Portal
        </h2>
      </div>
      
      <nav className="nav-section">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <Home size={20} /> Home
        </Link>
        <Link to="/link-llm" className={`nav-item ${location.pathname === '/link-llm' ? 'active' : ''}`}>
          <LinkIcon size={20} /> Link your LLM
        </Link>
      </nav>

      <div className="new-chat-section">
        <Link to="/chat">
          <button className="new-chat-btn">
            <Plus size={20} /> New Chat
          </button>
        </Link>
      </div>

      <nav className="nav-section bottom-nav">
        <Link to="/projects" className={`nav-item ${location.pathname === '/projects' ? 'active' : ''}`}>
          <FolderOpen size={20} /> Projects
        </Link>
        <Link to="/chats" className={`nav-item ${location.pathname === '/chats' ? 'active' : ''}`}>
          <Clock size={20} /> Chats
        </Link>
      </nav>
    </div>
  );
}

export default Sidebar;