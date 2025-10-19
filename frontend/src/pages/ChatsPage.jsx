import React from 'react';
import { MessageSquare, ChevronRight } from 'lucide-react';

function ChatsPage() {
  const chats = [
    { id: 1, title: 'Help with React components', llm: 'Claude', time: '10 minutes ago' },
    { id: 2, title: 'Python data analysis script', llm: 'ChatGPT', time: '2 hours ago' },
    { id: 3, title: 'Marketing copy ideas', llm: 'Claude', time: '1 day ago' },
    { id: 4, title: 'SQL query optimization', llm: 'Cursor', time: '2 days ago' },
    { id: 5, title: 'Business strategy discussion', llm: 'Gemini', time: '3 days ago' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Chat History</h1>
        <p>View all your conversations across connected LLMs</p>
      </div>

      <div>
        {chats.map(chat => (
          <div key={chat.id} className="chat-history-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <MessageSquare size={24} color="#764ba2" />
                <div>
                  <h3 style={{ color: '#333', marginBottom: '0.25rem' }}>{chat.title}</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>
                    {chat.llm} · {chat.time}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} color="#999" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatsPage;