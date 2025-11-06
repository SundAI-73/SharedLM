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
    // Send credential to your backend
    const result = await fetch(`${process.env.REACT_APP_API_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: response.credential,
      }),
    });

    const data = await result.json();

    if (data.success) {
      // Store session
      localStorage.setItem('sharedlm_session', 'authenticated');
      localStorage.setItem('sharedlm_user_email', data.email);
      localStorage.setItem('sharedlm_user_name', data.name);
      
      // Redirect to chat
      window.location.href = '/chat';
    }
  } catch (error) {
    console.error('Google login error:', error);
    alert('Failed to sign in with Google. Please try again.');
  }
};

/**
 * Initialize GitHub OAuth
 */
export const handleGithubLogin = () => {
  const githubClientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  
  if (!githubClientId) {
    console.error('GitHub Client ID not configured');
    alert('GitHub login is not configured. Please add REACT_APP_GITHUB_CLIENT_ID to your .env file');
    return;
  }

  // GitHub OAuth URL
  const redirectUri = `${window.location.origin}/auth/github/callback`;
  const scope = 'read:user user:email';
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  
  // Redirect to GitHub
  window.location.href = githubAuthUrl;
};

/**
 * Handle GitHub OAuth callback
 * Call this in a separate callback page component
 */
export const handleGithubCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (!code) {
    console.error('No authorization code received');
    window.location.href = '/login';
    return;
  }

  try {
    // Send code to your backend
    const result = await fetch(`${process.env.REACT_APP_API_URL}/auth/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await result.json();

    if (data.success) {
      localStorage.setItem('sharedlm_session', 'authenticated');
      localStorage.setItem('sharedlm_user_email', data.email);
      localStorage.setItem('sharedlm_user_name', data.name);
      
      // Redirect to chat
      window.location.href = '/chat';
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('GitHub login error:', error);
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