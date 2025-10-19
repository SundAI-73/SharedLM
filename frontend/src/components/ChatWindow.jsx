import React from 'react';
import { Send } from 'lucide-react';

function ChatWindow({ messages, input, setInput, handleSend }) {
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>New Chat</h2>
        <p>Chat with your connected AI assistants</p>
      </div>
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
        />
        <button 
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;