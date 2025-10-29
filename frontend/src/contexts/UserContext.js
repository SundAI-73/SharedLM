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
  const [currentModel, setCurrentModel] = useState('mistral');
  const [connectedModels, setConnectedModels] = useState({
    openai: false,
    anthropic: false
  });
  const [backendConnected, setBackendConnected] = useState(false);
  
  // Analytics page visibility state - default enabled
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => {
    const saved = localStorage.getItem('sharedlm_analytics_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Update localStorage when userId changes
  useEffect(() => {
    localStorage.setItem('sharedlm_user_id', userId);
  }, [userId]);

  // Update localStorage when analytics preference changes
  useEffect(() => {
    localStorage.setItem('sharedlm_analytics_enabled', JSON.stringify(analyticsEnabled));
  }, [analyticsEnabled]);

  const value = {
    userId,
    setUserId,
    currentModel,
    setCurrentModel,
    connectedModels,
    setConnectedModels,
    backendConnected,
    setBackendConnected,
    analyticsEnabled,
    setAnalyticsEnabled
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};