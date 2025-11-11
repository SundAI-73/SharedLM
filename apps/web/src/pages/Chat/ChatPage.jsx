import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, User, Star, Edit3, Trash2, MoreVertical, Paperclip, FolderOpen, X, Plus, SlidersHorizontal, Clock, ArrowUp, Search, Globe, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import ConnectorsModal from '../../components/ConnectorsModal/ConnectorsModal';
import apiService from '../../services/api/index';
import { logEvent, EventType, LogLevel } from '../../utils/auditLogger';
import { formatMessage } from '../../utils/messageFormatter';
import logo from '../../assets/images/logo main.svg';
import mistralLogo from '../../assets/images/m-boxed-orange.png';
import openaiLogo from '../../assets/images/openai-logo.svg';
import anthropicLogo from '../../assets/images/claude-color.svg';
import inceptionLogo from '../../assets/images/inception-labs.png';
import './styles/chat-base.css';
import './styles/chat-header.css';
import './styles/chat-messages.css';
import './styles/chat-input.css';
import './styles/chat-responsive.css';

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

// Helper function to get model logo based on model name/identifier
const getModelLogo = (modelName, customIntegrations = []) => {
  if (!modelName) return null;
  
  const modelLower = modelName.toLowerCase();
  
  // Check for provider names directly first
  if (modelLower === 'openai') {
    return openaiLogo;
  }
  if (modelLower === 'anthropic') {
    return anthropicLogo;
  }
  if (modelLower === 'mistral') {
    return mistralLogo;
  }
  if (modelLower === 'inception') {
    return inceptionLogo;
  }
  
  // Check for OpenAI models
  if (modelLower.includes('gpt') || modelLower.includes('openai')) {
    return openaiLogo;
  }
  
  // Check for Anthropic/Claude models
  if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
    return anthropicLogo;
  }
  
  // Check for Mistral models
  if (modelLower.includes('mistral') || modelLower.includes('mixtral')) {
    return mistralLogo;
  }
  
  // Check for Inception models
  if (modelLower.includes('mercury') || modelLower.includes('inception')) {
    return inceptionLogo;
  }
  
  // Check for custom integrations
  // Custom integration names are returned as the model identifier
  const customIntegration = customIntegrations.find(int => 
    int.name && modelLower.includes(int.name.toLowerCase())
  );
  if (customIntegration && customIntegration.logo_url) {
    return customIntegration.logo_url;
  }
  
  // Fallback: check if model name matches any custom integration provider_id
  const customByProvider = customIntegrations.find(int => 
    modelLower.includes(int.provider_id.toLowerCase().replace('custom_', ''))
  );
  if (customByProvider && customByProvider.logo_url) {
    return customByProvider.logo_url;
  }
  
  return null;
};

const Message = React.memo(({ msg, customIntegrations = [] }) => {
  const formattedContent = formatMessage(msg.content);
  const modelLogo = msg.role === 'assistant' && msg.model ? getModelLogo(msg.model, customIntegrations) : null;
  
  return (
    <div className={`chat-message ${msg.role}`}>
      <div className="message-avatar">
        {msg.role === 'user' ? (
          <User size={20} />
        ) : modelLogo ? (
          <img 
            src={modelLogo} 
            alt={`${msg.model || 'Model'} logo`}
            className="message-model-logo"
          />
        ) : (
          <Bot size={20} />
        )}
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
  ],
  inception: [
    { value: 'mercury', label: 'MERCURY' },
    { value: 'mercury-coder', label: 'MERCURY CODER' }
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
  const notify = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
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
  const [customIntegrations, setCustomIntegrations] = useState([]);
  
  // Initialize with empty arrays - will be populated based on available models
  const [modelProviders, setModelProviders] = useState([]);
  const [modelVariants, setModelVariants] = useState({});
  
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

  // Load custom integrations and add them to providers/variants (only if they're available)
  useEffect(() => {
    const loadCustomIntegrations = async () => {
      if (!userId) {
        return;
      }

      try {
        const integrations = await apiService.getCustomIntegrations(userId);
        
        // Store custom integrations for logo access
        setCustomIntegrations(integrations || []);

        // Only add custom integrations that are in availableModels (have API keys)
        // This ensures we only show integrations that the user has actually set up
        if (availableModels.length > 0) {
          const customProviders = (integrations || [])
            .filter(int => availableModels.includes(int.provider_id))
            .map(int => ({
              value: int.provider_id,
              label: int.name.toUpperCase(),
              isCustom: true
            }));

          // Update model providers to include custom integrations
          // Only add if there are custom providers to add
          if (customProviders.length > 0) {
            setModelProviders(prev => {
              const standardProviders = prev.filter(p => !p.isCustom);
              return [...standardProviders, ...customProviders];
            });

            // Add custom integrations to variants (they don't have variants, so empty array)
            setModelVariants(prev => {
              const customVariants = {};
              integrations
                .filter(int => availableModels.includes(int.provider_id))
                .forEach(int => {
                  customVariants[int.provider_id] = [];
                });
              return { ...prev, ...customVariants };
            });
          }
        } else {
          // No available models - ensure custom integrations are not shown
          setModelProviders(prev => prev.filter(p => !p.isCustom));
          setModelVariants(prev => {
            const cleaned = { ...prev };
            Object.keys(cleaned).forEach(key => {
              if (key.startsWith('custom_')) {
                delete cleaned[key];
              }
            });
            return cleaned;
          });
        }

      } catch (error) {
        console.error('[ChatPage] Failed to load custom integrations:', error);
        // On error, remove custom integrations from providers
        setModelProviders(prev => prev.filter(p => !p.isCustom));
      }
    };

    // Only load custom integrations after availableModels has been set
    // This prevents race conditions where custom integrations are loaded before we know which models are available
    if (availableModels !== undefined) {
      loadCustomIntegrations();
    }
  }, [userId, availableModels]);

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

  // Function to load available models
  const loadAvailableModels = useCallback(() => {
    if (backendStatus === 'connected' && userId) {
      // Get available models for this specific user
      apiService.getModels(userId).then(data => {
        // Handle response - data might be null or have available_models
        const available = (data && Array.isArray(data.available_models)) 
          ? data.available_models 
          : [];
        
        console.log('[ChatPage] Available models from backend:', available);
        
        // CRITICAL: Always set availableModels first, even if empty
        setAvailableModels(available);
        
        // Define provider labels
        const providerLabels = {
          'mistral': 'MISTRAL AI',
          'openai': 'OPENAI',
          'anthropic': 'ANTHROPIC',
          'inception': 'INCEPTION'
        };
        
        // Build model providers list from available models only
        // IMPORTANT: Only show models that are in the available array
        // If available is empty, standardProviders will be empty array
        const standardProviders = available
          .filter(model => !model.startsWith('custom_'))
          .map(model => ({
            value: model,
            label: providerLabels[model] || model.toUpperCase(),
            isCustom: false
          }));
        
        console.log('[ChatPage] Setting model providers:', standardProviders);
        // CRITICAL: Always set modelProviders, even if empty
        // This ensures that if no models are available, the dropdown is empty
        setModelProviders(standardProviders);
        
        // Build model variants - only include variants for available models
        // If available is empty, variants will be empty object
        const variants = {};
        available.forEach(model => {
          if (defaultModelVariants[model]) {
            variants[model] = defaultModelVariants[model];
          }
        });
        console.log('[ChatPage] Setting model variants:', variants);
        // CRITICAL: Always set modelVariants, even if empty
        setModelVariants(variants);
        
        // Update current model and variant based on available models
        if (available.length === 0) {
          // CRITICAL: No models available - explicitly clear everything
          console.log('[ChatPage] No models available, clearing current model and variant');
          setCurrentModel(null);
          setSelectedModelVariant('');
        } else {
          // Models are available - update current model if needed
          setCurrentModel(prevModel => {
            // If no previous model or previous model is not available, set to first available
            if (!prevModel || !available.includes(prevModel)) {
              // Set default variant for the new model
              if (variants[available[0]] && variants[available[0]].length > 0) {
                setSelectedModelVariant(variants[available[0]][0].value);
              } else {
                setSelectedModelVariant('');
              }
              return available[0];
            }
            // Previous model is still available - check if variant is valid
            const currentVariants = variants[prevModel] || [];
            setSelectedModelVariant(prevVariant => {
              if (currentVariants.length > 0) {
                if (!currentVariants.find(v => v.value === prevVariant)) {
                  return currentVariants[0].value;
                }
                return prevVariant;
              }
              return '';
            });
            return prevModel;
          });
        }
      }).catch(error => {
        console.error('[ChatPage] Failed to load available models:', error);
        // Fallback to empty array - user needs to add API keys
        setAvailableModels([]);
        setModelProviders([]);
        setModelVariants({});
        setCurrentModel(null);
        setSelectedModelVariant('');
      });
    } else {
      // Not connected or no userId - clear everything
      setAvailableModels([]);
      setModelProviders([]);
      setModelVariants({});
    }
  }, [backendStatus, userId, setCurrentModel]);

  // Load available models on mount and when dependencies change
  useEffect(() => {
    loadAvailableModels();
  }, [loadAvailableModels]);

  // Listen for API key updates to refresh models
  useEffect(() => {
    const handleApiKeysUpdated = () => {
      // Refresh available models when API keys are added/removed
      loadAvailableModels();
    };

    window.addEventListener('apiKeysUpdated', handleApiKeysUpdated);
    
    // Also refresh when page becomes visible (user might have added keys in another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAvailableModels();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('apiKeysUpdated', handleApiKeysUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAvailableModels]);

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
    if (!currentModel) {
      notify.error('No model selected. Please add API keys in Settings.');
      setLoading(false);
      isSendingMessageRef.current = false;
      return;
    }
    
    const modelToUse = currentModel;
    
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
        
        // Emit event for usage tracking
        // Determine the provider from modelToUse (handles both standard and custom integrations)
        const provider = modelToUse || currentModel || 'mistral';
        window.dispatchEvent(new CustomEvent('messageSent', {
          detail: {
            provider: provider,
            model: responseModel,
            timestamp: new Date().toISOString()
          }
        }));
        
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
  }, [currentModel, selectedModelVariant, userId, currentConversationId, selectedProject, modelVariants, modelProviders, navigate, notify]);

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
                <Message key={idx} msg={msg} customIntegrations={customIntegrations} />
              ))}

              {loading && (
                <div className="chat-message assistant">
                  <div className="message-avatar">
                    {(() => {
                      // Try to get logo from model variant first, then provider
                      const modelName = selectedModelVariant || currentModel || '';
                      let loadingLogo = getModelLogo(modelName, customIntegrations);
                      
                      // If no logo found and we have a provider name, try that
                      if (!loadingLogo && currentModel) {
                        loadingLogo = getModelLogo(currentModel, customIntegrations);
                      }
                      
                      return loadingLogo ? (
                        <img 
                          src={loadingLogo} 
                          alt={`${modelName || currentModel || 'Model'} logo`}
                          className="message-model-logo"
                        />
                      ) : (
                        <Bot size={20} />
                      );
                    })()}
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
              {modelProviders.length > 0 ? (
                <>
                  <CustomDropdown
                    value={currentModel || ''}
                    onChange={setCurrentModel}
                    options={modelProviders}
                    className="chat-model-dropdown-inline"
                  />
                  
                  {currentModel && modelVariants[currentModel]?.length > 0 && (
                    <CustomDropdown
                      value={selectedModelVariant}
                      onChange={setSelectedModelVariant}
                      options={modelVariants[currentModel]}
                      className="chat-model-dropdown-inline"
                    />
                  )}
                </>
              ) : (
                <div style={{ 
                  padding: '8px 16px', 
                  color: '#888888', 
                  fontFamily: 'Courier New, monospace',
                  fontSize: '0.875rem'
                }}>
                  No models available. Add API keys in Settings.
                </div>
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
