import React, { useEffect } from 'react';
import { handleGithubCallback } from '../../utils/oauthUtils';
import logo from '../../assets/images/logo main.svg';

function GitHubCallback() {
  useEffect(() => {
    handleGithubCallback();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      background: '#000000',
      color: '#888888',
      fontFamily: 'Courier New, monospace'
    }}>
      <img 
        src={logo} 
        alt="SharedLM" 
        style={{
          width: '80px',
          height: '80px',
          opacity: 0.8,
          animation: 'pulse 2s ease-in-out infinite'
        }}
      />
      <p style={{ letterSpacing: '2px', fontSize: '0.9rem' }}>
        Completing GitHub authentication...
      </p>
      <div style={{ display: 'flex', gap: '6px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#B94539',
          animation: 'bounce 1.4s ease-in-out infinite'
        }}></span>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#B94539',
          animation: 'bounce 1.4s ease-in-out 0.2s infinite'
        }}></span>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#B94539',
          animation: 'bounce 1.4s ease-in-out 0.4s infinite'
        }}></span>
      </div>
    </div>
  );
}

export default GitHubCallback;