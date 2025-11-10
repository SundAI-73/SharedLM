export const handleGoogleLogin = () => {
  // Google OAuth configuration
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  
  if (!googleClientId) {
    console.error('Google Client ID not configured');
    alert('Google login is not configured. Please add REACT_APP_GOOGLE_CLIENT_ID to your .env file');
    return;
  }

  // Initialize Google Sign-In
  if (window.google) {
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCallback,
    });

    window.google.accounts.id.prompt();
  } else {
    console.error('Google Sign-In library not loaded');
  }
};

/**
 * Handle Google OAuth callback
 */
const handleGoogleCallback = async (response) => {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    
    // Send credential to your backend
    const result = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: response.credential,
      }),
    });

    if (!result.ok) {
      throw new Error('Authentication failed');
    }

    const data = await result.json();

    if (data.success) {
      // Use auth utility to set authentication
      const { setAuth } = await import('./auth');
      setAuth({
        id: data.user?.id,
        email: data.email,
        name: data.name,
        display_name: data.name
      });
      
      // Redirect to chat
      window.location.href = '/chat';
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Google login error:', error);
    }
    alert('Failed to sign in with Google. Please try again.');
  }
};

/**
 * Generate a random state token for CSRF protection
 */
const generateStateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Initialize GitHub OAuth with CSRF protection
 */
export const handleGithubLogin = () => {
  const githubClientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  
  if (!githubClientId) {
    console.error('GitHub Client ID not configured');
    alert('GitHub login is not configured. Please add REACT_APP_GITHUB_CLIENT_ID to your .env file');
    return;
  }

  // Generate state token for CSRF protection
  const state = generateStateToken();
  sessionStorage.setItem('oauth_state', state);

  // GitHub OAuth URL
  const redirectUri = `${window.location.origin}/auth/github/callback`;
  const scope = 'read:user user:email';
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  
  // Redirect to GitHub
  window.location.href = githubAuthUrl;
};

/**
 * Handle GitHub OAuth callback with CSRF protection
 * Call this in a separate callback page component
 */
export const handleGithubCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  // Verify state parameter to prevent CSRF attacks
  const storedState = sessionStorage.getItem('oauth_state');
  if (!state || state !== storedState) {
    console.error('Invalid state parameter - possible CSRF attack');
    alert('Authentication failed. Please try again.');
    sessionStorage.removeItem('oauth_state');
    window.location.href = '/login';
    return;
  }

  // Clear state token after verification
  sessionStorage.removeItem('oauth_state');

  if (!code) {
    console.error('No authorization code received');
    window.location.href = '/login';
    return;
  }

  try {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    
    // Send code to your backend
    const result = await fetch(`${API_URL}/auth/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!result.ok) {
      throw new Error('Authentication failed');
    }

    const data = await result.json();

    if (data.success) {
      // Use auth utility to set authentication
      const { setAuth } = await import('./auth');
      setAuth({
        id: data.user?.id,
        email: data.email,
        name: data.name,
        display_name: data.name
      });
      
      // Redirect to chat
      window.location.href = '/chat';
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GitHub login error:', error);
    }
    alert('Failed to sign in with GitHub. Please try again.');
    window.location.href = '/login';
  }
};

export const handleMockOAuth = (provider) => {
  console.log(`Mock ${provider} login for development`);

  setTimeout(() => {
    localStorage.setItem('sharedlm_session', 'authenticated');
    localStorage.setItem('sharedlm_user_email', `user@${provider}.com`);
    localStorage.setItem('sharedlm_user_name', `${provider} User`);
    window.location.href = '/chat';
  }, 1000);
};