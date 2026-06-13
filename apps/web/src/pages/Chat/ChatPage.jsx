import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, User, Star, Edit3, Trash2, MoreVertical, Paperclip, FolderOpen, X, Plus, SlidersHorizontal, Clock, ArrowUp, Search, Globe, Settings, Square, RefreshCw, Copy, Volume2, Mic, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import SearchableDropdown from '../../components/common/SearchableDropdown/SearchableDropdown';
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
import './styles/chat-actions.css';
import './styles/chat-markdown.css';

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
  // An assistant bubble with no text yet = waiting for the first streamed token
  const awaitingFirstToken = msg.role === 'assistant' && !msg.content;
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard?.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(msg.content);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

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
      <div className="message-column">
        <div className="message-bubble-row">
          <div className="message-content">
            {awaitingFirstToken ? (
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            ) : (
              <div
                className="message-text"
                dangerouslySetInnerHTML={{ __html: formattedContent }}
              />
            )}
          </div>
          {msg.role === 'assistant' && msg.content && !msg.streaming && (
            <div className="message-actions">
              <button
                className={`message-action-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyMessage}
                title={copied ? 'Copied' : 'Copy'}
                aria-label="Copy message"
              >
                <Copy size={15} />
              </button>
              {'speechSynthesis' in window && (
                <button
                  className={`message-action-btn ${speaking ? 'active' : ''}`}
                  onClick={handleReadAloud}
                  title={speaking ? 'Stop' : 'Read aloud'}
                  aria-label="Read aloud"
                >
                  {speaking ? <Square size={15} /> : <Volume2 size={15} />}
                </button>
              )}
            </div>
          )}
        </div>
        {msg.role === 'assistant' && msg.content && (
          <div className="message-footer">
            <span className="message-model-label">
              {msg.model ? msg.model.toUpperCase() : ''}
            </span>
            {msg.usage && (msg.usage.total_tokens != null) && (
              <span className="message-tokens">{msg.usage.total_tokens.toLocaleString()} tok</span>
            )}
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
  const nickname = (localStorage.getItem('sharedlm_user_name') || '').trim();
  const fullName = (localStorage.getItem('sharedlm_full_name') || '').trim();
  const email = localStorage.getItem('sharedlm_user_email');

  const fallback = email ? email.split('@')[0] : 'there';
  const nameSource = nickname || fullName || fallback;
  return nameSource.split(' ')[0]; // Get first name only
};

// Suggested prompts shown on the empty chat state (clicking fills the composer)
const PROMPT_STARTERS = [
  { title: 'Explain a concept', sub: 'in simple terms', prompt: 'Explain the following concept in simple terms: ' },
  { title: 'Write something', sub: 'draft an email or post', prompt: 'Help me write a ' },
  { title: 'Summarize', sub: 'condense a long text', prompt: 'Summarize the following text:\n\n' },
  { title: 'Debug code', sub: 'find and fix the issue', prompt: 'Find and fix the bug in this code:\n\n```\n\n```' }
];

function ChatPage({ backendStatus }) {
  const { userId, currentModel, setCurrentModel } = useUser();
  const notify = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState([]);
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
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);
  const [customIntegrations, setCustomIntegrations] = useState([]);
  const [extendedThinkingEnabled, setExtendedThinkingEnabled] = useState(() => localStorage.getItem('sharedlm_toggle_extended') === 'true');
  const [researchEnabled, setResearchEnabled] = useState(() => localStorage.getItem('sharedlm_toggle_research') === 'true');
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => localStorage.getItem('sharedlm_toggle_web_search') === 'true');
  
  // Initialize with empty arrays - will be populated based on available models
  const [modelProviders, setModelProviders] = useState([]);
  const [modelVariants, setModelVariants] = useState({});
  
  const messagesEndRef = useRef(null);
  const messagesWrapperRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const optionsRef = useRef(null);
  const titleInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceBaseRef = useRef('');
  const initialMessageSent = useRef(false);
  const fileInputRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const previousModelRef = useRef(currentModel);
  const previousModelVariantRef = useRef(selectedModelVariant);
  const modelChangedDuringLoadingRef = useRef(false);

  // Load custom integrations and add them to providers/variants (only if they're available)
  // Use a ref to track if we've loaded once to prevent flickering
  const customIntegrationsLoadedRef = useRef(false);
  const loadCustomIntegrationsTimeoutRef = useRef(null);
  const isLoadingCustomIntegrationsRef = useRef(false);
  const lastAvailableModelsRef = useRef(null);
  
  useEffect(() => {
    // Clear any pending timeout
    if (loadCustomIntegrationsTimeoutRef.current) {
      clearTimeout(loadCustomIntegrationsTimeoutRef.current);
    }
    
    // Only load custom integrations after availableModels has been set
    // This prevents race conditions where custom integrations are loaded before we know which models are available
    if (availableModels === undefined) {
      return;
    }
    
    // Check if availableModels actually changed (prevent unnecessary reloads)
    const availableModelsStr = JSON.stringify(availableModels);
    if (lastAvailableModelsRef.current === availableModelsStr && customIntegrationsLoadedRef.current) {
      // No change and already loaded, skip
      return;
    }
    lastAvailableModelsRef.current = availableModelsStr;
    
    // Prevent concurrent loads
    if (isLoadingCustomIntegrationsRef.current) {
      return;
    }
    
    // Debounce the loading to prevent flickering when availableModels changes rapidly
    loadCustomIntegrationsTimeoutRef.current = setTimeout(async () => {
      if (isLoadingCustomIntegrationsRef.current) {
        return; // Already loading
      }
      
      isLoadingCustomIntegrationsRef.current = true;
      if (!userId) {
        return;
      }

      // Double-check authentication before making API calls
      const { isAuthenticated } = await import('../../utils/auth');
      if (!isAuthenticated()) {
        return;
      }

      try {
        // First, check if Ollama integration should be set up (one-time setup)
        // Only do this once to prevent duplicate creation
        if (!customIntegrationsLoadedRef.current) {
          try {
            const { setupOllamaIntegration } = await import('../../utils/ollamaIntegration');
            await setupOllamaIntegration(userId);
          } catch (ollamaError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[ChatPage] Failed to setup Ollama integration:', ollamaError);
            }
            // Continue even if Ollama setup fails
          }
        }
        
        const integrations = await apiService.getCustomIntegrations(userId);
        
        // Filter out duplicates by provider_id
        const uniqueIntegrations = integrations.filter((int, index, self) =>
          index === self.findIndex(i => i.provider_id === int.provider_id)
        );
        
        // Store custom integrations for logo access
        setCustomIntegrations(uniqueIntegrations || []);

        // Find all local LLM integrations (each model has its own integration)
        // Local LLM integrations have provider_id starting with "custom_local_"
        const localLLMIntegrations = uniqueIntegrations.filter(
          int => int.provider_id.startsWith('custom_local_') && int.provider_id !== 'custom_local_ollama'
        );

        // Only add custom integrations that are in availableModels (have API keys)
        // But don't remove them immediately if availableModels is temporarily empty
        // This prevents flickering when availableModels changes
        if (availableModels && availableModels.length > 0) {
          const customProviders = (uniqueIntegrations || [])
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
              // Keep standard providers
              const standardProviders = prev.filter(p => !p.isCustom);
              // Remove duplicates by value from custom providers
              const uniqueCustomProviders = customProviders.filter((cp, index, self) =>
                index === self.findIndex(p => p.value === cp.value)
              );
              // Merge: keep existing custom providers that are still valid, add new ones
              const existingCustomProviders = prev.filter(p => p.isCustom);
              const existingCustomIds = existingCustomProviders.map(p => p.value);
              const newCustomProviders = uniqueCustomProviders.filter(cp => !existingCustomIds.includes(cp.value));
              return [...standardProviders, ...existingCustomProviders, ...newCustomProviders];
            });

            // Add custom integrations to variants
            // For local LLMs, each model is its own integration (no variants needed)
            setModelVariants(prev => {
              const customVariants = {};
              uniqueIntegrations
                .filter(int => availableModels.includes(int.provider_id))
                .forEach(int => {
                  // Local LLM integrations don't need variants - they're already model-specific
                  // Other custom integrations also don't have variants
                  customVariants[int.provider_id] = prev[int.provider_id] || [];
                });
              // Merge: preserve standard variants, update/add custom variants
              return { ...prev, ...customVariants };
            });
            
            customIntegrationsLoadedRef.current = true;
          }
        } else if (customIntegrationsLoadedRef.current && availableModels && availableModels.length === 0) {
          // Only remove if availableModels is explicitly empty (not just undefined)
          // This prevents flickering when availableModels is temporarily empty during initial load
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
        // If it's an authentication error, don't process further - redirect will happen
        if (error.message === 'Authentication required' || error.message.includes('Session expired')) {
          // The makeRequest will handle the redirect, just stop processing
          return;
        }
        console.error('[ChatPage] Failed to load custom integrations:', error);
        // On error, remove custom integrations from providers
        setModelProviders(prev => prev.filter(p => !p.isCustom));
      } finally {
        isLoadingCustomIntegrationsRef.current = false;
      }
    }, 500); // 500ms debounce to prevent flickering (increased from 300ms)
    
    // Cleanup timeout on unmount
    return () => {
      if (loadCustomIntegrationsTimeoutRef.current) {
        clearTimeout(loadCustomIntegrationsTimeoutRef.current);
      }
    };
  }, [userId, availableModels]); // Removed currentModel and selectedModelVariant - they shouldn't trigger reload

  // Monitor Ollama model installation from setup wizard
  useEffect(() => {
    let cleanup = null;
    
    const monitorOllamaInstallation = async () => {
      if (!userId || !window.electron) {
        return; // Only monitor in Electron app
      }

      try {
        // Read installation config
        const { getModelsToMonitor, monitorModelInstallation } = await import('../../utils/ollamaModelMonitor');
        const { readInstallConfig } = await import('../../utils/ollamaIntegration');
        
        let config = null;
        if (window.electron.readConfig) {
          const installPath = localStorage.getItem('sharedlm_install_path');
          if (installPath) {
            config = await readInstallConfig(installPath);
          }
        }

        // Fallback to localStorage
        if (!config) {
          const storedConfig = localStorage.getItem('sharedlm_install_config');
          if (storedConfig) {
            config = JSON.parse(storedConfig);
          }
        }

        if (!config || !config.models || config.models.length === 0) {
          return; // No models to monitor
        }

        // Get models to monitor
        const modelIds = getModelsToMonitor(config);
        if (modelIds.length === 0) {
          return;
        }

        // Check if models are already installed
        try {
          const ollamaData = await apiService.getOllamaModels();
          const installedModels = ollamaData.installed_models || [];
          
          // Filter out already installed models
          const modelsToMonitor = modelIds.filter(modelId => {
            // Check if model is installed (exact match or base name match)
            return !installedModels.some(installed => {
              const baseName = installed.split(':')[0];
              return modelId === installed || modelId.startsWith(baseName);
            });
          });

          if (modelsToMonitor.length === 0) {
            // All models already installed
            notify.success('All Ollama models are installed and ready to use!');
            // Reload models to refresh UI - check for any local LLM integration
            const hasLocalLLM = availableModels.some(m => m.startsWith('custom_local_'));
            if (hasLocalLLM) {
              loadAvailableModels();
            }
            return;
          }

          // Start monitoring
          cleanup = monitorModelInstallation(
            modelsToMonitor,
            (modelId, installed) => {
              // Model installed - reload available models
              const hasLocalLLM = availableModels.some(m => m.startsWith('custom_local_'));
              if (installed && hasLocalLLM) {
                // Reload models after a short delay
                setTimeout(() => {
                  loadAvailableModels();
                }, 1000);
              }
            },
            (installedModels) => {
              // All models installed
              notify.success(`All ${installedModels.length} Ollama model(s) installed! They're now available in chat.`);
              // Reload models to refresh UI
              const hasLocalLLM = availableModels.some(m => m.startsWith('custom_local_'));
              if (hasLocalLLM) {
                setTimeout(() => {
                  loadAvailableModels();
                }, 1000);
              }
            },
            notify
          );
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[ChatPage] Failed to check Ollama models:', error);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ChatPage] Failed to monitor Ollama installation:', error);
        }
      }
    };

    // Only monitor if backend is connected
    if (backendStatus === 'connected') {
      monitorOllamaInstallation();
    }

    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [userId, backendStatus, availableModels, notify]);

  useEffect(() => {
    localStorage.setItem('sharedlm_toggle_extended', JSON.stringify(extendedThinkingEnabled));
  }, [extendedThinkingEnabled]);

  useEffect(() => {
    localStorage.setItem('sharedlm_toggle_research', JSON.stringify(researchEnabled));
  }, [researchEnabled]);

  useEffect(() => {
    localStorage.setItem('sharedlm_toggle_web_search', JSON.stringify(webSearchEnabled));
  }, [webSearchEnabled]);

  useEffect(() => {
    const variants = modelVariants[currentModel] || [];
    const isCustomIntegration = currentModel && currentModel.startsWith('custom_');
    const isOllama = currentModel === 'custom_local_ollama';
    
    if (variants.length > 0) {
      // If current variant is not in the list, select the first one
      if (!variants.find(v => v.value === selectedModelVariant)) {
        setSelectedModelVariant(variants[0].value);
      }
    } else {
      // No variants available
      // For Ollama, wait a bit for models to load
      if (isOllama) {
        // Don't clear immediately - models might still be loading
        // Only clear if we've waited and still no variants
        return;
      }
      // For other custom integrations, clear the variant
      if (isCustomIntegration) {
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
      // Load whenever the URL points at a different conversation than the one
      // open. The isUpdatingUrlRef / isSendingMessageRef guards above already
      // prevent clobbering an in-flight send, so this safely supports switching
      // conversations from the sidebar/history while a chat is open.
      if (convIdInt !== currentConversationId) {
        loadConversation(conversationId);
      }
    }
  }, [location.search, loadConversation, currentConversationId, messages.length]);

  // Function to load available models
  // IMPORTANT: This function only updates STANDARD providers, not custom integrations
  // Custom integrations are handled separately in loadCustomIntegrations
  const loadAvailableModels = useCallback(() => {
    if (backendStatus === 'connected' && userId) {
      // Get available models for this specific user
      apiService.getModels(userId).then(data => {
        // Handle response - data might be null or have available_models
        const available = (data && Array.isArray(data.available_models)) 
          ? data.available_models 
          : [];
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[ChatPage] Available models from backend:', available);
        }
        
        // CRITICAL: Always set availableModels first, even if empty
        setAvailableModels(available);
        
        // Define provider labels
        const providerLabels = {
          'mistral': 'MISTRAL AI',
          'openai': 'OPENAI',
          'anthropic': 'ANTHROPIC',
          'inception': 'INCEPTION',
          'openrouter': 'OPENROUTER'
        };
        
        // Build model providers list from available models only
        // IMPORTANT: Only show STANDARD models (not custom_*)
        // Custom integrations are handled separately and will be merged
        const standardProviders = available
          .filter(model => !model.startsWith('custom_'))
          .map(model => ({
            value: model,
            label: providerLabels[model] || model.toUpperCase(),
            isCustom: false
          }));
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[ChatPage] Setting standard model providers:', standardProviders);
        }
        
        // CRITICAL: Only update STANDARD providers, preserve custom integrations
        // Merge with existing custom providers instead of replacing
        setModelProviders(prev => {
          const customProviders = prev.filter(p => p.isCustom);
          return [...standardProviders, ...customProviders];
        });
        
        // Build model variants - only include variants for STANDARD models
        // Custom integration variants are handled separately
        const variants = {};
        available.forEach(model => {
          if (!model.startsWith('custom_') && defaultModelVariants[model]) {
            variants[model] = defaultModelVariants[model];
          }
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[ChatPage] Setting standard model variants:', variants);
        }
        
        // CRITICAL: Merge with existing custom variants instead of replacing
        setModelVariants(prev => {
          // Preserve custom integration variants
          const customVariants = {};
          Object.keys(prev).forEach(key => {
            if (key.startsWith('custom_')) {
              customVariants[key] = prev[key];
            }
          });
          return { ...variants, ...customVariants };
        });
        
        // Update current model and variant based on available models
        if (available.length === 0) {
          // CRITICAL: No models available - but don't clear if we have custom integrations
          setModelProviders(prev => {
            const customProviders = prev.filter(p => p.isCustom);
            if (customProviders.length === 0) {
              // No custom integrations either - clear everything
              setCurrentModel(null);
              setSelectedModelVariant('');
              return [];
            }
            // Keep custom integrations
            return customProviders;
          });
        } else {
          // Models are available - update current model if needed
          setCurrentModel(prevModel => {
            // If no previous model or previous model is not available, set to first available
            if (!prevModel || !available.includes(prevModel)) {
              // Check if previous model was a custom integration - preserve it if it's still valid
              if (prevModel && prevModel.startsWith('custom_')) {
                // Keep the custom integration if it's still in availableModels
                if (available.includes(prevModel)) {
                  return prevModel;
                }
              }
              // Set default variant for the new model
              const firstModel = available[0];
              setModelVariants(prev => {
                const variantsForModel = prev[firstModel] || [];
                if (variantsForModel.length > 0) {
                  setSelectedModelVariant(variantsForModel[0].value);
                } else {
                  setSelectedModelVariant('');
                }
                return prev;
              });
              return firstModel;
            }
            // Previous model is still available - check if variant is valid
            setModelVariants(prev => {
              const currentVariants = prev[prevModel] || [];
              setSelectedModelVariant(prevVariant => {
                if (currentVariants.length > 0) {
                  if (!currentVariants.find(v => v.value === prevVariant)) {
                    return currentVariants[0].value;
                  }
                  return prevVariant;
                }
                return '';
              });
              return prev;
            });
            return prevModel;
          });
        }
      }).catch(error => {
        console.error('[ChatPage] Failed to load available models:', error);
        // On error, only clear standard models, preserve custom integrations
        setModelProviders(prev => {
          const customProviders = prev.filter(p => p.isCustom);
          if (customProviders.length === 0) {
            // No custom integrations - clear everything
            setAvailableModels([]);
            setModelVariants({});
            setCurrentModel(null);
            setSelectedModelVariant('');
            return [];
          }
          // Keep custom integrations
          setAvailableModels(prev => {
            // Keep custom integrations in availableModels
            return prev.filter(m => m.startsWith('custom_'));
          });
          return customProviders;
        });
      });
    } else {
      // Not connected or no userId - only clear if we don't have custom integrations
      setModelProviders(prev => {
        const customProviders = prev.filter(p => p.isCustom);
        if (customProviders.length === 0) {
          // No custom integrations - clear everything
          setAvailableModels([]);
          setModelVariants({});
        } else {
          // Keep custom integrations
          setAvailableModels(prev => {
            return prev.filter(m => m.startsWith('custom_'));
          });
        }
        return customProviders;
      });
    }
  }, [backendStatus, userId, setCurrentModel]);

  // Load available models on mount and when dependencies change
  useEffect(() => {
    loadAvailableModels();
  }, [loadAvailableModels]);

  // Fetch the OpenRouter catalog once the user has connected the openrouter provider
  useEffect(() => {
    if (!userId || !availableModels.includes('openrouter') || openRouterModels.length > 0) {
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await apiService.getOpenRouterModels();
      if (cancelled) return;
      const opts = (data.models || []).map(m => ({ value: m.id, label: m.name || m.id }));
      setOpenRouterModels(opts);
    })();
    return () => { cancelled = true; };
  }, [userId, availableModels, openRouterModels.length]);

  // When OpenRouter is selected, make sure a valid catalog model id is chosen
  useEffect(() => {
    if (currentModel !== 'openrouter' || openRouterModels.length === 0) return;
    const isValid = openRouterModels.some(o => o.value === selectedModelVariant);
    if (!isValid) {
      const preferred = openRouterModels.find(o => o.value === 'openai/gpt-4o-mini')
        || openRouterModels.find(o => o.value === 'openai/gpt-4o')
        || openRouterModels[0];
      setSelectedModelVariant(preferred.value);
    }
  }, [currentModel, openRouterModels, selectedModelVariant]);

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

  // Auto-scroll only when the user is already near the bottom, so we don't
  // yank them back down while they scroll up to read during a stream.
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesWrapperRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
    const isOpenRouter = modelToUse === 'openrouter';

    // Ensure we have a valid model variant
    let modelVariantToUse = selectedModelVariant;
    let displayModelName = modelVariantToUse; // For display in UI

    if (isOpenRouter) {
      // For OpenRouter the variant IS the full catalog model id (e.g. "openai/gpt-4o")
      if (!modelVariantToUse || !modelVariantToUse.includes('/')) {
        modelVariantToUse = 'openai/gpt-4o-mini';
        setSelectedModelVariant(modelVariantToUse);
      }
      displayModelName = modelVariantToUse;
    } else if (!modelVariantToUse || modelVariantToUse.trim() === '') {
      // Default to first available variant for the current model
      const variants = modelVariants[modelToUse] || [];
      if (variants.length > 0) {
        modelVariantToUse = variants[0].value;
        displayModelName = modelVariantToUse;
        setSelectedModelVariant(modelVariantToUse);
      } else {
        // For custom integrations with no variants
        if (isCustomIntegration) {
          const provider = modelProviders.find(p => p.value === modelToUse);
          // For local LLM integrations, extract model name from provider_id
          // e.g., "custom_local_gemma3" -> "gemma3"
          if (modelToUse.startsWith('custom_local_')) {
            // Extract model name from provider_id (remove "custom_local_" prefix)
            const modelName = modelToUse.replace('custom_local_', '').replace(/_/g, '.');
            modelVariantToUse = modelName; // Use the actual model name
            displayModelName = provider ? provider.label : modelName;
          } else {
            modelVariantToUse = 'default'; // API expects a model name
            displayModelName = provider ? provider.label : modelToUse.replace('custom_', '').replace(/_/g, ' ').toUpperCase();
          }
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
        if (modelToUse.startsWith('custom_local_')) {
          // For local LLM, extract model name from provider_id
          const modelName = modelToUse.replace('custom_local_', '').replace(/_/g, '.');
          modelVariantToUse = modelName;
          const provider = modelProviders.find(p => p.value === modelToUse);
          displayModelName = provider ? provider.label : modelName;
        } else {
          const provider = modelProviders.find(p => p.value === modelToUse);
          modelVariantToUse = 'default'; // Use default for API
          displayModelName = provider ? provider.label : modelToUse.replace('custom_', '').replace(/_/g, ' ').toUpperCase();
        }
        setSelectedModelVariant(''); // Clear the incorrect variant
      } else {
        // Valid custom integration variant
        displayModelName = modelVariantToUse;
      }
    } else {
      displayModelName = modelVariantToUse;
    }

    // Streamed reply: append an empty assistant placeholder, then fill it as
    // tokens arrive. Stop = abort the fetch (the backend persists the partial).
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStreaming(true);

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      model: displayModelName,
      streaming: true,
      timestamp: new Date().toISOString()
    }]);

    // Update the trailing assistant message (the streaming placeholder)
    const patchAssistant = (updater) => {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = updater(last);
        }
        return copy;
      });
    };

    let newConversationId = null;

    try {
      const result = await apiService.sendMessageStream(
        userId,
        messageText,
        modelToUse,
        currentConversationId,
        selectedProject?.id || null,
        modelVariantToUse,
        {
          regenerate: false,
          reasoning_effort: extendedThinkingEnabled ? 'high' : null,
          web_search: webSearchEnabled || researchEnabled,
          signal: controller.signal,
          onMeta: (event) => {
            if (!currentConversationId && event.conversation_id) {
              newConversationId = event.conversation_id;
              setCurrentConversationId(event.conversation_id);
            }
          },
          onDelta: (text) => patchAssistant(last => ({ ...last, content: last.content + text })),
          onDone: (event) => patchAssistant(last => ({
            ...last,
            streaming: false,
            model: event.used_model || last.model
          }))
        }
      );

      // Finalize (covers providers/paths that don't emit a done event)
      patchAssistant(last => ({
        ...last,
        streaming: false,
        model: (result && result.used_model) || last.model,
        memories: (result && result.memories) || last.memories,
        usage: (result && result.usage) || last.usage
      }));

      const provider = modelToUse || currentModel || 'mistral';
      window.dispatchEvent(new CustomEvent('messageSent', {
        detail: {
          provider,
          model: (result && result.used_model) || displayModelName,
          timestamp: new Date().toISOString()
        }
      }));

      if (newConversationId) {
        setTimeout(() => {
          isUpdatingUrlRef.current = true;
          navigate(`/chat?conversation=${newConversationId}`, { replace: true });
          setTimeout(() => { isUpdatingUrlRef.current = false; }, 300);
        }, 300);
      }

      setAttachedFiles([]);
    } catch (error) {
      // Stop button or navigation aborts the fetch — keep the partial reply as-is.
      if (error.name === 'AbortError' || controller.signal.aborted) {
        patchAssistant(last => ({ ...last, streaming: false }));
      } else {
        logEvent(EventType.ERROR, LogLevel.ERROR, 'Chat message error', {
          userId, error: error.message, model: modelVariantToUse || selectedModelVariant
        });
        if (process.env.NODE_ENV !== 'production') {
          console.error('Chat error:', error);
        }

        let errorMessage = error.message;
        let errorModel = displayModelName || modelVariantToUse || selectedModelVariant;
        const modelMatch = errorMessage.match(/\(([^)]+)\):/);
        if (modelMatch && modelMatch[1]) {
          errorModel = modelMatch[1];
        }
        if (!errorModel || (errorModel === 'mistral-small-latest' && isCustomIntegration)) {
          if (isCustomIntegration) {
            const provider = modelProviders.find(p => p.value === modelToUse);
            errorModel = provider ? provider.label : (modelToUse || 'unknown');
          } else {
            errorModel = errorModel || modelToUse || 'unknown';
          }
        }
        if (errorMessage.includes('Session expired')) {
          errorMessage = 'Your session has expired. Please refresh the page.';
        } else if (/rate limit|api key|limit exceeded|quota|insufficient|credit|forbidden|\b40[123]\b/i.test(errorMessage)) {
          // Surface provider-meaningful errors (quota/credits/auth). Pull the
          // inner human message out of the wrapped API error when present.
          const inner = errorMessage.match(/'message':\s*'([^']+)'/) || errorMessage.match(/"message":\s*"([^"]+)"/);
          if (inner && inner[1]) {
            errorMessage = inner[1];
          }
        } else {
          errorMessage = 'Connection issue. Please check settings or try again.';
        }

        // Fill the placeholder with the error (appending to any partial text)
        patchAssistant(last => ({
          ...last,
          streaming: false,
          content: last.content ? `${last.content}\n\n${errorMessage}` : errorMessage,
          model: String(errorModel).toUpperCase()
        }));
      }
    } finally {
      abortControllerRef.current = null;
      setStreaming(false);
      setLoading(false);
      setTimeout(() => {
        isSendingMessageRef.current = false;
      }, 500);
    }
  }, [currentModel, selectedModelVariant, userId, currentConversationId, selectedProject, modelVariants, modelProviders, navigate, notify, extendedThinkingEnabled, researchEnabled, webSearchEnabled]);

  // Stop an in-flight streamed response (backend keeps the partial reply)
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Delegated handler for the copy buttons inside rendered code blocks
  const handleMessagesClick = useCallback((e) => {
    const btn = e.target.closest && e.target.closest('.code-copy-btn');
    if (!btn) return;
    const codeEl = btn.closest('.code-block')?.querySelector('pre code');
    if (!codeEl) return;
    navigator.clipboard?.writeText(codeEl.innerText).then(() => {
      const original = btn.textContent;
      btn.classList.add('copied');
      btn.textContent = 'Copied';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.textContent = original;
      }, 1500);
    }).catch(() => {});
  }, []);

  // Re-run the last user turn, replacing the last assistant reply
  const handleRegenerate = useCallback(async () => {
    if (loading || streaming || !currentConversationId) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;

    // Drop the trailing assistant message locally; backend drops it server-side too
    setMessages(prev => {
      const copy = [...prev];
      if (copy.length && copy[copy.length - 1].role === 'assistant') copy.pop();
      return copy;
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setStreaming(true);
    isSendingMessageRef.current = true;

    setMessages(prev => [...prev, {
      role: 'assistant', content: '', model: selectedModelVariant || currentModel,
      streaming: true, timestamp: new Date().toISOString()
    }]);

    const patchAssistant = (updater) => {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') copy[copy.length - 1] = updater(last);
        return copy;
      });
    };

    try {
      await apiService.sendMessageStream(
        userId, lastUser.content, currentModel, currentConversationId,
        selectedProject?.id || null, selectedModelVariant,
        {
          regenerate: true,
          reasoning_effort: extendedThinkingEnabled ? 'high' : null,
          web_search: webSearchEnabled || researchEnabled,
          signal: controller.signal,
          onDelta: (text) => patchAssistant(last => ({ ...last, content: last.content + text })),
          onDone: (event) => patchAssistant(last => ({ ...last, streaming: false, model: event.used_model || last.model }))
        }
      );
      patchAssistant(last => ({ ...last, streaming: false }));
    } catch (error) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        patchAssistant(last => ({ ...last, streaming: false }));
      } else {
        patchAssistant(last => ({
          ...last, streaming: false,
          content: error.message || 'Connection issue. Please try again.'
        }));
      }
    } finally {
      abortControllerRef.current = null;
      setStreaming(false);
      setLoading(false);
      setTimeout(() => { isSendingMessageRef.current = false; }, 500);
    }
  }, [loading, streaming, currentConversationId, messages, userId, currentModel, selectedModelVariant, selectedProject, extendedThinkingEnabled, researchEnabled, webSearchEnabled]);

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
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, handleSendWithMessage]);

  // Auto-grow the textarea up to a max height
  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  // Voice dictation via the Web Speech API. Toggling stops it; results stream
  // into the composer, appended to whatever was already typed.
  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    voiceBaseRef.current = input ? `${input.trim()} ` : '';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(voiceBaseRef.current + transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
    setListening(true);
  }, [listening, input, notify]);

  // Stop dictation if the component unmounts
  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
  }, []);

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

  // Export the current conversation as a Markdown file
  const handleExport = useCallback(() => {
    if (!messages.length) return;
    const title = chatTitle || 'Conversation';
    const lines = [`# ${title}`, ''];
    messages.forEach((m) => {
      const who = m.role === 'user' ? 'You' : (m.model ? m.model.toUpperCase() : 'Assistant');
      lines.push(`## ${who}`, '', m.content || '', '');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '').slice(0, 50);
    a.download = `${slug || 'conversation'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowOptions(false);
  }, [messages, chatTitle]);

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
                    <button className="option-item" onClick={handleExport}>
                      <Download size={16} />
                      <span>Export</span>
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

        <div
          className={`chat-messages-wrapper ${messages.length === 0 ? 'full-height' : ''}`}
          ref={messagesWrapperRef}
          onScroll={handleMessagesScroll}
        >
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
                <motion.div
                  className="prompt-starters"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.55 }}
                >
                  {PROMPT_STARTERS.map((starter) => (
                    <button
                      key={starter.title}
                      className="prompt-starter-chip"
                      onClick={() => {
                        setInput(starter.prompt);
                        setTimeout(() => textareaRef.current?.focus(), 0);
                      }}
                    >
                      <span className="prompt-starter-title">{starter.title}</span>
                      <span className="prompt-starter-sub">{starter.sub}</span>
                    </button>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            <div className="chat-messages-list" onClick={handleMessagesClick}>
              {messages.map((msg, idx) => (
                <Message key={idx} msg={msg} customIntegrations={customIntegrations} />
              ))}

              {loading && !streaming && (
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

              {!loading && !streaming && currentConversationId &&
                messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                <div className="chat-regenerate-row">
                  <button
                    className="chat-regenerate-btn"
                    onClick={handleRegenerate}
                    title="Regenerate response"
                  >
                    <RefreshCw size={14} />
                    <span>Regenerate</span>
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {showScrollToBottom && messages.length > 0 && (
          <button
            className="chat-scroll-bottom-btn"
            onClick={scrollToBottom}
            title="Scroll to latest"
            aria-label="Scroll to latest"
          >
            <ArrowUp size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}

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

              {/* Active-capability indicators (click to turn off) */}
              {extendedThinkingEnabled && (
                <button
                  className="chat-toggle-indicator"
                  onClick={() => setExtendedThinkingEnabled(false)}
                  title="Extended thinking is on — click to turn off"
                >
                  <Clock size={15} />
                </button>
              )}
              {researchEnabled && (
                <button
                  className="chat-toggle-indicator"
                  onClick={() => setResearchEnabled(false)}
                  title="Research is on — click to turn off"
                >
                  <Search size={15} />
                </button>
              )}
              {webSearchEnabled && (
                <button
                  className="chat-toggle-indicator"
                  onClick={() => setWebSearchEnabled(false)}
                  title="Web search is on — click to turn off"
                >
                  <Globe size={15} />
                </button>
              )}
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
                  
                  {currentModel === 'openrouter' ? (
                    <SearchableDropdown
                      value={selectedModelVariant}
                      onChange={setSelectedModelVariant}
                      options={openRouterModels}
                      placeholder="Search 400+ models…"
                      className="chat-model-dropdown-inline"
                    />
                  ) : (currentModel && modelVariants[currentModel]?.length > 0 && (
                    <CustomDropdown
                      value={selectedModelVariant}
                      onChange={setSelectedModelVariant}
                      options={modelVariants[currentModel]}
                      className="chat-model-dropdown-inline"
                    />
                  ))}
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
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  // Enter sends; Shift+Enter inserts a newline
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!loading && input.trim()) handleSend();
                  }
                }}
                placeholder="How can I help you today?"
                className="chat-input-field-main"
                rows={1}
                disabled={loading}
                autoFocus
              />
              <motion.button
                onClick={handleVoiceInput}
                className={`chat-mic-btn ${listening ? 'listening' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={listening ? 'Stop dictation' : 'Voice input'}
                type="button"
              >
                <Mic size={18} />
              </motion.button>
              {streaming ? (
                <motion.button
                  onClick={handleStopGeneration}
                  className="chat-send-btn-inside active chat-stop-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Stop generating"
                >
                  <Square size={16} />
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className={`chat-send-btn-inside ${input.trim() ? 'active' : ''}`}
                  whileHover={input.trim() ? { scale: 1.05 } : {}}
                  whileTap={input.trim() ? { scale: 0.95 } : {}}
                >
                  <ArrowUp size={18} />
                </motion.button>
              )}
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
                  <input 
                    type="checkbox" 
                    checked={extendedThinkingEnabled}
                    onChange={(e) => setExtendedThinkingEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider-small"></span>
                </label>
              </div>
              <div className="settings-menu-item">
                <div className="settings-menu-item-left">
                  <Search size={16} className="settings-menu-icon" />
                  <span>Research</span>
                </div>
                <label className="toggle-switch-small">
                  <input 
                    type="checkbox" 
                    checked={researchEnabled}
                    onChange={(e) => setResearchEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider-small"></span>
                </label>
              </div>
              <div className="settings-menu-item">
                <div className="settings-menu-item-left">
                  <Globe size={16} className="settings-menu-icon" />
                  <span>Web search</span>
                </div>
                <label className="toggle-switch-small">
                  <input 
                    type="checkbox" 
                    checked={webSearchEnabled}
                    onChange={(e) => setWebSearchEnabled(e.target.checked)}
                  />
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
