import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Bot, User, Star, Edit3, Trash2, MoreVertical, Paperclip, FolderOpen, FolderPlus } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import apiService from '../../services/api/index';
import logo from '../../assets/images/logo main.svg';
import './styles/chat-base.css';
import './styles/chat-header.css';
import './styles/chat-messages.css';
import './styles/chat-input.css';
import './styles/chat-responsive.css';

// Memoized message component
const Message = React.memo(({ msg, idx }) => (
  <div className={`chat-message ${msg.role}`}>
    <div className="message-avatar">
      {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
    </div>
    <div className="message-content">
      <div className="message-text">{msg.content}</div>
      {msg.model && (
        <div className="message-meta">
          <span className="message-model">{msg.model}</span>
          <span className="message-time">
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      )}
    </div>
  </div>
));

Message.displayName = 'Message';

function ChatPage({ backendStatus }) {
  const { userId, currentModel, setCurrentModel } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState(['mistral', 'openai', 'anthropic']);
  const [chatTitle, setChatTitle] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  
  const messagesEndRef = useRef(null);
  const optionsRef = useRef(null);
  const titleInputRef = useRef(null);
  const initialMessageSent = useRef(false);

  // Memoize model options
  const modelOptions = useMemo(() => [
    { value: 'mistral', label: 'MISTRAL AI' },
    { value: 'openai', label: 'GPT-4' },
    { value: 'anthropic', label: 'CLAUDE' }
  ], []);

  // Handle project state from navigation
  useEffect(() => {
    const { projectId, projectName, initialMessage } = location.state || {};
    
    if (projectId && projectName) {
      setSelectedProject({ id: projectId, name: projectName });
    } else {
      setSelectedProject(null);
    }

    if (initialMessage && initialMessage.trim() && !initialMessageSent.current) {
      initialMessageSent.current = true;
      setTimeout(() => {
        handleSendWithMessage(initialMessage);
      }, 200);
      
      window.history.replaceState({ projectId, projectName }, '');
    }

    if (!projectId && !projectName && !initialMessage) {
      setMessages([]);
      setChatTitle('');
      initialMessageSent.current = false;
    }
  }, [location]);

  // Initialize model
  useEffect(() => {
    if (!currentModel) setCurrentModel('mistral');
  }, [currentModel, setCurrentModel]);

  // Fetch available models
  useEffect(() => {
    if (backendStatus === 'connected') {
      apiService.getModels().then(data => {
        if (data) setAvailableModels(data.available_models);
      });
    } else {
      setAvailableModels(['mistral']);
      setCurrentModel('mistral');
    }
  }, [backendStatus, setCurrentModel]);

  // Auto-generate title
  useEffect(() => {
    if (messages.length === 2 && !chatTitle) {
      const firstMessage = messages.find(m => m.role === 'user');
      if (firstMessage) {
        const title = firstMessage.content.slice(0, 40) + 
          (firstMessage.content.length > 40 ? '...' : '');
        setChatTitle(title);
      }
    }
  }, [messages, chatTitle]);

  // Close options on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus title input
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendWithMessage = useCallback(async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const modelToUse = currentModel || 'mistral';
      const response = await apiService.sendMessage(userId, messageText, modelToUse);

      if (response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.reply,
          model: response.used_model || modelToUse,
          memories: response.memories,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection issue. Please check settings or try again.',
        model: 'mistral',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  }, [currentModel, userId]);

  const handleSend = useCallback(() => {
    handleSendWithMessage(input);
    setInput('');
  }, [input, handleSendWithMessage]);

  const handleRename = useCallback(() => {
    setEditedTitle(chatTitle);
    setIsEditingTitle(true);
    setShowOptions(false);
  }, [chatTitle]);

  const handleSaveTitle = useCallback(() => {
    if (editedTitle.trim()) setChatTitle(editedTitle.trim());
    setIsEditingTitle(false);
  }, [editedTitle]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Delete this conversation?')) {
      setMessages([]);
      setChatTitle('');
      setShowOptions(false);
      navigate('/chat');
    }
  }, [navigate]);

  return (
    <div className="chat-page-container">
      <div className="chat-page-content">
        {/* Top Bar */}
        {messages.length > 0 ? (
          <div className="chat-top-bar-with-content">
            <div className="chat-left-section">
              {selectedProject && (
                <>
                  <button 
                    className="chat-project-badge" 
                    onClick={() => navigate(`/projects/${selectedProject.id}`)}
                  >
                    <FolderOpen size={14} />
                    <span>{selectedProject.name}</span>
                  </button>
                  <div className="title-divider">/</div>
                </>
              )}

              <div className="chat-title-wrapper" ref={optionsRef}>
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    onBlur={handleSaveTitle}
                    className="chat-title-input"
                  />
                ) : (
                  <h1 className="chat-title-display">{chatTitle}</h1>
                )}

                <button
                  className="chat-title-dropdown-btn"
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <MoreVertical size={16} />
                </button>

                {showOptions && !isEditingTitle && (
                  <div className="chat-title-options-menu">
                    <button className="option-item" onClick={handleRename}>
                      <Edit3 size={16} />
                      <span>Rename</span>
                    </button>
                    <button className="option-item">
                      <Star size={16} />
                      <span>Star</span>
                    </button>
                    {!selectedProject && (
                      <button className="option-item">
                        <FolderPlus size={16} />
                        <span>Add to project</span>
                      </button>
                    )}
                    <button className="option-item danger" onClick={handleDelete}>
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <img src={logo} alt="SharedLM" className="chat-top-bar-logo" />

            <CustomDropdown
              value={currentModel}
              onChange={setCurrentModel}
              options={modelOptions.filter(opt =>
                availableModels.includes(opt.value) || opt.value === 'mistral'
              )}
              className="chat-model-dropdown-custom"
            />
          </div>
        ) : (
          <div className="chat-top-bar">
            <CustomDropdown
              value={currentModel}
              onChange={setCurrentModel}
              options={modelOptions.filter(opt =>
                availableModels.includes(opt.value) || opt.value === 'mistral'
              )}
              className="chat-model-dropdown-custom"
            />
          </div>
        )}

        {/* Messages */}
        <div className={`chat-messages-wrapper ${messages.length === 0 ? 'full-height' : ''}`}>
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="empty-state-logo-container">
                <img src={logo} alt="SharedLM Logo" className="empty-state-logo" />
              </div>
              <h2 className="empty-state-title">START A CONVERSATION</h2>
              {selectedProject && (
                <p className="empty-state-project">in {selectedProject.name}</p>
              )}
              <p className="empty-state-text">Type your message below to begin</p>
            </div>
          ) : (
            <div className="chat-messages-list">
              {messages.map((msg, idx) => (
                <Message key={idx} msg={msg} idx={idx} />
              ))}

              {loading && (
                <div className="chat-message assistant">
                  <div className="message-avatar">
                    <Bot size={20} />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="chat-input-wrapper">
          <div className="chat-input-container">
            <button className="chat-attach-btn">
              <Paperclip size={18} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleSend();
              }}
              placeholder="Message SharedLM..."
              className="chat-input-field"
              disabled={loading}
              autoFocus
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={`chat-send-btn ${input.trim() ? 'active' : ''}`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ChatPage);