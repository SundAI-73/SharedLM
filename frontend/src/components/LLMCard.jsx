import React from 'react';

function LLMCard({ llm, isConnected, onClick }) {
  return (
    <div 
      className={`llm-card ${isConnected ? 'connected' : ''}`}
      onClick={onClick}
      style={{ '--llm-color': llm.color }}
    >
      <div className="llm-icon" style={{ color: llm.color }}>
        {llm.icon}
      </div>
      <h3>{llm.name}</h3>
      <p>{llm.description}</p>
      <div className="llm-status">
        {isConnected ? '✓ Connected' : 'Click to connect'}
      </div>
    </div>
  );
}

export default LLMCard;