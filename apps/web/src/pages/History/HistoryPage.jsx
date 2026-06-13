import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MessageSquare, Search, ChevronRight, Clock, Filter, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import { useNotification } from '../../contexts/NotificationContext';
import './History.css';

function HistoryPage() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedChats, setSelectedChats] = useState([]);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const notify = useNotification();

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 14) return '1 week ago';
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load both conversations AND projects
      const [conversations, projects] = await Promise.all([
        apiService.getConversations(userId),
        apiService.getProjects(userId)
      ]);
      
      console.log('Loaded conversations:', conversations);
      console.log('Loaded projects:', projects);
      
      // Create project ID to name map
      const projectMap = {};
      projects.forEach(proj => {
        projectMap[proj.id] = proj.name;
      });
      
      console.log('Project map:', projectMap);
      
      // Transform with real project names
      const formattedChats = conversations.map(conv => {
        const projectName = conv.project_id ? projectMap[conv.project_id] : null;
        console.log(`Chat ${conv.id}: project_id=${conv.project_id}, projectName=${projectName}`);
        
        return {
          id: conv.id,
          title: conv.title || 'Untitled Chat',
          model: conv.model_used || 'Unknown',
          time: formatTime(conv.updated_at),
          messages: conv.message_count,
          project: conv.project_id,
          projectName: projectName
        };
      });
      
      console.log('Formatted chats:', formattedChats);
      setChats(formattedChats);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setChats([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadProjectsForFilter = useCallback(async () => {
    try {
      const data = await apiService.getProjects(userId);
      console.log('Projects for filter:', data);
      setAvailableProjects(data);
    } catch (error) {
      console.error('Failed to load projects for filter:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
    loadProjectsForFilter();
  }, [loadConversations, loadProjectsForFilter]);

  // Project id -> name lookup, used to label backend search results too
  const projectNameById = useMemo(() => {
    const map = {};
    availableProjects.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [availableProjects]);

  // Backend content search (over message bodies), debounced. A query of <2 chars
  // falls back to the local title/model filter over the already-loaded list.
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const data = await apiService.searchConversations(userId, query);
      if (cancelled) return;
      const mapped = (data.results || []).map(r => ({
        id: r.id,
        title: r.title || 'Untitled Chat',
        model: r.model_used || 'Unknown',
        time: formatTime(r.updated_at),
        messages: r.message_count,
        project: r.project_id,
        projectName: r.project_id ? projectNameById[r.project_id] : null,
        snippet: r.snippet || null
      }));
      setSearchResults(mapped);
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [searchQuery, userId, projectNameById]);

  const projectOptions = useMemo(() => {
    const options = [
      { value: 'all', label: 'ALL PROJECTS' },
      { value: 'none', label: 'NO PROJECT' }
    ];
    
    availableProjects.forEach(proj => {
      options.push({
        value: proj.id.toString(), // Ensure string for comparison
        label: proj.name.toUpperCase()
      });
    });
    
    return options;
  }, [availableProjects]);

  const matchesProjectFilter = useCallback((chat) => {
    if (selectedProject === 'all') return true;
    if (selectedProject === 'none') return chat.project === null || chat.project === undefined;
    return chat.project && chat.project.toString() === selectedProject.toString();
  }, [selectedProject]);

  const filteredChats = useMemo(() => {
    // When the backend content search is active, use its results (which match
    // message bodies, not just titles); otherwise filter the loaded list locally.
    const source = searchResults !== null
      ? searchResults
      : chats.filter(chat =>
          chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.model.toLowerCase().includes(searchQuery.toLowerCase()));
    return source.filter(matchesProjectFilter);
  }, [chats, searchResults, searchQuery, matchesProjectFilter]);

  const handleChatClick = (chatId) => {
    navigate(`/chat?conversation=${chatId}`);
  };

  const handleCheckboxClick = (e, chatId) => {
    e.stopPropagation();
    
    if (selectedChats.includes(chatId)) {
      setSelectedChats(selectedChats.filter(id => id !== chatId));
    } else {
      setSelectedChats([...selectedChats, chatId]);
    }
  };

  const handleClearSelection = () => {
    setSelectedChats([]);
  };

  const handleDeleteSelected = async () => {
    const confirmed = await notify.confirm({
      title: 'Delete Conversations',
      message: `Delete ${selectedChats.length} conversation${selectedChats.length > 1 ? 's' : ''}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      try {
        for (const chatId of selectedChats) {
          await apiService.deleteConversation(chatId);
        }
        await loadConversations();
        setSelectedChats([]);
        notify.success(`${selectedChats.length} conversation${selectedChats.length > 1 ? 's' : ''} deleted`);
      } catch (error) {
        console.error('Failed to delete conversations:', error);
        notify.error('Failed to delete conversations');
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="page-title">CHAT HISTORY</h1>
          <p className="page-subtitle">
            {isLoading ? 'Loading...' : `${chats.length} conversation${chats.length !== 1 ? 's' : ''}`}
          </p>
        </motion.div>

        <div className="page-main-content">
          <motion.div 
            className="controls-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
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
          </motion.div>

          <AnimatePresence>
            {selectedChats.length > 0 && (
              <motion.div 
                className="action-bar"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
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
            </motion.div>
            )}
          </AnimatePresence>

          {isLoading ? (
            <div className="empty-state">
              <Clock size={60} className="empty-state-icon" />
              <h3 className="empty-state-title">LOADING...</h3>
              <p className="empty-state-text">Fetching your conversations</p>
            </div>
          ) : filteredChats.length === 0 ? (
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
            <motion.div 
              className="list-layout chat-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <AnimatePresence>
                {filteredChats.map((chat, index) => (
                  <motion.div
                    key={chat.id}
                    className={`list-item list-item-clickable chat-item ${selectedChats.includes(chat.id) ? 'selected' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    whileHover={{ x: 6, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                  <div 
                    className="chat-checkbox-container"
                    onClick={(e) => handleCheckboxClick(e, chat.id)}
                  >
                    <div className={`chat-checkbox ${selectedChats.includes(chat.id) ? 'checked' : ''}`}>
                      {selectedChats.includes(chat.id) && <Check size={14} />}
                    </div>
                  </div>

                  <MessageSquare size={20} className="chat-icon" />
                  
                  <div className="chat-content" onClick={() => handleChatClick(chat.id)}>
                    <h3 className="chat-title">{chat.title}</h3>
                    {chat.snippet && (
                      <p className="chat-snippet">{chat.snippet}</p>
                    )}
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
                  
                  {/*FIXED: Always show project info */}
                  {chat.projectName ? (
                    <span className="project-badge">{chat.projectName}</span>
                  ) : (
                    <span className="no-project-badge">NO PROJECT</span>
                  )}
                  
                  <ChevronRight 
                    size={18} 
                    className="chevron-icon" 
                    onClick={() => handleChatClick(chat.id)}
                  />
                </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;