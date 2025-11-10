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
    { value: 'open-mistral-7b', label: '7B' },
    { value: 'open-mixtral-8x7b', label: '8X7B' }
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
  const [selectedModelVariant, setSelectedModelVariant] = useState('mistral-medium-latest');
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
    const isCustomIntegration = currentModel && currentModel.startsWith('custom_');
    
    if (variants.length > 0) {
      // If current variant is not in the list, select the first one
      if (!variants.find(v => v.value === selectedModelVariant)) {
        setSelectedModelVariant(variants[0].value);
      }
    } else {
      // No variants available - clear the variant
      // For custom integrations, this is expected (they don't have variants)
      // For standard providers, this shouldn't happen, but we'll clear it anyway
      if (isCustomIntegration || variants.length === 0) {
        setSelectedModelVariant('');
      }
    }
    
    // If switching to a custom integration and current variant is from a standard provider, clear it
    if (isCustomIntegration && selectedModelVariant) {
      if (selectedModelVariant.includes('mistral') || 
          selectedModelVariant.includes('gpt') || 
          selectedModelVariant.includes('claude')) {
        setSelectedModelVariant('');
      }
    }
  }, [currentModel, selectedModelVariant, modelVariants]);

  // Handle model changes - update refs but DO NOT clear conversation
  // Users should stay in the same chat when changing models
  useEffect(() => {
    // Update refs to track current model
    previousModelRef.current = currentModel;
    previousModelVariantRef.current = selectedModelVariant;
    // Reset the flag if it was set
    modelChangedDuringLoadingRef.current = false;
  }, [currentModel, selectedModelVariant]);

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

  // Ref to track if we're updating URL after sending a message
  // This prevents reloading conversation when we just added a message
  const isUpdatingUrlRef = useRef(false);
  // Ref to track if we're currently sending a message
  const isSendingMessageRef = useRef(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const conversationId = urlParams.get('conversation');
    
    // Skip loading if we're in the middle of updating URL after sending a message
    if (isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      return;
    }
    
    // Don't load conversation if we're currently sending a message
    // This prevents clearing messages that are being added
    if (isSendingMessageRef.current) {
      return;
    }
    
    // Only load conversation if:
    // 1. There's a conversation ID in the URL
    // 2. It's different from the current conversation ID
    // 3. We don't have messages in state (to avoid clearing active chat)
    // This prevents reloading when we just updated the URL with the same conversation
    if (conversationId) {
      const convIdInt = parseInt(conversationId);
      // Only load if it's a different conversation AND we don't have messages
      // If we have messages, we're already in an active chat and shouldn't reload
      if (convIdInt !== currentConversationId && messages.length === 0) {
        loadConversation(conversationId);
      }
    }
  }, [location.search, loadConversation, currentConversationId, messages.length]);

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
        // Update URL to include conversation ID so user stays in this chat
        navigate(`/chat?conversation=${convId}`, { replace: true });
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
    isSendingMessageRef.current = true; // Mark that we're sending a message

    // Define variables outside try block so they're accessible in catch
    const modelToUse = currentModel || 'mistral';
    
    // Check if it's a custom integration
    const isCustomIntegration = modelToUse && modelToUse.startsWith('custom_');
    
    // Ensure we have a valid model variant
    let modelVariantToUse = selectedModelVariant;
    let displayModelName = modelVariantToUse; // For display in UI
    
    if (!modelVariantToUse || modelVariantToUse.trim() === '') {
      // Default to first available variant for the current model
      const variants = modelVariants[modelToUse] || [];
      if (variants.length > 0) {
        modelVariantToUse = variants[0].value;
        displayModelName = modelVariantToUse;
        setSelectedModelVariant(modelVariantToUse);
      } else {
        // For custom integrations with no variants, use 'default' as model name for API
        // but use integration name for display
        if (isCustomIntegration) {
          const provider = modelProviders.find(p => p.value === modelToUse);
          modelVariantToUse = 'default'; // API expects a model name
          displayModelName = provider ? provider.label : modelToUse.replace('custom_', '').replace(/_/g, ' ').toUpperCase();
        } else {
          // Fallback to default based on model for standard providers
          modelVariantToUse = modelToUse === 'openai' ? 'gpt-4o-mini' :
                             modelToUse === 'anthropic' ? 'claude-3-haiku-20240307' :
                             'mistral-small-latest';
          displayModelName = modelVariantToUse;
        }
      }
    } else if (isCustomIntegration) {
      // For custom integrations, check if the variant is from a standard provider
      // If it's a mistral variant, it means we switched from mistral to custom integration
      if (modelVariantToUse.includes('mistral') || modelVariantToUse.includes('gpt') || modelVariantToUse.includes('claude')) {
        // This is a standard model variant, not for custom integration
        const provider = modelProviders.find(p => p.value === modelToUse);
        modelVariantToUse = 'default'; // Use default for API
        displayModelName = provider ? provider.label : modelToUse.replace('custom_', '').replace(/_/g, ' ').toUpperCase();
        setSelectedModelVariant(''); // Clear the incorrect variant
      } else {
        // Valid custom integration variant
        displayModelName = modelVariantToUse;
      }
    } else {
      displayModelName = modelVariantToUse;
    }

    try {
      const response = await apiService.sendMessage(
        userId, 
        messageText, 
        modelToUse,
        currentConversationId,
        selectedProject?.id || null,
        modelVariantToUse
      );

      if (response) {
        // Add the assistant's response to messages first
        // Use the model from response if available, otherwise use the display name
        // For custom integrations, response.used_model will be the integration name
        const responseModel = response.used_model || displayModelName || modelVariantToUse || selectedModelVariant;
        
        // Check if this is a new conversation (no currentConversationId but we got one back)
        const isNewConversation = !currentConversationId && response.conversation_id;
        
        // Update conversation ID first (before adding message to prevent reload)
        if (isNewConversation) {
          setCurrentConversationId(response.conversation_id);
        }
        
        // Add the assistant's response to messages
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.reply,
          model: responseModel,
          memories: response.memories,
          timestamp: new Date().toISOString()
        }]);
        
        // Update URL after a delay to ensure message is in state first
        // This prevents the useEffect from clearing messages
        if (isNewConversation) {
          // Wait for React to process the state updates before updating URL
          // Use a longer delay to ensure messages are rendered
          setTimeout(() => {
            isUpdatingUrlRef.current = true;
            navigate(`/chat?conversation=${response.conversation_id}`, { replace: true });
            // Clear flag after navigation completes to allow future loads
            setTimeout(() => {
              isUpdatingUrlRef.current = false;
            }, 300);
          }, 300);
        }
        
        setAttachedFiles([]);
      }
    } catch (error) {
      // Log chat error
      logEvent(EventType.ERROR, LogLevel.ERROR, 'Chat message error', {
        userId,
        error: error.message,
        model: modelVariantToUse || selectedModelVariant
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.error('Chat error:', error);
      }
      
      // Parse error message to extract model name if present
      let errorMessage = error.message;
      let errorModel = displayModelName || modelVariantToUse || selectedModelVariant;
      
      // Try to extract model name from error message (backend includes it)
      // Format: "Error calling {provider} API ({model_name}): {error}"
      const modelMatch = errorMessage.match(/\(([^)]+)\):/);
      if (modelMatch && modelMatch[1]) {
        errorModel = modelMatch[1];
      }
      
      // If we still don't have a model name, use fallback
      if (!errorModel || (errorModel === 'mistral-small-latest' && isCustomIntegration)) {
        if (isCustomIntegration) {
          const provider = modelProviders.find(p => p.value === modelToUse);
          errorModel = provider ? provider.label : (modelToUse || 'unknown');
        } else {
          errorModel = errorModel || modelToUse || 'unknown';
        }
      }
      
      // Format error message for display
      if (errorMessage.includes('Session expired')) {
        errorMessage = 'Your session has expired. Please refresh the page.';
      } else if (!errorMessage.includes('Rate limit') && !errorMessage.includes('API key')) {
        // For other errors, show generic message but preserve model info in errorModel
        // Rate limit and API key errors are kept as-is
        errorMessage = 'Connection issue. Please check settings or try again.';
      }
        
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        model: errorModel.toUpperCase(),
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
      // Clear the sending flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isSendingMessageRef.current = false;
      }, 500);
      // Check if model changed during loading - if so, handle it now
      // This is handled by the useEffect that watches currentModel and loading state
    }
  }, [currentModel, selectedModelVariant, userId, currentConversationId, selectedProject, modelVariants, modelProviders, navigate]);

  useEffect(() => {
    const { projectId, projectName, initialMessage, newChat } = location.state || {};
    const urlParams = new URLSearchParams(location.search);
    const conversationId = urlParams.get('conversation');
    
    // Skip if we're updating URL after sending a message (prevent clearing)
    if (isUpdatingUrlRef.current) {
      return;
    }
    
    // Don't clear or modify state if we're currently sending a message
    // This prevents clearing messages that are being added
    if (isSendingMessageRef.current) {
      return;
    }
    
    // Handle new chat button click - clear everything
    if (newChat) {
      setMessages([]);
      setChatTitle('');
      setCurrentConversationId(null);
      setSelectedProject(null);
      setAttachedFiles([]);
      initialMessageSent.current = false;
      // Clear the URL query parameter if present
      if (location.search) {
        navigate('/chat', { replace: true });
      } else {
        // Clear the newChat flag from state
        window.history.replaceState({}, '');
      }
      return;
    }
    
    // If we have a conversation ID in URL, don't clear anything
    // This is either a loaded conversation or a new conversation we just created
    if (conversationId) {
      // Only handle project/initial message if we don't have a conversation ID yet
      if (!currentConversationId) {
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
      }
      // Don't clear messages if we have them - we're in an active chat
      return;
    }
    
    // Handle project selection for new chats (no conversation ID)
    if (projectId && projectName && !conversationId) {
      setSelectedProject({ id: projectId, name: projectName });
    }

    // Handle initial message for new chats
    if (initialMessage && initialMessage.trim() && !initialMessageSent.current && !conversationId) {
      initialMessageSent.current = true;
      setTimeout(() => {
        handleSendWithMessage(initialMessage);
      }, 200);
      window.history.replaceState({ projectId, projectName }, '');
    }

    // Only initialize empty state if:
    // 1. No conversation ID in URL
    // 2. No current conversation ID
    // 3. No messages
    // 4. Not coming from a new chat action
    // 5. Not currently sending a message
    // This ensures we don't clear messages when user is actively chatting
    if (!conversationId && !currentConversationId && messages.length === 0 && !newChat && !isSendingMessageRef.current) {
      // This is a fresh page load - ensure clean state
      setMessages([]);
      setChatTitle('');
      setCurrentConversationId(null);
      setSelectedProject(null);
      setAttachedFiles([]);
      initialMessageSent.current = false;
    }
  }, [location.pathname, location.search, location.state, handleSendWithMessage, currentConversationId, messages.length, navigate]);

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