import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import ConnectorsModal from '../../components/ConnectorsModal/ConnectorsModal';
import { useModels } from './hooks/useModels';
import { useConversation } from './hooks/useConversation';
import { useFileAttachments } from './hooks/useFileAttachments';
import { useChatMessages } from './hooks/useChatMessages';
import ChatHeader from './components/ChatHeader/ChatHeader';
import ChatMessages from './components/ChatMessages/ChatMessages';
import ChatEmptyState from './components/ChatEmptyState/ChatEmptyState';
import ChatInput from './components/ChatInput/ChatInput';
import ChatSettingsMenu from './components/ChatSettingsMenu/ChatSettingsMenu';
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
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);
  const settingsMenuRef = useRef(null);
  const newChatProcessedRef = useRef(false);
  const lastNewChatTimestampRef = useRef(null);

  // Custom hooks
  const {
    modelProviders,
    modelVariants,
    selectedModelVariant,
    setSelectedModelVariant,
    customIntegrations
  } = useModels(backendStatus);

  const conversation = useConversation(userId);
  const {
    chatTitle,
    setChatTitle,
    currentConversationId,
    setCurrentConversationId,
    selectedProject,
    setSelectedProject,
    isEditingTitle,
    setIsEditingTitle,
    editedTitle,
    setEditedTitle,
    showOptions,
    setShowOptions,
    titleInputRef,
    optionsRef,
    initialMessageSent,
    isUpdatingUrlRef,
    isSendingMessageRef,
    loadConversation,
    handleRename,
    handleSaveTitle,
    handleDelete,
    handleStarChat,
    updateUrlAfterNewConversation
  } = conversation;

  // Create a ref for clearAttachedFiles to avoid circular dependency
  const clearAttachedFilesRef = useRef(() => {});

  const {
    messages,
    setMessages,
    loading,
    messagesEndRef,
    handleSendWithMessage
  } = useChatMessages(
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
    () => clearAttachedFilesRef.current()
  );

  // Get setLoading from useChatMessages by using a ref workaround
  // Since we need loading state to be shared, we'll manage it in ChatPage
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  
  const {
    attachedFiles,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    clearAttachedFiles
  } = useFileAttachments(
    currentConversationId,
    selectedProject,
    selectedModelVariant,
    setCurrentConversationId,
    setFileUploadLoading
  );
  
  // Combine loading states - show loading if either messages are loading or file is uploading
  const isLoading = loading || fileUploadLoading;

  // Update the ref with the actual function
  useEffect(() => {
    clearAttachedFilesRef.current = clearAttachedFiles;
  }, [clearAttachedFiles]);

  // Handle URL changes and load conversations
  // Only run this effect when we're actually on the chat page
  useEffect(() => {
    // If we're not on the chat page, don't do anything
    if (location.pathname !== '/chat') {
      return;
    }

    const urlParams = new URLSearchParams(location.search);
    const conversationId = urlParams.get('conversation');
    
    // Skip loading if we're in the middle of updating URL after sending a message
    if (isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      return;
    }
    
    // Don't load conversation if we're currently sending a message
    if (isSendingMessageRef.current) {
      return;
    }
    
    // Only load conversation if:
    // 1. There's a conversation ID in the URL
    // 2. It's different from the current conversation ID
    // 3. We don't have messages in state (to avoid clearing active chat)
    if (conversationId) {
      const convIdInt = parseInt(conversationId);
      if (convIdInt !== currentConversationId && messages.length === 0) {
        loadConversation(conversationId).then(loadedMessages => {
          if (loadedMessages && loadedMessages.length > 0) {
            setMessages(loadedMessages);
          }
        });
      }
    }
  }, [location.pathname, location.search, currentConversationId, messages.length, loadConversation, setMessages, isUpdatingUrlRef, isSendingMessageRef]);

  // Handle location state changes (project, initial message, new chat)
  // Only run this effect when we're actually on the chat page
  useEffect(() => {
    // If we're not on the chat page, don't do anything
    if (location.pathname !== '/chat') {
      return;
    }

    const { projectId, projectName, initialMessage, newChat, timestamp } = location.state || {};
    const urlParams = new URLSearchParams(location.search);
    const conversationId = urlParams.get('conversation');
    
    // Skip if we're updating URL after sending a message (prevent clearing)
    if (isUpdatingUrlRef.current) {
      return;
    }
    
    // Don't clear or modify state if we're currently sending a message
    if (isSendingMessageRef.current) {
      return;
    }
    
    // Handle new chat button click - clear everything
    // Use timestamp to detect new chat requests even when already on /chat
    const isNewChatRequest = newChat && timestamp && timestamp !== lastNewChatTimestampRef.current;
    if (isNewChatRequest) {
      // Only process if we're actually on the chat page
      if (location.pathname !== '/chat') {
        return;
      }
      
      // Update the last processed timestamp
      lastNewChatTimestampRef.current = timestamp;
      newChatProcessedRef.current = true;
      
      // Clear all chat state
      setMessages([]);
      setChatTitle('');
      setCurrentConversationId(null);
      setSelectedProject(null);
      clearAttachedFiles();
      initialMessageSent.current = false;
      
      // Clear search parameter if present (including temporary 'new' param) - use replaceState to avoid navigation conflicts
      if (location.search) {
        // Use replaceState instead of navigate to avoid interfering with potential navigation
        window.history.replaceState(null, '', '/chat');
      }
      return;
    }
    
    // Reset the processed flag when newChat is not present and we're on chat page
    if (!newChat && location.pathname === '/chat') {
      newChatProcessedRef.current = false;
    }
    
    // If we have a conversation ID in URL, don't clear anything
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
    if (!conversationId && !currentConversationId && messages.length === 0 && !newChat && !isSendingMessageRef.current) {
      // This is a fresh page load - ensure clean state
      setMessages([]);
      setChatTitle('');
      setCurrentConversationId(null);
      setSelectedProject(null);
      clearAttachedFiles();
      initialMessageSent.current = false;
    }
  }, [location.pathname, location.search, location.state, handleSendWithMessage, currentConversationId, messages.length, navigate, setMessages, setChatTitle, setCurrentConversationId, setSelectedProject, clearAttachedFiles, initialMessageSent, isUpdatingUrlRef, isSendingMessageRef]);

  // Handle click outside for settings menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = () => {
    handleSendWithMessage(input);
    setInput('');
  };

  return (
    <React.Fragment>
      <div className="chat-page-container">
        <div className="chat-page-content">
          {messages.length > 0 && (
            <ChatHeader
              chatTitle={chatTitle}
              selectedProject={selectedProject}
              isEditingTitle={isEditingTitle}
              editedTitle={editedTitle}
              setEditedTitle={setEditedTitle}
              showOptions={showOptions}
              setShowOptions={setShowOptions}
              titleInputRef={titleInputRef}
              optionsRef={optionsRef}
              handleRename={handleRename}
              handleSaveTitle={handleSaveTitle}
              handleStarChat={handleStarChat}
              handleDelete={handleDelete}
              setIsEditingTitle={setIsEditingTitle}
            />
          )}

          <div className={`chat-messages-wrapper ${messages.length === 0 ? 'full-height' : ''}`}>
            {messages.length === 0 ? (
              <ChatEmptyState selectedProject={selectedProject} />
            ) : (
              <ChatMessages
                messages={messages}
                loading={loading}
                messagesEndRef={messagesEndRef}
                currentModel={currentModel}
                selectedModelVariant={selectedModelVariant}
                customIntegrations={customIntegrations}
              />
            )}
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            loading={isLoading}
            attachedFiles={attachedFiles}
            fileInputRef={fileInputRef}
            handleFileSelect={handleFileSelect}
            handleRemoveFile={handleRemoveFile}
            handleSend={handleSend}
            modelProviders={modelProviders}
            modelVariants={modelVariants}
            currentModel={currentModel}
            setCurrentModel={setCurrentModel}
            selectedModelVariant={selectedModelVariant}
            setSelectedModelVariant={setSelectedModelVariant}
            showSettingsMenu={showSettingsMenu}
            setShowSettingsMenu={setShowSettingsMenu}
            settingsMenuRef={settingsMenuRef}
          />

          <ChatSettingsMenu
            showSettingsMenu={showSettingsMenu}
            setShowSettingsMenu={setShowSettingsMenu}
            setShowConnectorsModal={setShowConnectorsModal}
            settingsMenuRef={settingsMenuRef}
          />
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
    </React.Fragment>
  );
}

export default React.memo(ChatPage);
