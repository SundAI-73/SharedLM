import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NothingSidebar from './components/layout/Sidebar/Sidebar';
import { UserProvider, useUser } from './contexts/UserContext';
import apiService from './services/api/index';
import './styles/index.css';

// Lazy load pages for code splitting
const ChatPage = lazy(() => import('./pages/Chat/ChatPage'));
const IntegrationsPage = lazy(() => import('./pages/Integrations/IntegrationsPage'));
const AuthPage = lazy(() => import('./pages/Auth/AuthPage'));
const ProjectsPage = lazy(() => import('./pages/Projects/ProjectsPage'));
const ProjectLanding = lazy(() => import('./pages/Projects/ProjectLanding'));
const HistoryPage = lazy(() => import('./pages/History/HistoryPage'));
const AnalyticsPage = lazy(() => import('./pages/Analytics/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));

// Loading component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: 'Courier New, monospace',
    color: '#666'
  }}>
    Loading...
  </div>
);

function AppContent() {
  const [connectedLLMs, setConnectedLLMs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const { analyticsEnabled } = useUser();

  // Check backend on mount only
  useEffect(() => {
    let mounted = true;
    
    const checkBackend = async () => {
      const health = await apiService.checkHealth();
      if (mounted) {
        setBackendStatus(health.status === 'ok' ? 'connected' : 'disconnected');
      }
    };

    checkBackend();
    return () => { mounted = false; };
  }, []);

  return (
    <BrowserRouter>
      <div className="nothing-app">
        <NothingSidebar />
        <main className="nothing-main">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatPage backendStatus={backendStatus} />} />
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
              <Route path="/projects/:projectId" element={<ProjectLanding />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={
                analyticsEnabled ? <AnalyticsPage /> : <Navigate to="/chat" replace />
              } />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Suspense>
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

export default React.memo(App);