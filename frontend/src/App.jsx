// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import LinkLLMPage from './pages/LinkLLMPage';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import ProjectsPage from './pages/ProjectsPage';
import ChatsPage from './pages/ChatsPage';
import { UserProvider } from './contexts/UserContext';
import apiService from './services/api';
import './App.css';

function App() {
  const [connectedLLMs, setConnectedLLMs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      const health = await apiService.checkHealth();
      if (health.status === 'ok') {
        setBackendStatus('connected');
        console.log('Backend connected successfully');
      } else {
        setBackendStatus('disconnected');
        console.error('Backend not available');
      }
    };

    checkBackend();
    // Check every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <UserProvider>
      <BrowserRouter>
        <div className="app">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/link-llm" element={
                <LinkLLMPage 
                  connectedLLMs={connectedLLMs}
                  setSelectedLLM={setSelectedLLM}
                  backendStatus={backendStatus}
                />
              } />
              <Route path="/auth" element={
                <AuthPage 
                  selectedLLM={selectedLLM}
                  setConnectedLLMs={setConnectedLLMs}
                  connectedLLMs={connectedLLMs}
                />
              } />
              <Route path="/chat" element={
                <ChatPage backendStatus={backendStatus} />
              } />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/chats" element={<ChatsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;