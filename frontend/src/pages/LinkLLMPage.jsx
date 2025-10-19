import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Brain, Zap, Sparkles, Search, Cloud } from 'lucide-react';
import LLMCard from '../components/LLMCard';

function LinkLLMPage({ connectedLLMs, setSelectedLLM }) {
  const navigate = useNavigate();

  const llms = [
    { 
      id: 'claude', 
      name: 'Claude', 
      icon: <Bot size={40} />, 
      color: '#FF6B35', 
      description: 'Anthropic AI assistant' 
    },
    { 
      id: 'chatgpt', 
      name: 'ChatGPT', 
      icon: <Brain size={40} />, 
      color: '#10A37F', 
      description: 'OpenAI language model' 
    },
    { 
      id: 'cursor', 
      name: 'Cursor', 
      icon: <Zap size={40} />, 
      color: '#5436DA', 
      description: 'AI-powered code editor' 
    },
    { 
      id: 'gemini', 
      name: 'Gemini', 
      icon: <Sparkles size={40} />, 
      color: '#8E75FF', 
      description: 'Google AI model' 
    },
    { 
      id: 'perplexity', 
      name: 'Perplexity', 
      icon: <Search size={40} />, 
      color: '#20B2AA', 
      description: 'AI-powered search' 
    },
    { 
      id: 'mistral', 
      name: 'Mistral', 
      icon: <Cloud size={40} />, 
      color: '#FF4444', 
      description: 'Open-source LLM' 
    },
  ];

  const handleLLMClick = (llm) => {
    if (!connectedLLMs.includes(llm.id)) {
      setSelectedLLM(llm);
      navigate('/auth');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Link your LLM</h1>
        <p>Connect your favorite AI assistants and manage them in one place</p>
        {connectedLLMs.length > 0 && (
          <p style={{ marginTop: '1rem', color: '#4caf50' }}>
            ✓ Connected: {connectedLLMs.length} LLM(s)
          </p>
        )}
      </div>

      <div className="llm-grid">
        {llms.map(llm => (
          <LLMCard
            key={llm.id}
            llm={llm}
            isConnected={connectedLLMs.includes(llm.id)}
            onClick={() => handleLLMClick(llm)}
          />
        ))}
      </div>
    </div>
  );
}

export default LinkLLMPage;