import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, User, Star, Edit3, Trash2, MoreVertical, Paperclip, FolderOpen, X, Plus, SlidersHorizontal, Clock, ArrowUp, Search, Globe, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import DOMPurify from 'dompurify';
import { useUser } from '../../contexts/UserContext';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import ConnectorsModal from '../../components/ConnectorsModal/ConnectorsModal';
import apiService from '../../services/api/index';
import { logEvent, EventType, LogLevel } from '../../utils/auditLogger';
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
  
  // Sanitize HTML to prevent XSS attacks
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
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

// Get time-based greeting
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 22) return 'Evening';
  return 'Night';
};

// Get user's display name
const getUserDisplayName = () => {
  const name = localStorage.getItem('sharedlm_user_name') || localStorage.getItem('sharedlm_user_email')?.split('@')[0] || 'there';
  return name.split(' ')[0]; // Get first name only
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
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);
  
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
  const settingsMenuRef = useRef(null);
  const historyMenuRef = useRef(null);
  const previousModelRef = useRef(currentModel);
  const previousModelVariantRef = useRef(selectedModelVariant);
  const modelChangedDuringLoadingRef = useRef(false);

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

  // Handle model changes - only create new chat if model actually changed and there are messages
  useEffect(() => {
    // Skip if model hasn't actually changed (initial render or same value)
    if (previousModelRef.current === currentModel && previousModelVariantRef.current === selectedModelVariant) {
      // If loading just finished and model changed during loading, handle it now
      if (!loading && modelChangedDuringLoadingRef.current) {
        modelChangedDuringLoadingRef.current = false;
        const hasMessages = messages.length > 0;
        const hasConversation = currentConversationId !== null;

        if (hasMessages || hasConversation) {
          // Clear current conversation state to start new chat
          setMessages([]);
          setChatTitle('');
          setCurrentConversationId(null);
          setAttachedFiles([]);
          initialMessageSent.current = false;
          // Navigate to new chat (clear conversation ID from URL)
          navigate('/chat', { replace: true });
        }
      }
      return;
    }

    // Check if model actually changed
    const modelChanged = previousModelRef.current !== currentModel || previousModelVariantRef.current !== selectedModelVariant;
    
    if (!modelChanged) {
      return;
    }

    // Update refs to track current model
    previousModelRef.current = currentModel;
    previousModelVariantRef.current = selectedModelVariant;

    // Skip navigation if currently loading - mark that model changed during loading
    // The CustomDropdown fix ensures onChange is only called when value actually changes,
    // so if we're here, the model did change. But we don't want to interrupt a loading message.
    if (loading) {
      modelChangedDuringLoadingRef.current = true;
      return;
    }

    // Only create new chat if there are existing messages or an active conversation
    // Don't create new chat if user is on a fresh/empty chat
    const hasMessages = messages.length > 0;
    const hasConversation = currentConversationId !== null;

    if (hasMessages || hasConversation) {
      // Clear current conversation state to start new chat
      setMessages([]);
      setChatTitle('');
      setCurrentConversationId(null);
      setAttachedFiles([]);
      initialMessageSent.current = false;
      // Navigate to new chat (clear conversation ID from URL)
      navigate('/chat', { replace: true });
    }
  }, [currentModel, selectedModelVariant, messages.length, currentConversationId, loading, navigate]);

  const loadConversation = useCallback(async (conversationId) => {
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
  }, [userId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [location.search, loadConversation]);

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
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
        setShowSettingsMenu(false);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target)) {
        setShowHistoryMenu(false);
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

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type - check extension and MIME type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.csv', '.xlsx'];
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension) || !allowedTypes.includes(file.type)) {
      // Log invalid file upload attempt
      logEvent(EventType.INVALID_INPUT, LogLevel.WARNING, 'Invalid file type upload attempt', {
        fileName: file.name,
        fileType: file.type,
        fileExtension
      });
      
      alert('Invalid file type. Please upload PDF, DOC, DOCX, TXT, PNG, JPG, CSV, or XLSX files only.');
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
        // Log successful file upload
        logEvent(EventType.FILE_UPLOAD, LogLevel.INFO, 'File uploaded successfully', {
          userId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          conversationId: convId
        });
        
        setAttachedFiles(prev => [...prev, result.file]);
      }
    } catch (error) {
      // Log file upload error
      logEvent(EventType.FILE_UPLOAD, LogLevel.ERROR, 'File upload failed', {
        userId,
        fileName: file.name,
        error: error.message
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.error('File upload failed:', error);
      }
      alert(error.message.includes('Rate limit') ? error.message : 'Failed to upload file. Please try again.');
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

    // Sanitize user input before sending
    const sanitizedMessage = messageText.trim();
    
    // Check for potential XSS in user input
    const xssPatterns = [/<script[^>]*>/i, /javascript:/i, /onerror=/i, /onload=/i];
    if (xssPatterns.some(pattern => pattern.test(sanitizedMessage))) {
      logEvent(EventType.XSS_ATTEMPT, LogLevel.SECURITY, 'Potential XSS attempt in chat message', {
        userId,
        messagePreview: sanitizedMessage.substring(0, 50)
      });
      // Still allow the message but it will be sanitized on display
    }

    const userMessage = {
      role: 'user',
      content: sanitizedMessage,
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
      // Log chat error
      logEvent(EventType.ERROR, LogLevel.ERROR, 'Chat message error', {
        userId,
        error: error.message,
        model: selectedModelVariant
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.error('Chat error:', error);
      }
      
      const errorMessage = error.message.includes('Rate limit') 
        ? error.message 
        : error.message.includes('Session expired')
        ? 'Your session has expired. Please refresh the page.'
        : 'Connection issue. Please check settings or try again.';
        
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        model: 'mistral',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
      // Check if model changed during loading - if so, handle it now
      // This is handled by the useEffect that watches currentModel and loading state
    }
  }, [currentModel, selectedModelVariant, userId, currentConversationId, selectedProject]);

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
  }, [location, handleSendWithMessage]);

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
          </div>
        ) : null}

        <div className={`chat-messages-wrapper ${messages.length === 0 ? 'full-height' : ''}`}>
          {messages.length === 0 ? (
            <motion.div 
              className="chat-empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <motion.div 
                className="welcome-message"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <motion.div 
                  className="welcome-logo-container"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.95, scale: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    ease: "easeOut",
                    delay: 0.3
                  }}
                >
                  <img src={logo} alt="SharedLM Logo" className="welcome-logo" />
                </motion.div>
                <motion.h2 
                  className="welcome-greeting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  {getTimeBasedGreeting()}, {getUserDisplayName()}
                </motion.h2>
                {selectedProject && (
                  <motion.p 
                    className="welcome-project"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                  >
                    in {selectedProject.name}
                  </motion.p>
                )}
              </motion.div>
            </motion.div>
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
            <div className="attached-files-container">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="attached-file-item">
                  <Paperclip size={12} />
                  <span>{file.filename}</span>
                  <button
                    onClick={() => handleRemoveFile(file.filename)}
                    className="remove-file-btn"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Controls Row - Above Input */}
          <div className="chat-input-controls">
            <div className="chat-controls-left">
              <motion.button 
                className="chat-control-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Attach file"
              >
                <Plus size={18} />
              </motion.button>
              
              <motion.button 
                className="chat-control-btn"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Settings"
              >
                <SlidersHorizontal size={18} />
              </motion.button>
              
              <motion.button 
                className="chat-control-btn"
                onClick={() => {
                  setShowHistoryMenu(!showHistoryMenu);
                  navigate('/history');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="History"
              >
                <Clock size={18} />
              </motion.button>
            </div>

            {/* Right Side - Model Dropdowns */}
            <div className="chat-controls-right">
              <CustomDropdown
                value={currentModel}
                onChange={setCurrentModel}
                options={modelProviders.filter(opt =>
                  availableModels.includes(opt.value) || opt.value === 'mistral' || opt.isCustom
                )}
                className="chat-model-dropdown-inline"
              />
              
              {modelVariants[currentModel]?.length > 0 && (
                <CustomDropdown
                  value={selectedModelVariant}
                  onChange={setSelectedModelVariant}
                  options={modelVariants[currentModel]}
                  className="chat-model-dropdown-inline"
                />
              )}
            </div>
          </div>

          {/* Main Input Field with Send Button Inside */}
          <div className="chat-input-main">
            <div className="chat-input-container-main">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading && input.trim()) handleSend();
                }}
                placeholder="How can I help you today?"
                className="chat-input-field-main"
                disabled={loading}
                autoFocus
              />
              <motion.button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`chat-send-btn-inside ${input.trim() ? 'active' : ''}`}
                whileHover={input.trim() ? { scale: 1.05 } : {}}
                whileTap={input.trim() ? { scale: 0.95 } : {}}
              >
                <ArrowUp size={18} />
              </motion.button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
          />

          {/* Settings Menu */}
          {showSettingsMenu && (
            <div className="chat-settings-menu" ref={settingsMenuRef}>
              <div className="settings-menu-item">
                <div className="settings-menu-item-left">
                  <Clock size={16} className="settings-menu-icon" />
                  <span>Extended thinking</span>
                </div>
                <label className="toggle-switch-small">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider-small"></span>
                </label>
              </div>
              <div className="settings-menu-item">
                <div className="settings-menu-item-left">
                  <Search size={16} className="settings-menu-icon" />
                  <span>Research</span>
                </div>
                <label className="toggle-switch-small">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider-small"></span>
                </label>
              </div>
              <div className="settings-menu-item">
                <div className="settings-menu-item-left">
                  <Globe size={16} className="settings-menu-icon" />
                  <span>Web search</span>
                </div>
                <label className="toggle-switch-small">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider-small"></span>
                </label>
              </div>
              <div className="settings-menu-divider"></div>
              <div 
                className="settings-menu-item settings-menu-action"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowConnectorsModal(true);
                }}
              >
                <div className="settings-menu-item-left">
                  <Plus size={16} className="settings-menu-icon" />
                  <span>Add connectors</span>
                </div>
              </div>
              <div 
                className="settings-menu-item settings-menu-action"
                onClick={() => {
                  setShowSettingsMenu(false);
                  navigate('/settings?tab=connectors');
                }}
              >
                <div className="settings-menu-item-left">
                  <Settings size={16} className="settings-menu-icon" />
                  <span>Manage connectors</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConnectorsModal
        isOpen={showConnectorsModal}
        onClose={() => setShowConnectorsModal(false)}
        onConnectorAdded={(connector) => {
          // Reload custom integrations if needed
          console.log('Connector added:', connector);
        }}
      />
    </div>
  );
}

export default React.memo(ChatPage);