/**
 * Session management utility
 * Handles session expiration and automatic logout
 */

const SESSION_KEY = 'sharedlm_session';
const SESSION_EXPIRY_KEY = 'sharedlm_session_expiry';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Create a new session
 * @param {object} userData - User data
 */
export const createSession = (userData) => {
  const expiryTime = Date.now() + SESSION_DURATION;
  
  localStorage.setItem(SESSION_KEY, 'authenticated');
  localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
  
  if (userData.id) {
    localStorage.setItem('sharedlm_user_id', userData.id);
  }
  if (userData.email) {
    localStorage.setItem('sharedlm_user_email', userData.email);
  }
  if (userData.display_name || userData.name) {
    const fullName = userData.display_name || userData.name;
    localStorage.setItem('sharedlm_full_name', fullName);
    // Preserve existing nickname if the user already set one; otherwise keep it empty
    if (!localStorage.getItem('sharedlm_user_name')) {
      localStorage.setItem('sharedlm_user_name', '');
    }
  }
  
  // Store token if provided (for JWT)
  if (userData.token) {
    sessionStorage.setItem('auth_token', userData.token);
  }
};

/**
 * Check if session is valid
 * @returns {boolean}
 */
export const isSessionValid = () => {
  const session = localStorage.getItem(SESSION_KEY);
  if (session !== 'authenticated') {
    return false;
  }

  const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
  if (!expiryTime) {
    return false;
  }

  const now = Date.now();
  if (now > parseInt(expiryTime, 10)) {
    // Session expired
    clearSession();
    return false;
  }

  return true;
};

/**
 * Get session expiry time
 * @returns {number|null}
 */
export const getSessionExpiry = () => {
  const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
  return expiryTime ? parseInt(expiryTime, 10) : null;
};

/**
 * Extend session (refresh expiry time)
 */
export const extendSession = () => {
  if (isSessionValid()) {
    const expiryTime = Date.now() + SESSION_DURATION;
    localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
    return true;
  }
  return false;
};

/**
 * Clear session
 */
export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_EXPIRY_KEY);
  localStorage.removeItem('sharedlm_user_id');
  localStorage.removeItem('sharedlm_user_email');
  localStorage.removeItem('sharedlm_full_name');
  localStorage.removeItem('sharedlm_user_name');
  sessionStorage.removeItem('auth_token');
  
  // Clear API keys from localStorage
  localStorage.removeItem('sharedlm_api_openai');
  localStorage.removeItem('sharedlm_api_anthropic');
  localStorage.removeItem('sharedlm_api_mistral');
};

/**
 * Get time until session expires (in milliseconds)
 * @returns {number}
 */
export const getTimeUntilExpiry = () => {
  const expiryTime = getSessionExpiry();
  if (!expiryTime) {
    return 0;
  }
  return Math.max(0, expiryTime - Date.now());
};

/**
 * Check and handle session expiration
 * @param {boolean} redirect - Whether to redirect to login if session is invalid (default: false)
 * @returns {boolean} - true if session is valid, false if expired
 */
export const checkSession = (redirect = false) => {
  if (!isSessionValid()) {
    // Session expired or invalid
    if (redirect && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
      clearSession();
      window.location.href = '/login?expired=true';
    }
    return false;
  }
  return true;
};

/**
 * Initialize session monitoring
 * Checks session validity periodically and on user activity
 */
export const initSessionMonitoring = () => {
  // Only monitor session if user is authenticated
  if (!isSessionValid()) {
    return;
  }

  // Check session every minute (only redirect if on protected page)
  setInterval(() => {
    const isOnAuthPage = ['/login', '/signup', '/forgot-password', '/auth/github/callback'].includes(window.location.pathname);
    if (!isOnAuthPage) {
      checkSession(true); // Redirect if session expired on protected page
    } else {
      checkSession(false); // Just check, don't redirect on auth pages
    }
  }, 60000);

  // Extend session on user activity (debounced)
  let activityTimeout;
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  const handleActivity = () => {
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
      if (isSessionValid()) {
        extendSession();
      }
    }, 30000); // Extend after 30 seconds of activity (less aggressive)
  };

  events.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true });
  });

  // Initial check (don't redirect on init)
  checkSession(false);
};

