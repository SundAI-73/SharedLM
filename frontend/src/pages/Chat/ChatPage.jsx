// src/pages/Chat/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, Bot, User, Sparkles, Zap, Brain, Code } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api/index';
import './Chat.css';

function ChatPage({ backendStatus }) {
  const { userId, currentModel, setCurrentModel } = useUser();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState(['mistral', 'openai', 'anthropic']);
  const messagesEndRef = useRef(null);

  // Initialize with Mistral as default
  useEffect(() => {
    if (!currentModel || currentModel === 'openai') {
      setCurrentModel('mistral');
    }
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      const modelsData = await apiService.getModels();
      if (modelsData) {
        setAvailableModels(modelsData.available_models);
      }
    };
    if (backendStatus === 'connected') {
      fetchModels();
    } else {
      // Even if backend is not connected, show Mistral as available
      setAvailableModels(['mistral']);
      setCurrentModel('mistral');
    }
  }, [backendStatus]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Always allow sending with Mistral, even if backend isn't fully connected
      const modelToUse = currentModel || 'mistral';
      const response = await apiService.sendMessage(userId, userMessage.content, modelToUse);

      if (response) {
        const assistantMessage = {
          role: 'assistant',
          content: response.reply,
          model: response.used_model || modelToUse,
          memories: response.memories,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Provide a helpful response even on error
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize for the connection issue. Please check your settings or try again.',
        model: 'mistral',
        error: false,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { icon: <Brain size={16} />, text: "Explain a complex concept" },
    { icon: <Code size={16} />, text: "Help me write code" },
    { icon: <Sparkles size={16} />, text: "Creative writing ideas" },
    { icon: <Zap size={16} />, text: "Solve a problem" }
  ];

  const modelInfo = {
    mistral: { name: 'Mistral AI', icon: '⚡' },
    openai: { name: 'GPT-4', icon: '🧠' },
    anthropic: { name: 'Claude', icon: '🤖' }
  };

  return (
    <div className="page-container">
      <div className="page-content chat-page-content">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">CHAT INTERFACE</h1>
          <p className="page-subtitle">Converse with AI models</p>
        </div>

        {/* Model Selector */}
        <div className="model-selector-section">
          <div className="model-selector-grid">
            {Object.entries(modelInfo).map(([key, info]) => (
              <button
                key={key}
                className={`model-card ${currentModel === key ? 'active' : ''} ${!availableModels.includes(key) && key !== 'mistral' ? 'disabled' : ''}`}
                onClick={() => setCurrentModel(key)}
                disabled={!availableModels.includes(key) && key !== 'mistral'}
              >
                <div className="model-icon">{info.icon}</div>
                <div className="model-name">{info.name}</div>
                {currentModel === key && <div className="active-indicator"></div>}
                {key === 'mistral' && <div className="default-badge">DEFAULT</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Container */}
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="welcome-section">
              <div className="welcome-icon">
                <Bot size={48} strokeWidth={1} />
              </div>
              <h2 className="welcome-heading">START A CONVERSATION</h2>
              <p className="welcome-text">Choose a prompt or type your own message</p>
              
              {/* Quick Prompts */}
              <div className="quick-prompts-grid">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="quick-prompt-card"
                    onClick={() => setInput(prompt.text)}
                  >
                    <div className="prompt-icon">{prompt.icon}</div>
                    <span className="prompt-text">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-section">
              <div className="messages-list">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message-item ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                    </div>
                    <div className="message-bubble">
                      <div className="message-text">{msg.content}</div>
                      {msg.model && (
                        <div className="message-footer">
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
                  <div className="message-item assistant">
                    <div className="message-avatar">
                      <Bot size={20} />
                    </div>
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input Section */}
        <div className="input-section">
          <div className="input-container">
            <button className="input-action-btn">
              <Paperclip size={18} />
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder="Type your message here..."
              className="message-input"
              disabled={loading}
              autoFocus
            />
            
            <button className="input-action-btn">
              <Mic size={18} />
            </button>
            
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={`send-button ${input.trim() ? 'active' : ''}`}
            >
              <Send size={18} />
            </button>
          </div>
          
          {backendStatus !== 'connected' && currentModel !== 'mistral' && (
            <div className="connection-notice">
              <span>Running in offline mode with Mistral AI</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;