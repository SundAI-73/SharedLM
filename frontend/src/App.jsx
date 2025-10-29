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
import { UserProvider, useUser } from './contexts/UserContext';
import apiService from './services/api/index';
import ProjectLanding from './pages/Projects/ProjectLanding';

// Import all style files
import './styles/index.css';

// Separate component to access useUser hook
function AppContent() {
  const [connectedLLMs, setConnectedLLMs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { analyticsEnabled } = useUser();

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
            
            {/* Analytics route - conditionally rendered based on setting */}
            <Route 
              path="/analytics" 
              element={
                analyticsEnabled ? (
                  <AnalyticsPage />
                ) : (
                  <Navigate to="/chat" replace />
                )
              } 
            />
            
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/projects/:projectId" element={<ProjectLanding />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;