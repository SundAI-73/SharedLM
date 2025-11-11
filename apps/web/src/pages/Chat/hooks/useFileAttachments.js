import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import apiService from '../../../services/api/index';
import { logEvent, EventType, LogLevel } from '../../../utils/auditLogger';

export const useFileAttachments = (currentConversationId, selectedProject, selectedModelVariant, setCurrentConversationId, onLoadingChange) => {
  const { userId } = useUser();
  const navigate = useNavigate();
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(async (e) => {
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
      setUploading(true);
      if (onLoadingChange) onLoadingChange(true);
      
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
      setUploading(false);
      if (onLoadingChange) onLoadingChange(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [userId, currentConversationId, selectedProject, selectedModelVariant, setCurrentConversationId, onLoadingChange, navigate]);

  const handleRemoveFile = useCallback((filename) => {
    setAttachedFiles(prev => prev.filter(f => f.filename !== filename));
  }, []);

  const clearAttachedFiles = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  return {
    attachedFiles,
    setAttachedFiles,
    uploading,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    clearAttachedFiles
  };
};

