import React from 'react';
import { Sparkles, Link, MessageSquare, FolderOpen } from 'lucide-react';

function HomePage() {
  return (
    <div className="page-container">
      <div className="home-container">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          <Sparkles size={60} color="#667eea" />
        </div>
        <h1 style={{ color: '#333', marginBottom: '1rem' }}>
          Welcome to LLM Portal
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Your unified interface for managing and interacting with multiple AI language models
        </p>
        
        <div className="home-features">
          <div className="feature-card">
            <Link size={32} color="#667eea" />
            <h3 style={{ margin: '1rem 0 0.5rem', color: '#333' }}>Connect LLMs</h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Link multiple AI assistants in one place
            </p>
          </div>
          
          <div className="feature-card">
            <MessageSquare size={32} color="#764ba2" />
            <h3 style={{ margin: '1rem 0 0.5rem', color: '#333' }}>Unified Chat</h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Chat with any connected LLM seamlessly
            </p>
          </div>
          
          <div className="feature-card">
            <FolderOpen size={32} color="#8b5cf6" />
            <h3 style={{ margin: '1rem 0 0.5rem', color: '#333' }}>Manage Projects</h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Organize your AI conversations by project
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;