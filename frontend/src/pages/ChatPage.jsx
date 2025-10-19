// src/pages/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import { Send, Paperclip, Mic, AlertCircle, RefreshCw } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import apiService from '../services/api';

function ChatPage({ backendStatus }) {
  const { userId, currentModel, setCurrentModel } = useUser();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState(['openai', 'anthropic']);

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      const modelsData = await apiService.getModels();
      if (modelsData) {
        setAvailableModels(modelsData.available_models);
      }
    };
    if (backendStatus === 'connected') {
      fetchModels();
    }
  }, [backendStatus]);

  const handleSend = async () => {
    if (!input.trim() || backendStatus !== 'connected') return;
    
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await apiService.sendMessage(userId, userMessage.content, currentModel);
      
      if (response) {
        const assistantMessage = {
          role: 'assistant',
          content: response.reply,
          model: response.used_model,
          memories: response.memories,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        error: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = () => {
    window.location.reload();
  };

  return (
    <>
      <div className="chat-page">
        {/* Clean Header */}
        <div className="chat-header">
          <select 
            className="model-dropdown"
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            disabled={backendStatus !== 'connected'}
          >
            {currentModel === 'openai' ? (
              <>
                <option value="openai">GPT-4</option>
                <option value="anthropic">Claude</option>
              </>
            ) : (
              <>
                <option value="anthropic">Claude</option>
                <option value="openai">GPT-4</option>
              </>
            )}
          </select>
        </div>

        {/* Chat Content */}
        <div className="chat-content">
          {backendStatus !== 'connected' ? (
            <div className="connection-error">
              <AlertCircle size={48} color="rgba(255, 255, 255, 0.6)" />
              <h2>Unable to Connect</h2>
              <p>Please ensure the backend server is running</p>
              <div className="connection-instructions">
                <code>cd backend && python app.py</code>
              </div>
              <button onClick={retryConnection} className="retry-btn">
                <RefreshCw size={18} />
                Retry Connection
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="ai-orb">
                <div className="orb-inner"></div>
              </div>

              <h1 className="welcome-title">
                How can I assist you today?
              </h1>

              <div className="main-input-container">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
                  placeholder="Type your message..."
                  className="main-input"
                  disabled={loading}
                  autoFocus
                />
                
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="input-send-btn"
                >
                  <Send size={20} />
                </button>
              </div>

              <div className="quick-prompts">
                <button 
                  className="quick-prompt-btn"
                  onClick={() => setInput("Tell me about machine learning")}
                >
                  Tell me about machine learning
                </button>
                <button 
                  className="quick-prompt-btn"
                  onClick={() => setInput("Help me write code")}
                >
                  Help me write code
                </button>
                <button 
                  className="quick-prompt-btn"
                  onClick={() => setInput("Explain quantum computing")}
                >
                  Explain quantum computing
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-wrapper">
              <div className="messages-container">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.role} ${msg.error ? 'error' : ''}`}>
                    <div className="message-content">
                      {msg.content}
                      {msg.model && (
                        <div className="message-meta">
                          {msg.model}
                        </div>
                      )}
                      {msg.memories && msg.memories.length > 0 && (
                        <details className="memories-block">
                          <summary>Context from memory ({msg.memories.length})</summary>
                          <div className="memories-list">
                            {msg.memories.map((memory, i) => (
                              <div key={i} className="memory-item">{memory}</div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="message assistant">
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar for Active Chat */}
        {messages.length > 0 && backendStatus === 'connected' && (
          <div className="chat-input-bar">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder="Type your message..."
              className="chat-input"
              disabled={loading}
              autoFocus
            />
            <button 
              onClick={handleSend} 
              className="send-btn"
              disabled={!input.trim() || loading}
            >
              <Send size={20} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .chat-page {
          height: 100vh;
          background: #000000;
          display: flex;
          flex-direction: column;
          color: white;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Header */
        .chat-header {
          padding: 1rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          flex-shrink: 0;
        }

        .model-dropdown {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 0.5rem 2rem 0.5rem 1rem;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.875rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          cursor: pointer;
          outline: none;
          min-width: 120px;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='white' stroke-opacity='0.5' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          transition: all 0.2s;
        }

        .model-dropdown option {
          background: #0a0a0a;
          color: rgba(255, 255, 255, 0.9);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .model-dropdown:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }

        .model-dropdown:focus {
          border-color: rgba(103, 126, 234, 0.5);
          box-shadow: 0 0 0 2px rgba(103, 126, 234, 0.1);
        }

        .model-dropdown:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Chat Content */
        .chat-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 2rem;
        }

        /* Connection Error */
        .connection-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          height: 100%;
          color: rgba(255, 255, 255, 0.8);
        }

        .connection-error h2 {
          font-weight: 400;
          font-size: 1.5rem;
        }

        .connection-error p {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.95rem;
        }

        .connection-instructions {
          margin: 1rem 0;
        }

        .connection-instructions code {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.9rem;
          display: block;
        }

        .retry-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        /* Welcome Screen */
        .welcome-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          max-width: 700px;
          margin: 0 auto;
          width: 100%;
        }

        /* AI Orb */
        .ai-orb {
          width: 80px;
          height: 80px;
          margin-bottom: 2rem;
          position: relative;
        }

        .orb-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          opacity: 0.8;
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }

        /* Welcome Text */
        .welcome-title {
          font-size: 1.75rem;
          font-weight: 300;
          margin-bottom: 2rem;
          color: rgba(255, 255, 255, 0.9);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          letter-spacing: -0.01em;
        }

        /* Main Input */
        .main-input-container {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin-bottom: 1.5rem;
        }

        .main-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem 3.5rem 1rem 1.5rem;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s;
        }

        .main-input:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .main-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .input-send-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
        }

        .input-send-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .input-send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Quick Prompts */
        .quick-prompts {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .quick-prompt-btn {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-prompt-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateY(-1px);
        }

        /* Messages Wrapper */
        .messages-wrapper {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-bottom: 80px; /* Space for fixed input bar */
        }

        /* Messages Container */
        .messages-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
          padding-bottom: 1rem;
        }

        .message {
          display: flex;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message.user {
          justify-content: flex-end;
        }

        .message-content {
          max-width: 70%;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .message.user .message-content {
          background: linear-gradient(135deg, rgba(103, 126, 234, 0.15), rgba(103, 126, 234, 0.1));
          border-color: rgba(103, 126, 234, 0.2);
        }

        .message.error .message-content {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .message-meta {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Memories Block */
        .memories-block {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .memories-block summary {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          user-select: none;
        }

        .memories-block summary:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .memories-list {
          margin-top: 0.5rem;
        }

        .memory-item {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          padding: 0.25rem 0;
          padding-left: 1rem;
          position: relative;
        }

        .memory-item::before {
          content: '•';
          position: absolute;
          left: 0;
        }

        /* Typing Indicator */
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 0.25rem;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }

        /* Chat Input Bar */
        .chat-input-bar {
          position: fixed;
          bottom: 0;
          left: 260px; /* Account for sidebar width */
          right: 0;
          padding: 1rem 2rem;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          gap: 0.75rem;
          z-index: 10;
        }

        .chat-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.875rem 1.25rem;
          color: white;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .chat-input:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .chat-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .send-btn {
          padding: 0 1.25rem;
          background: rgba(103, 126, 234, 0.2);
          border: none;
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          background: rgba(103, 126, 234, 0.3);
          color: white;
        }

        .send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Custom Scrollbar for Messages */
        .messages-wrapper::-webkit-scrollbar {
          width: 6px;
        }

        .messages-wrapper::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }

        .messages-wrapper::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .messages-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </>
  );
}

export default ChatPage;