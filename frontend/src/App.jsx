import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
  
  // Pages that should NOT show the sidebar
  const noSidebarRoutes = ['/login', '/signup', '/forgot-password', '/auth/github/callback'];
  const shouldShowSidebar = !noSidebarRoutes.includes(location.pathname);
  
  // Check if running in Electron
  const isElectron = window.electron?.isElectron || false;

  return (
    <div className={`nothing-app ${isElectron ? 'electron-app' : ''}`}>
      {/* Show custom titlebar only in Electron */}
      {isElectron && <TitleBar />}
      
      {/* Show sidebar for authenticated pages */}
      {shouldShowSidebar && <NothingSidebar />}
      
      {/* Main content area */}
      <main className={shouldShowSidebar ? 'nothing-main' : 'nothing-main-fullwidth'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ width: '100%', height: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
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

  return (
    <BrowserRouter>
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
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
                  setSelectedLLM={setSelectedLLM}
                />
              </ProtectedRoute>
            } />
            
            <Route path="/auth" element={
              <ProtectedRoute>
                <AuthPage
                  selectedLLM={selectedLLM}
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
        </Suspense>
      </AppLayout>
    </BrowserRouter>
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