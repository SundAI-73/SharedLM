import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import LinkLLMPage from './pages/LinkLLMPage';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import ProjectsPage from './pages/ProjectsPage';
import ChatsPage from './pages/ChatsPage';
import './App.css';

function App() {
  const [connectedLLMs, setConnectedLLMs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/link-llm" element={
              <LinkLLMPage 
                connectedLLMs={connectedLLMs}
                setSelectedLLM={setSelectedLLM}
              />
            } />
            <Route path="/auth" element={
              <AuthPage 
                selectedLLM={selectedLLM}
                setConnectedLLMs={setConnectedLLMs}
                connectedLLMs={connectedLLMs}
              />
            } />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/chats" element={<ChatsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;