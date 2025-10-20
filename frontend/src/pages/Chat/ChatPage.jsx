// src/pages/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import { Send, Mic, Paperclip, MoreVertical, AlertCircle, RefreshCw } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api/index';
import './Chat.css';

function ChatPage({ backendStatus }) {
  const { userId, currentModel, setCurrentModel } = useUser();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState(['openai', 'anthropic']);

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
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <h2 className="chat-title">NEW CONVERSATION</h2>
          <span className="chat-subtitle">
            {currentModel === 'openai' ? 'GPT-4' : 'Claude'} • Active
          </span>
        </div>

        <div className="chat-header-right">
          <select
            className="model-dropdown"
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            disabled={backendStatus !== 'connected'}
          >
            <option value="openai">GPT-4</option>
            <option value="anthropic">Claude</option>
          </select>

          <button className="header-btn">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Chat Content */}
      <div className="chat-content">
        {backendStatus !== 'connected' ? (
          <div className="connection-error">
            <AlertCircle size={48} />
            <h2>Unable to Connect</h2>
            <p>Please ensure the backend server is running</p>
            <div className="connection-instructions">
              <code>cd backend && python app.py</code>
            </div>
            <button onClick={retryConnection} className="btn-nothing">
              <RefreshCw size={18} />
              Retry Connection
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="dot-matrix-logo">
              <div className="dot-grid">
                {[...Array(25)].map((_, i) => (
                  <div
                    key={i}
                    className={`dot ${[6, 7, 8, 11, 13, 16, 17, 18].includes(i) ? 'active' : ''}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                ))}
              </div>
            </div>

            <h1 className="welcome-title">How can I assist you today?</h1>

            <div className="main-input-container">
              <button className="input-btn">
                <Paperclip size={18} />
              </button>

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

              <button className="input-btn">
                <Mic size={18} />
              </button>

              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`send-btn ${input.trim() ? 'active' : ''}`}
              >
                <Send size={18} />
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
                    <p>{msg.content}</p>
                    {msg.model && (
                      <div className="message-meta">
                        <span className="message-model">{msg.model}</span>
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
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
          <button className="input-btn">
            <Paperclip size={18} />
          </button>

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

          <button className="input-btn">
            <Mic size={18} />
          </button>

          <button
            onClick={handleSend}
            className={`send-btn ${input.trim() ? 'active' : ''}`}
            disabled={!input.trim() || loading}
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatPage;