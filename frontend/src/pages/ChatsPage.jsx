// src/pages/ChatsPage.jsx
import React, { useState } from 'react';
import { MessageSquare, Search, ChevronRight } from 'lucide-react';

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

      <style jsx>{`
        .chats-page {
          min-height: 100vh;
          background: #000000;
          padding: 3rem 2rem;
        }

        .page-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 300;
          color: white;
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          margin-bottom: 2rem;
          font-size: 1rem;
        }

        .search-container {
          position: relative;
          max-width: 500px;
          margin: 0 auto 2rem;
        }

        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
        }

        .search-input {
          width: 100%;
          padding: 0.875rem 1.25rem 0.875rem 3rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 50px;
          color: white;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .search-input:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .chats-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .chat-pill {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: transparent;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          text-align: left;
        }

        .chat-pill:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .chat-pill svg {
          color: rgba(255, 255, 255, 0.7);
          flex-shrink: 0;
        }

        .chat-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .chat-title {
          color: white;
          font-size: 1rem;
          font-weight: 500;
        }

        .chat-meta {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .arrow-icon {
          color: rgba(255, 255, 255, 0.3);
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}

export default ChatsPage;