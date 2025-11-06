import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import './TitleBar.css';

function TitleBar() {
  // Only show if running in Electron
  if (!window.electron) return null;

  const handleMinimize = () => {
    window.electron.window.minimize();
  };

  const handleMaximize = () => {
    window.electron.window.maximize();
  };

  const handleClose = () => {
    window.electron.window.close();
  };

  return (
    <div className="electron-titlebar">
      <div className="titlebar-left">
        <div className="titlebar-logo">
          <div className="logo-dot"></div>
        </div>
        <span className="titlebar-title">SHARED LM</span>
      </div>
      
      <div className="titlebar-drag-region"></div>
      
      <div className="titlebar-controls">
        <button className="titlebar-btn minimize" onClick={handleMinimize} title="Minimize">
          <Minus size={14} />
        </button>
        <button className="titlebar-btn maximize" onClick={handleMaximize} title="Maximize">
          <Square size={12} />
        </button>
        <button className="titlebar-btn close" onClick={handleClose} title="Close">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default TitleBar;