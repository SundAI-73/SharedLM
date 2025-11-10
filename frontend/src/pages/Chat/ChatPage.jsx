import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Star, Edit3, Trash2, MoreVertical, Paperclip, FolderOpen, X } from 'lucide-react';
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

const formatMessage = (text) => {
  if (!text) return '';
  
  let formatted = text;
  formatted = formatted.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  formatted = formatted.split('\n\n').map(para => {
    return para.trim() ? `<p>${para.replace(/\n/g, ' ')}</p>` : '';
  }).join('');
  
  if (!formatted.includes('<p>')) {
    formatted = `<p>${formatted}</p>`;
  }
  
  return formatted;
};

const generateChatTitle = (userMessage) => {
  const message = userMessage.toLowerCase();
  const cleaned = message
    .replace(/^(what|how|why|when|where|who|can|could|would|should|is|are|do|does|tell me|explain|show me|help me with)\s+/i, '')
    .replace(/\?+$/, '')
    .trim();
  
  const title = cleaned
    .split(' ')
    .slice(0, 6)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return title.length > 40 ? title.substring(0, 40) + '...' : title;
};

const Message = React.memo(({ msg }) => {
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

const defaultModelVariants = {
  mistral: [
    { value: 'mistral-small-latest', label: 'SMALL' },
    { value: 'mistral-medium-latest', label: 'MEDIUM' },
    { value: 'mistral-large-latest', label: 'LARGE' },
    { value: 'open-mistral-7b', label: '7B' },
    { value: 'open-mixtral-8x7b', label: '8X7B' },
    { value: 'open-mixtral-8x22b', label: '8X22B' }
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4O' },
    { value: 'gpt-4o-mini', label: 'GPT-4O MINI' },
    { value: 'gpt-4-turbo', label: 'GPT-4 TURBO' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 TURBO' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'SONNET 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'SONNET 3.5' },
    { value: 'claude-3-5-haiku-20241022', label: 'HAIKU 3.5' },
    { value: 'claude-3-opus-20240229', label: 'OPUS 3' },
    { value: 'claude-3-sonnet-20240229', label: 'SONNET 3' },
    { value: 'claude-3-haiku-20240307', label: 'HAIKU 3' }
  ]
};

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
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [selectedModelVariant, setSelectedModelVariant] = useState('mistral-small-latest');
  
  const [modelProviders, setModelProviders] = useState([
    { value: 'mistral', label: 'MISTRAL AI' },
    { value: 'openai', label: 'OPENAI' },
    { value: 'anthropic', label: 'ANTHROPIC' }
  ]);
  const [modelVariants, setModelVariants] = useState(defaultModelVariants);
  
  const messagesEndRef = useRef(null);
  const optionsRef = useRef(null);
  const titleInputRef = useRef(null);
  const initialMessageSent = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadCustomIntegrations = async () => {
      if (!userId) return;

      try {
        const integrations = await apiService.getCustomIntegrations(userId);

        const customProviders = integrations.map(int => ({
          value: int.provider_id,
          label: int.name.toUpperCase(),
          isCustom: true
        }));

        setModelProviders(prev => [
          ...prev.filter(p => !p.isCustom),
          ...customProviders
        ]);

        const customVariants = {};
        integrations.forEach(int => {
          customVariants[int.provider_id] = [];
        });

        setModelVariants(prev => ({
          ...defaultModelVariants,
          ...customVariants
        }));

      } catch (error) {
        console.error('Failed to load custom integrations:', error);
      }
    };

    loadCustomIntegrations();
  }, [userId]);

  useEffect(() => {
    const variants = modelVariants[currentModel] || [];
    if (variants.length > 0 && !variants.find(v => v.value === selectedModelVariant)) {
      setSelectedModelVariant(variants[0].value);
    } else if (variants.length === 0) {
      setSelectedModelVariant('');
    }
  }, [currentModel, selectedModelVariant, modelVariants]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [location.search]);

  const loadConversation = async (conversationId) => {
    try {
      setLoading(true);
      
      const loadedMessages = await apiService.getMessages(conversationId);
      
      if (!loadedMessages || loadedMessages.length === 0) {
        console.warn('No messages found for conversation:', conversationId);
        setMessages([]);
        setLoading(false);
        return;
      }
      
      setMessages(loadedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        model: msg.model,
        timestamp: msg.created_at
      })));
      
      setCurrentConversationId(parseInt(conversationId));
      
      const conversations = await apiService.getConversations(userId);
      const conversation = conversations.find(c => c.id === parseInt(conversationId));
      
      if (conversation) {
        setChatTitle(conversation.title || '');
        if (conversation.project_id) {
          setSelectedProject({ id: conversation.project_id, name: 'Project' });
        } else {
          setSelectedProject(null);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setMessages([{
        role: 'assistant',
        content: 'Failed to load conversation. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { projectId, projectName, initialMessage } = location.state || {};
    const urlParams = new URLSearchParams(location.search);
    const conversationId = urlParams.get('conversation');
    
    if (projectId && projectName) {
      setSelectedProject({ id: projectId, name: projectName });
    }

    if (initialMessage && initialMessage.trim() && !initialMessageSent.current) {
      initialMessageSent.current = true;
      setTimeout(() => {
        handleSendWithMessage(initialMessage);
      }, 200);
      
      window.history.replaceState({ projectId, projectName }, '');
    }

    if (!projectId && !projectName && !initialMessage && !conversationId) {
      setMessages([]);
      setChatTitle('');
      setCurrentConversationId(null);
      setSelectedProject(null);
      setAttachedFiles([]);
      initialMessageSent.current = false;
    }
  }, [location]);

  useEffect(() => {
    if (!currentModel) setCurrentModel('mistral');
  }, [currentModel, setCurrentModel]);

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

  useEffect(() => {
    if (messages.length === 2 && !chatTitle) {
      const firstMessage = messages.find(m => m.role === 'user');
      if (firstMessage) {
        const title = generateChatTitle(firstMessage.content);
        setChatTitle(title);
        
        if (currentConversationId) {
          apiService.updateConversationTitle(currentConversationId, title).catch(err => {
            console.error('Failed to update title:', err);
          });
        }
      }
    }
  }, [messages, chatTitle, currentConversationId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      setLoading(true);
      
      let convId = currentConversationId;
      if (!convId) {
        const conv = await apiService.createConversation(
          userId,
          null,
          selectedModelVariant,
          selectedProject?.id || null
        );
        convId = conv.id;
        setCurrentConversationId(convId);
      }
      
      const result = await apiService.uploadFile(file, userId, convId);
      
      if (result.success) {
        setAttachedFiles(prev => [...prev, result.file]);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (filename) => {
    setAttachedFiles(prev => prev.filter(f => f.filename !== filename));
  };

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
      
      const response = await apiService.sendMessage(
        userId, 
        messageText, 
        modelToUse,
        currentConversationId,
        selectedProject?.id || null,
        selectedModelVariant
      );

      if (response) {
        if (!currentConversationId && response.conversation_id) {
          setCurrentConversationId(response.conversation_id);
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.reply,
          model: selectedModelVariant,
          memories: response.memories,
          timestamp: new Date().toISOString()
        }]);
        
        setAttachedFiles([]);
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
  }, [currentModel, selectedModelVariant, userId, currentConversationId, selectedProject]);

  const handleSend = useCallback(() => {
    handleSendWithMessage(input);
    setInput('');
  }, [input, handleSendWithMessage]);

  const handleRename = useCallback(() => {
    setEditedTitle(chatTitle);
    setIsEditingTitle(true);
    setShowOptions(false);
  }, [chatTitle]);

  const handleSaveTitle = useCallback(async () => {
    if (editedTitle.trim() && currentConversationId) {
      try {
        await apiService.updateConversationTitle(currentConversationId, editedTitle.trim());
        setChatTitle(editedTitle.trim());
      } catch (error) {
        console.error('Failed to update title:', error);
      }
    }
    setIsEditingTitle(false);
  }, [editedTitle, currentConversationId]);

  const handleDelete = useCallback(async () => {
    if (window.confirm('Delete this conversation?')) {
      if (currentConversationId) {
        try {
          await apiService.deleteConversation(currentConversationId);
        } catch (error) {
          console.error('Failed to delete:', error);
        }
      }
      setMessages([]);
      setChatTitle('');
      setCurrentConversationId(null);
      setShowOptions(false);
      navigate('/chat');
    }
  }, [navigate, currentConversationId]);

  const handleStarChat = async () => {
    if (currentConversationId) {
      try {
        await apiService.toggleStarConversation(currentConversationId);
      } catch (error) {
        console.error('Failed to star chat:', error);
      }
    }
    setShowOptions(false);
  };

  return (
    <div className="chat-page-container">
      <div className="chat-page-content">
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
                  <h1 className="chat-title-display">{chatTitle || 'NEW CHAT'}</h1>
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
                    <button className="option-item" onClick={handleStarChat}>
                      <Star size={16} />
                      <span>Star</span>
                    </button>
                    <button className="option-item danger" onClick={handleDelete}>
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <img src={logo} alt="SharedLM" className="chat-top-bar-logo" />

            <div className="chat-right-section">
              <CustomDropdown
                value={currentModel}
                onChange={setCurrentModel}
                options={modelProviders.filter(opt =>
                  availableModels.includes(opt.value) || opt.value === 'mistral' || opt.isCustom
                )}
                className="chat-model-dropdown-custom"
              />
              
              {modelVariants[currentModel]?.length > 0 && (
                <CustomDropdown
                  value={selectedModelVariant}
                  onChange={setSelectedModelVariant}
                  options={modelVariants[currentModel]}
                  className="chat-model-dropdown-custom"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="chat-top-bar">
            <div className="chat-right-section">
              <CustomDropdown
                value={currentModel}
                onChange={setCurrentModel}
                options={modelProviders.filter(opt =>
                  availableModels.includes(opt.value) || opt.value === 'mistral' || opt.isCustom
                )}
                className="chat-model-dropdown-custom"
              />
              
              {modelVariants[currentModel]?.length > 0 && (
                <CustomDropdown
                  value={selectedModelVariant}
                  onChange={setSelectedModelVariant}
                  options={modelVariants[currentModel]}
                  className="chat-model-dropdown-custom"
                />
              )}
            </div>
          </div>
        )}

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
                <Message key={idx} msg={msg} />
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

        <div className="chat-input-wrapper">
          {attachedFiles.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '8px 16px',
              flexWrap: 'wrap'
            }}>
              {attachedFiles.map((file, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#1F1F1F',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  color: '#888888'
                }}>
                  <Paperclip size={12} />
                  <span>{file.filename}</span>
                  <button
                    onClick={() => handleRemoveFile(file.filename)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#666666',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="chat-input-container">
            <button 
              className="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
            />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleSend();
              }}
              placeholder="Type your message here..."
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