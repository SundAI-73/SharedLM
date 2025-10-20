// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NothingSidebar from './components/layout/Sidebar/Sidebar';
import IntegrationsPage from './pages/Integrations/IntegrationsPage';
import AuthPage from './pages/Auth/AuthPage';
import ChatPage from './pages/Chat/ChatPage';
import ProjectsPage from './pages/Projects/ProjectsPage';
import HistoryPage from './pages/History/HistoryPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import { UserProvider } from './contexts/UserContext';
import apiService from './services/api/index';

// Import all style files
import './styles/index.css';

function App() {
  const [connectedLLMs, setConnectedLLMs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

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
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--main-margin-left',
      sidebarExpanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-width)'
    );
  }, [sidebarExpanded]);

  return (
    <UserProvider>
      <BrowserRouter>
        <div className="nothing-app">
          <NothingSidebar />
          <main className="nothing-main">
            <Routes>
              {/* Redirect root to /chat */}
              <Route path="/" element={<Navigate to="/chat" replace />} />

              {/* Main routes */}
              <Route path="/chat" element={
                <ChatPage backendStatus={backendStatus} />
              } />

              <Route path="/integrations" element={
                <IntegrationsPage 
                  connectedLLMs={connectedLLMs}
                  setSelectedLLM={setSelectedLLM}
                />
              } />

              <Route path="/auth" element={
                <AuthPage
                  selectedLLM={selectedLLM}
                  setConnectedLLMs={setConnectedLLMs}
                  connectedLLMs={connectedLLMs}
                />
              } />

              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;