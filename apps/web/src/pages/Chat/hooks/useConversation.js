import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/api/index';
import { generateChatTitle } from '../utils/chatHelpers';

export const useConversation = (userId) => {
  const navigate = useNavigate();
  const [chatTitle, setChatTitle] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  
  const titleInputRef = useRef(null);
  const optionsRef = useRef(null);
  const initialMessageSent = useRef(false);
  const isUpdatingUrlRef = useRef(false);
  const isSendingMessageRef = useRef(false);

  const loadConversation = useCallback(async (conversationId) => {
    try {
      const loadedMessages = await apiService.getMessages(conversationId);
      
      if (!loadedMessages || loadedMessages.length === 0) {
        console.warn('No messages found for conversation:', conversationId);
        return [];
      }
      
      const messages = loadedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        model: msg.model,
        timestamp: msg.created_at
      }));
      
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
      
      return messages;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return [{
        role: 'assistant',
        content: 'Failed to load conversation. Please try again.',
        timestamp: new Date().toISOString()
      }];
    }
  }, [userId]);


  // Handle click outside for options menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

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
      setChatTitle('');
      setCurrentConversationId(null);
      setShowOptions(false);
      navigate('/chat');
    }
  }, [navigate, currentConversationId]);

  const handleStarChat = useCallback(async () => {
    if (currentConversationId) {
      try {
        await apiService.toggleStarConversation(currentConversationId);
      } catch (error) {
        console.error('Failed to star chat:', error);
      }
    }
    setShowOptions(false);
  }, [currentConversationId]);

  const updateTitleFromMessage = useCallback(async (firstUserMessage, conversationId) => {
    if (firstUserMessage) {
      const title = generateChatTitle(firstUserMessage.content);
      setChatTitle(title);
      
      if (conversationId) {
        apiService.updateConversationTitle(conversationId, title).catch(err => {
          console.error('Failed to update title:', err);
        });
      }
    }
  }, []);

  const updateUrlAfterNewConversation = useCallback((conversationId) => {
    setTimeout(() => {
      isUpdatingUrlRef.current = true;
      navigate(`/chat?conversation=${conversationId}`, { replace: true });
      // Clear flag after navigation completes to allow future loads
      setTimeout(() => {
        isUpdatingUrlRef.current = false;
      }, 300);
    }, 300);
  }, [navigate]);

  return {
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
    updateTitleFromMessage,
    updateUrlAfterNewConversation
  };
};

