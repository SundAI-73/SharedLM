import React, { useState } from 'react';
import { MessageSquare, Search, ChevronRight, Clock } from 'lucide-react';

function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const chats = [
    { id: 1, title: 'React component optimization', model: 'Claude', time: '10 min ago', messages: 23 },
    { id: 2, title: 'Python data analysis script', model: 'GPT-4', time: '2 hours ago', messages: 15 },
    { id: 3, title: 'Marketing copy ideas', model: 'Claude', time: '1 day ago', messages: 8 },
    { id: 4, title: 'SQL query optimization', model: 'Cursor', time: '2 days ago', messages: 12 },
    { id: 5, title: 'Business strategy discussion', model: 'Gemini', time: '3 days ago', messages: 45 },
  ];

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">CHAT HISTORY</h1>
        <p className="page-subtitle">View all your conversations</p>
      </div>

      <div style={{
        position: 'relative',
        maxWidth: '600px',
        margin: '0 auto var(--spacing-xl)'
      }}>
        <Search size={18} style={{
          position: 'absolute',
          left: 'var(--spacing-md)',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--n-gray)'
        }} />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-nothing"
          style={{
            width: '100%',
            paddingLeft: 'calc(var(--spacing-md) + 24px)',
            paddingRight: 'var(--spacing-md)',
            paddingTop: 'var(--spacing-md)',
            paddingBottom: 'var(--spacing-md)',
            border: '1px solid var(--n-medium-gray)',
            borderRadius: 'var(--button-radius)',
            borderBottom: '1px solid var(--n-medium-gray)'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {filteredChats.map(chat => (
          <button
            key={chat.id}
            className="card-nothing"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-lg)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all var(--transition-fast)'
            }}
          >
            <MessageSquare size={20} style={{ color: 'var(--n-gray)', flexShrink: 0 }} />
            
            <div style={{ flex: 1 }}>
              <h3 className="text-body" style={{ fontWeight: 400 }}>{chat.title}</h3>
              <div style={{ 
                display: 'flex', 
                gap: 'var(--spacing-md)', 
                marginTop: 'var(--spacing-xs)' 
              }}>
                <span className="text-caption text-uppercase" style={{ color: 'var(--n-gray)' }}>
                  {chat.model}
                </span>
                <span className="text-caption" style={{ color: 'var(--n-gray)' }}>
                  {chat.messages} messages
                </span>
                <span className="text-caption" style={{ color: 'var(--n-gray)' }}>
                  <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                  {chat.time}
                </span>
              </div>
            </div>
            
            <ChevronRight size={18} style={{ color: 'var(--n-gray)' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default HistoryPage;