import React, { useState } from 'react';
import { MessageSquare, Search, ChevronRight, Clock, Filter, Trash2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import './History.css';

function HistoryPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedChats, setSelectedChats] = useState([]);

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
    { id: 10, title: 'General chat about AI', model: 'Mistral', time: '2 weeks ago', messages: 5, project: null },
    { id: 11, title: 'Quick question about coding', model: 'GPT-4', time: '2 weeks ago', messages: 3, project: null },
    { id: 12, title: 'Random brainstorming', model: 'Claude', time: '3 weeks ago', messages: 12, project: null },
  ];

  // Project filter options
  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    { value: 'none', label: 'No Project' },
    { value: 'Web Development', label: 'Web Development' },
    { value: 'Data Science', label: 'Data Science' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Business', label: 'Business' },
  ];

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.model.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesProject = true;
    if (selectedProject === 'all') {
      matchesProject = true;
    } else if (selectedProject === 'none') {
      matchesProject = chat.project === null;
    } else {
      matchesProject = chat.project === selectedProject;
    }
    
    return matchesSearch && matchesProject;
  });

  const handleChatClick = (chatId) => {
    // Navigate to chat page with the specific chat loaded
    navigate('/chat', { state: { chatId } });
  };

  const handleCheckboxClick = (e, chatId) => {
    e.stopPropagation();
    
    if (selectedChats.includes(chatId)) {
      setSelectedChats(selectedChats.filter(id => id !== chatId));
    } else {
      setSelectedChats([...selectedChats, chatId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedChats.length === filteredChats.length) {
      setSelectedChats([]);
    } else {
      setSelectedChats(filteredChats.map(chat => chat.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedChats([]);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Delete ${selectedChats.length} conversation${selectedChats.length > 1 ? 's' : ''}?`)) {
      console.log('Deleting chats:', selectedChats);
      // TODO: Implement actual delete functionality
      setSelectedChats([]);
    }
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
              className="input-base input-with-icon search-input"
            />
          </div>

          <div className="filter-container">
            <Filter size={18} className="filter-icon" />
            <CustomDropdown
              value={selectedProject}
              onChange={setSelectedProject}
              options={projectOptions}
              className="history-filter-dropdown"
            />
          </div>
        </div>

        {/* Action Bar - Shows when chats are selected */}
        <div className={`action-bar ${selectedChats.length === 0 ? 'hidden' : ''}`}>
          <div className="selection-info">
            <span className="selection-count">
              {selectedChats.length} SELECTED
            </span>
            <button className="clear-selection-btn" onClick={handleClearSelection}>
              Clear
            </button>
          </div>

          <div className="action-buttons-group">
            <button className="action-btn delete-btn" onClick={handleDeleteSelected}>
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Chat List */}
        {filteredChats.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={60} className="empty-state-icon" />
            <h3 className="empty-state-title">No Conversations Found</h3>
            <p className="empty-state-text">
              {searchQuery || selectedProject !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Start a new chat to see it here'}
            </p>
          </div>
        ) : (
          <div className="list-layout chat-list">
            {filteredChats.map(chat => (
              <div
                key={chat.id}
                className={`list-item list-item-clickable chat-item ${selectedChats.includes(chat.id) ? 'selected' : ''}`}
              >
                {/* Checkbox */}
                <div 
                  className="chat-checkbox-container"
                  onClick={(e) => handleCheckboxClick(e, chat.id)}
                >
                  <div className={`chat-checkbox ${selectedChats.includes(chat.id) ? 'checked' : ''}`}>
                    {selectedChats.includes(chat.id) && <Check size={14} />}
                  </div>
                </div>

                {/* Chat Icon */}
                <MessageSquare size={20} className="chat-icon" />
                
                {/* Chat Content - Clickable */}
                <div className="chat-content" onClick={() => handleChatClick(chat.id)}>
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
                
                {/* Project Badge */}
                {chat.project ? (
                  <span className="project-badge">{chat.project}</span>
                ) : (
                  <span className="no-project-badge">No Project</span>
                )}
                
                {/* Chevron Icon - Clickable */}
                <ChevronRight 
                  size={18} 
                  className="chevron-icon" 
                  onClick={() => handleChatClick(chat.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;