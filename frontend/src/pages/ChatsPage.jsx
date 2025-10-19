// src/pages/ChatsPage.jsx
import React, { useState } from 'react';
import { MessageSquare, Search, ChevronRight } from 'lucide-react';
import './style.css';

function ChatsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const chats = [
    { id: 1, title: 'Help with React components', llm: 'Claude', time: '10 minutes ago' },
    { id: 2, title: 'Python data analysis script', llm: 'ChatGPT', time: '2 hours ago' },
    { id: 3, title: 'Marketing copy ideas', llm: 'Claude', time: '1 day ago' },
    { id: 4, title: 'SQL query optimization', llm: 'Cursor', time: '2 days ago' },
    { id: 5, title: 'Business strategy discussion', llm: 'Gemini', time: '3 days ago' },
  ];

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.llm.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chats-page">
      <div className="page-container">
        <h1 className="page-title">Chat History</h1>
        <p className="page-subtitle">View all your conversations</p>

        {/* Search Bar */}
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="chats-list">
          {filteredChats.map(chat => (
            <button key={chat.id} className="chat-pill">
              <MessageSquare size={20} strokeWidth={1.5} />
              <div className="chat-info">
                <span className="chat-title">{chat.title}</span>
                <span className="chat-meta">
                  {chat.llm} · {chat.time}
                </span>
              </div>
              <ChevronRight size={18} className="arrow-icon" />
            </button>
          ))}
        </div>
      </div>

      <style>{`
        
      `}</style>
    </div>
  );
}

export default ChatsPage;