// src/contexts/UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  // Generate or retrieve user ID
  const getOrCreateUserId = () => {
    let userId = localStorage.getItem('sharedlm_user_id');
    if (!userId) {
      userId = `user_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('sharedlm_user_id', userId);
    }
    return userId;
  };

  const [userId, setUserId] = useState(getOrCreateUserId());
  const [currentModel, setCurrentModel] = useState('openai');
  const [connectedModels, setConnectedModels] = useState({
    openai: false,
    anthropic: false
  });
  const [backendConnected, setBackendConnected] = useState(false);

  // Update localStorage when userId changes
  useEffect(() => {
    localStorage.setItem('sharedlm_user_id', userId);
  }, [userId]);

  const value = {
    userId,
    setUserId,
    currentModel,
    setCurrentModel,
    connectedModels,
    setConnectedModels,
    backendConnected,
    setBackendConnected
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};