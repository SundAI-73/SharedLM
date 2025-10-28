import React, { useState } from 'react';
import { MessageSquare, Search, ChevronRight, Clock, Filter } from 'lucide-react';
import './History.css';

function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  
  const chats = [
    { id: 1, title: 'React component optimization', model: 'Claude', time: '10 min ago', messages: 23, project: 'Web Development' },
    { id: 2, title: 'Python data analysis script', model: 'GPT-4', time: '2 hours ago', messages: 15, project: 'Data Science' },
    { id: 3, title: 'Marketing copy ideas', model: 'Claude', time: '1 day ago', messages: 8, project: 'Marketing' },
    { id: 4, title: 'SQL query optimization', model: 'Cursor', time: '2 days ago', messages: 12, project: 'Web Development' },
    { id: 5, title: 'Business strategy discussion', model: 'Gemini', time: '3 days ago', messages: 45, project: 'Business' },
    { id: 6, title: 'UI/UX design review', model: 'Claude', time: '4 days ago', messages: 18, project: 'Web Development' },
    { id: 7, title: 'Machine learning model training', model: 'GPT-4', time: '5 days ago', messages: 32, project: 'Data Science' },
    { id: 8, title: 'API documentation', model: 'Claude', time: '1 week ago', messages: 14, project: 'Web Development' },
    { id: 9, title: 'Content strategy planning', model: 'Gemini', time: '1 week ago', messages: 27, project: 'Marketing' },
  ];

  const projects = ['all', 'Web Development', 'Data Science', 'Marketing', 'Business'];

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === 'all' || chat.project === selectedProject;
    return matchesSearch && matchesProject;
  });

  const handleChatClick = (chatId) => {
    console.log('Open chat:', chatId);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">CHAT HISTORY</h1>
          <p className="page-subtitle">View all your conversations</p>
        </div>

        {/* Controls */}
        <div className="controls-section">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-container">
            <Filter size={18} className="filter-icon" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="filter-select"
            >
              {projects.map(project => (
                <option key={project} value={project}>
                  {project === 'all' ? 'All Projects' : project}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat List */}
        <div className="chat-list">
          {filteredChats.map(chat => (
            <button
              key={chat.id}
              className="chat-item"
              onClick={() => handleChatClick(chat.id)}
            >
              <MessageSquare size={20} className="chat-icon" />
              
              <div className="chat-content">
                <h3 className="chat-title">{chat.title}</h3>
                <div className="chat-meta">
                  <span className="meta-item model">{chat.model}</span>
                  <span className="meta-divider">•</span>
                  <span className="meta-item">{chat.messages} messages</span>
                  <span className="meta-divider">•</span>
                  <span className="meta-item">
                    <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                    {chat.time}
                  </span>
                </div>
              </div>
              
              <span className="project-badge">{chat.project}</span>
              
              <ChevronRight size={18} className="chevron-icon" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;