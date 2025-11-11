import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { useNotification } from '../../../contexts/NotificationContext';
import apiService from '../../../services/api/index';
import { logEvent, EventType, LogLevel } from '../../../utils/auditLogger';
import { generateChatTitle } from '../utils/chatHelpers';

export const useChatMessages = (
  currentModel,
  selectedModelVariant,
  modelVariants,
  modelProviders,
  currentConversationId,
  selectedProject,
  setCurrentConversationId,
  setChatTitle,
  updateUrlAfterNewConversation,
  isSendingMessageRef,
  clearAttachedFiles
) => {
  const { userId } = useUser();
  const notify = useNotification();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
          updateUrlAfterNewConversation(response.conversation_id);
        }
        
        clearAttachedFiles();
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
    }
  }, [
    currentModel,
    selectedModelVariant,
    userId,
    currentConversationId,
    selectedProject,
    modelVariants,
    modelProviders,
    setCurrentConversationId,
    updateUrlAfterNewConversation,
    clearAttachedFiles,
    isSendingMessageRef,
    notify
  ]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update title when first user message is sent
  useEffect(() => {
    if (messages.length === 2 && currentConversationId) {
      const firstMessage = messages.find(m => m.role === 'user');
      if (firstMessage) {
        setChatTitle(prevTitle => {
          if (!prevTitle) {
            // Generate title only if we don't have one
            const title = generateChatTitle(firstMessage.content);
            // Update conversation title in backend
            apiService.updateConversationTitle(currentConversationId, title).catch(err => {
              console.error('Failed to update title:', err);
            });
            return title;
          }
          return prevTitle;
        });
      }
    }
  }, [messages, currentConversationId, setChatTitle]);

  return {
    messages,
    setMessages,
    loading,
    setLoading,
    messagesEndRef,
    handleSendWithMessage
  };
};

