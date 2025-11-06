import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NothingSidebar from './components/layout/Sidebar/Sidebar';
import { UserProvider, useUser } from './contexts/UserContext';
import { NotificationProvider } from './contexts/NotificationContext';
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
const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const SignupPage = lazy(() => import('./pages/Signup/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const GitHubCallback = lazy(() => import('./pages/Auth/GitHubCallback'));

// Loading component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: '__anthropicSans__, -apple-system, sans-serif',
    color: '#666'
  }}>
    Loading...
  </div>
);

// Layout wrapper that conditionally shows sidebar
function AppLayout({ children }) {
  const location = useLocation();
  
  // Pages that should NOT show the sidebar
  const noSidebarRoutes = ['/login', '/signup', '/forgot-password'];
  const shouldShowSidebar = !noSidebarRoutes.includes(location.pathname);

  return (
    <div className="nothing-app">
      {shouldShowSidebar && <NothingSidebar />}
      <main className={shouldShowSidebar ? 'nothing-main' : 'nothing-main-fullwidth'}>
        {children}
      </main>
    </div>
  );
}

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
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/github/callback" element={<GitHubCallback />} />
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
      </AppLayout>
    </BrowserRouter>
  );
}

function App() {
  return (
    <NotificationProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </NotificationProvider>
  );
}

export default React.memo(App);