import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../../../utils/auth';
import { isSessionValid } from '../../../utils/sessionManager';
import { logEvent, EventType, LogLevel } from '../../../utils/auditLogger';

/**
 * ProtectedRoute component that checks authentication before rendering protected routes
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  
  // Check if user is authenticated and session is valid
  const authenticated = isAuthenticated() && isSessionValid();

  if (!authenticated) {
    // Log unauthorized access attempt
    logEvent(
      EventType.UNAUTHORIZED_ACCESS,
      LogLevel.SECURITY,
      'Unauthorized access attempt to protected route',
      { path: location.pathname }
    );
    
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

