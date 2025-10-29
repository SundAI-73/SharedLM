import React, { useState, useEffect, useRef } from 'react';
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

  // Model options for dropdown
  const modelOptions = [
    { value: 'mistral', label: 'MISTRAL AI' },
    { value: 'openai', label: 'GPT-4' },
    { value: 'anthropic', label: 'CLAUDE' }
  ];

  // Check if chat is from a project and handle initial message
  useEffect(() => {
    // Set project if coming from project
    const projectId = location.state?.projectId;
    const projectName = location.state?.projectName;
    if (projectId && projectName) {
      setSelectedProject({ id: projectId, name: projectName });
    } else {
      // Clear project if starting a new chat from sidebar
      setSelectedProject(null);
    }

    // Handle initial message from project chat bar - ONLY ONCE
    const initialMessage = location.state?.initialMessage;
    if (initialMessage && initialMessage.trim() && !initialMessageSent.current) {
      initialMessageSent.current = true;
      setInput('');
      // Auto-send the initial message after component mounts
      setTimeout(() => {
        handleSendWithMessage(initialMessage);
      }, 200);
      
      // Clear the state to prevent re-sending on re-render
      window.history.replaceState({
        projectId,
        projectName
      }, '');
    }

    // Reset for new chats
    if (!projectId && !projectName && !initialMessage) {
      setMessages([]);
      setChatTitle('');
      initialMessageSent.current = false;
    }
  }, [location]);

  // Initialize with Mistral as default
  useEffect(() => {
    if (!currentModel) {
      setCurrentModel('mistral');
    }
  }, [currentModel, setCurrentModel]);

  useEffect(() => {
    const fetchModels = async () => {
      const modelsData = await apiService.getModels();
      if (modelsData) {
        setAvailableModels(modelsData.available_models);
      }
    };
    if (backendStatus === 'connected') {
      fetchModels();
    } else {
      setAvailableModels(['mistral']);
      setCurrentModel('mistral');
    }
  }, [backendStatus, setCurrentModel]);

  // Auto-generate title from first message
  useEffect(() => {
    if (messages.length === 2 && !chatTitle) {
      const firstMessage = messages.find(m => m.role === 'user');
      if (firstMessage) {
        const title = firstMessage.content.slice(0, 40) + (firstMessage.content.length > 40 ? '...' : '');
        setChatTitle(title);
      }
    }
  }, [messages, chatTitle]);

  // Close options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing title
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendWithMessage = async (messageText) => {
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
      const response = await apiService.sendMessage(userId, userMessage.content, modelToUse);

      if (response) {
        const assistantMessage = {
          role: 'assistant',
          content: response.reply,
          model: response.used_model || modelToUse,
          memories: response.memories,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize for the connection issue. Please check your settings or try again.',
        model: 'mistral',
        error: false,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    handleSendWithMessage(input);
    setInput('');
  };

  const handleRename = () => {
    setEditedTitle(chatTitle);
    setIsEditingTitle(true);
    setShowOptions(false);
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      setChatTitle(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleDelete = () => {
    if (window.confirm('Delete this conversation?')) {
      setMessages([]);
      setChatTitle('');
      setShowOptions(false);
      navigate('/chat');
    }
  };

  const handleProjectClick = () => {
    if (selectedProject) {
      navigate(`/projects/${selectedProject.id}`);
    }
  };

  const handleAddToProject = () => {
    // TODO: Implement add to project functionality
    console.log('Add to project clicked');
  };

  return (
    <div className="chat-page-container">
      <div className="chat-page-content">
        {/* Top Bar - Shows when messages exist */}
        {messages.length > 0 && (
          <div className="chat-top-bar-with-content">
            {/* Left Section: Project Name / Chat Title (Claude order) */}
            <div className="chat-left-section">
              {/* Project comes FIRST - Just clickable, no dropdown */}
              {selectedProject && (
                <>
                  <button className="chat-project-badge" onClick={handleProjectClick}>
                    <FolderOpen size={14} />
                    <span>{selectedProject.name}</span>
                  </button>

                  {/* Divider */}
                  <div className="title-divider">/</div>
                </>
              )}

              {/* Chat Title comes SECOND - Has dropdown */}
              <div className="chat-title-wrapper" ref={optionsRef}>
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    onBlur={handleSaveTitle}
                    className="chat-title-input"
                  />
                ) : (
                  <h1 className="chat-title-display">{chatTitle}</h1>
                )}

                {/* Title dropdown button */}
                <button
                  className="chat-title-dropdown-btn"
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <MoreVertical size={16} />
                </button>

                {/* Title Options Menu */}
                {showOptions && !isEditingTitle && (
                  <div className="chat-title-options-menu">
                    <button className="option-item" onClick={handleRename}>
                      <Edit3 size={16} />
                      <span>Rename</span>
                    </button>
                    <button className="option-item" onClick={handleAddToProject}>
                      <Star size={16} />
                      <span>Star</span>
                    </button>
                    {!selectedProject && (
                      <button className="option-item" onClick={handleAddToProject}>
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

            {/* Center Logo */}
            <img src={logo} alt="SharedLM" className="chat-top-bar-logo" />

            {/* Model Dropdown - Right */}
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

        {/* Top Bar - Only dropdown when no messages (RIGHT SIDE) */}
        {messages.length === 0 && (
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

        {/* Chat Messages Container */}
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
                <div key={idx} className={`chat-message ${msg.role}`}>
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
              ))}

              {loading && (
                <div className="chat-message assistant">
                  <div className="message-avatar">
                    <Bot size={20} />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Input Container */}
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
                if (e.key === 'Enter' && !loading) {
                  handleSend();
                }
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

export default ChatPage;