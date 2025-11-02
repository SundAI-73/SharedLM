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

// Message formatter utilities - NO EMOJIS
const formatMessage = (text) => {
  if (!text) return '';
  
  let formatted = text;
  
  // Remove all emojis first
  formatted = formatted.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  
  // Convert bold markdown: **text** -> <strong>text</strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic: *text* -> <em>text</em>
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Code blocks: `code` -> <code>code</code>
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert double line breaks to paragraphs
  formatted = formatted.split('\n\n').map(para => {
    return para.trim() ? `<p>${para.replace(/\n/g, ' ')}</p>` : '';
  }).join('');
  
  // If no paragraphs were created, wrap in paragraph
  if (!formatted.includes('<p>')) {
    formatted = `<p>${formatted}</p>`;
  }
  
  return formatted;
};

// Generate smart title from conversation
const generateChatTitle = (userMessage, assistantMessage) => {
  // Try to extract a topic from the user's message
  const message = userMessage.toLowerCase();
  
  // Remove common question words and get key topic
  const cleaned = message
    .replace(/^(what|how|why|when|where|who|can|could|would|should|is|are|do|does|tell me|explain|show me|help me with)\s+/i, '')
    .replace(/\?+$/, '')
    .trim();
  
  // Capitalize first letter of each word
  const title = cleaned
    .split(' ')
    .slice(0, 6) // Take first 6 words max
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Limit to 40 characters
  return title.length > 40 ? title.substring(0, 40) + '...' : title;
};

// Enhanced message component with formatting
const Message = React.memo(({ msg, idx }) => {
  const formattedContent = formatMessage(msg.content);
  
  return (
    <div className={`chat-message ${msg.role}`}>
      <div className="message-avatar">
        {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
      </div>
      <div className="message-content">
        <div 
          className="message-text"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
        {msg.model && (
          <div className="message-meta">
            <span className="message-model">{msg.model.toUpperCase()}</span>
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
  );
});

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

  // Auto-generate smart title
  useEffect(() => {
    if (messages.length === 2 && !chatTitle) {
      const userMessage = messages.find(m => m.role === 'user');
      const assistantMessage = messages.find(m => m.role === 'assistant');
      
      if (userMessage && assistantMessage) {
        const title = generateChatTitle(userMessage.content, assistantMessage.content);
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