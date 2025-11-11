import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import NothingSidebar from './components/layout/Sidebar/Sidebar';
import TitleBar from './components/common/TitleBar/TitleBar';
import ProtectedRoute from './components/common/ProtectedRoute/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import { UserProvider, useUser } from './contexts/UserContext';
import { NotificationProvider } from './contexts/NotificationContext';
import apiService from './services/api/index';
import { initSessionMonitoring } from './utils/sessionManager';
import './styles/index.css';

// Lazy load pages for code splitting
const ChatPage = lazy(() => import('./pages/Chat/ChatPage'));
const IntegrationsPage = lazy(() => import('./pages/Integrations/IntegrationsPage'));
const AuthPage = lazy(() => import('./pages/Auth/AuthPage'));
const AddCustomIntegrationPage = lazy(() => import('./pages/AddCustomIntegration/AddCustomIntegrationPage'));
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
    fontFamily: 'Courier New, monospace',
    color: '#666666',
    letterSpacing: '2px',
    fontSize: '0.9rem'
  }}>
    LOADING...
  </div>
);

// Layout wrapper that conditionally shows sidebar and titlebar
function AppLayout({ children }) {
  const location = useLocation();
  const [platform, setPlatform] = useState(null);
  
  // Pages that should NOT show the sidebar
  const noSidebarRoutes = ['/login', '/signup', '/forgot-password', '/auth/github/callback'];
  const shouldShowSidebar = !noSidebarRoutes.includes(location.pathname);
  
  // Check if running in Electron and get platform
  const isElectron = window.electron?.isElectron || false;

  useEffect(() => {
    if (window.electron?.platform) {
      setPlatform(window.electron.platform);
    }
  }, []);

  const platformClass = platform === 'darwin' ? 'platform-macos' : platform === 'win32' ? 'platform-windows' : '';

  return (
    <div className={`nothing-app ${isElectron ? 'electron-app' : ''} ${platformClass}`}>
      {/* Show custom titlebar only in Electron */}
      {isElectron && <TitleBar />}
      
      {/* Show sidebar for authenticated pages */}
      {shouldShowSidebar && <NothingSidebar />}
      
      {/* Main content area */}
      <main className={shouldShowSidebar ? 'nothing-main' : 'nothing-main-fullwidth'}>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
              style={{ 
                width: '100%', 
                height: '100%', 
                position: 'relative',
                contain: 'layout style paint'
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}

function AppContent() {
  const [connectedLLMs, setConnectedLLMs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const { analyticsEnabled } = useUser();

  // Check backend on mount
  useEffect(() => {
    let mounted = true;
    
    const checkBackend = async () => {
      // In Electron, wait longer for backend to initialize
      if (window.electron) {
        console.log('🖥️ Running in Electron - waiting for backend...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      try {
        const health = await apiService.checkHealth();
        if (mounted) {
          setBackendStatus(health.status === 'ok' ? 'connected' : 'disconnected');
          console.log('✅ Backend status:', health.status);
        }
      } catch (error) {
        console.error('❌ Backend check failed:', error);
        if (mounted) {
          setBackendStatus('disconnected');
        }
      }
    };

    checkBackend();
    return () => { mounted = false; };
  }, []);

  // Log Electron environment info
  useEffect(() => {
    if (window.electron) {
      console.log('🖥️ Running in Electron');
      console.log('Platform:', window.electron.platform);
    } else {
      console.log('🌐 Running in browser');
    }
  }, []);

  // Use HashRouter in Electron, BrowserRouter in web
  const Router = window.electron ? HashRouter : BrowserRouter;
  
  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/github/callback" element={<GitHubCallback />} />
          
          {/* Main app routes - Protected */}
          <Route path="/chat" element={
            <ProtectedRoute>
              <ChatPage backendStatus={backendStatus} />
            </ProtectedRoute>
          } />
          
          <Route path="/integrations" element={
            <ProtectedRoute>
              <IntegrationsPage 
                connectedLLMs={connectedLLMs}
                setConnectedLLMs={setConnectedLLMs}
                setSelectedLLM={setSelectedLLM}
              />
            </ProtectedRoute>
          } />
          
          <Route path="/auth" element={
            <ProtectedRoute>
              <AuthPage
                selectedLLM={selectedLLM}
                setSelectedLLM={setSelectedLLM}
                setConnectedLLMs={setConnectedLLMs}
                connectedLLMs={connectedLLMs}
              />
            </ProtectedRoute>
          } />
          
          <Route path="/add-custom-integration" element={
            <ProtectedRoute>
              <AddCustomIntegrationPage
                setSelectedLLM={setSelectedLLM}
                setConnectedLLMs={setConnectedLLMs}
                connectedLLMs={connectedLLMs}
              />
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          } />
          <Route path="/projects/:projectId" element={
            <ProtectedRoute>
              <ProjectLanding />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          } />
          
          <Route path="/analytics" element={
            <ProtectedRoute>
              {analyticsEnabled ? <AnalyticsPage /> : <Navigate to="/chat" replace />}
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          {/* Catch all - redirect to login if not authenticated, chat if authenticated */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

// Main App component
function App() {
  // Initialize session monitoring on mount
  useEffect(() => {
    initSessionMonitoring();
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default React.memo(App);