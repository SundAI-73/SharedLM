import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Bot, User, Star, Edit3, FolderPlus, Trash2, MoreVertical, Paperclip } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import apiService from '../../services/api/index';
import logo from '../../assets/images/logo main.svg';
import './Chat.css';

function ChatPage({ backendStatus }) {
  const { userId, currentModel, setCurrentModel } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState(['mistral', 'openai', 'anthropic']);
  const [chatTitle, setChatTitle] = useState('Untitled');
  const [isFromProject, setIsFromProject] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const messagesEndRef = useRef(null);
  const optionsRef = useRef(null);
  const titleInputRef = useRef(null);

  // Model options for dropdown
  const modelOptions = [
    { value: 'mistral', label: 'MISTRAL AI' },
    { value: 'openai', label: 'GPT-4' },
    { value: 'anthropic', label: 'CLAUDE' }
  ];

  // Check if chat is from a project
  useEffect(() => {
    const fromProject = location.state?.fromProject || false;
    setIsFromProject(fromProject);
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
    if (messages.length === 2 && chatTitle === 'Untitled') {
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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
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
      setChatTitle('Untitled');
      setShowOptions(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="chat-page-container">
      <div className="chat-page-content">
        {/* Top Bar - Shows when messages exist */}
        {messages.length > 0 && (
          <div className="chat-top-bar-with-content">
            {/* Back button - only if from project */}
            {isFromProject && (
              <button className="chat-back-btn" onClick={handleBack}>
                <ArrowLeft size={20} />
              </button>
            )}

            {/* Chat Title with Options */}
            <div className="chat-title-section" ref={optionsRef}>
              {isEditingTitle ? (
                <div className="chat-title-edit-container">
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
                </div>
              ) : (
                <>
                  <h1 className="chat-title-display" onClick={() => setShowOptions(!showOptions)}>
                    {chatTitle}
                  </h1>
                  <button
                    className="chat-options-btn"
                    onClick={() => setShowOptions(!showOptions)}
                  >
                    <MoreVertical size={16} />
                  </button>
                </>
              )}

              {/* Options Menu */}
              {showOptions && !isEditingTitle && (
                <div className="chat-options-menu">
                  <button className="option-item" onClick={handleRename}>
                    <Edit3 size={16} />
                    <span>Rename</span>
                  </button>
                  <button className="option-item">
                    <Star size={16} />
                    <span>Star</span>
                  </button>
                  <button className="option-item">
                    <FolderPlus size={16} />
                    <span>Add to project</span>
                  </button>
                  <button className="option-item danger" onClick={handleDelete}>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Center Logo */}
            <img src={logo} alt="SharedLM" className="chat-top-bar-logo" />

            {/* Model Dropdown */}
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

        {/* Top Bar - Only dropdown when no messages */}
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
