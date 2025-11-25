import React, { useState, useEffect } from 'react';
import './TitleBar.css';

function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const electronAvailable = window.electron?.isElectron || false;
    setIsElectron(electronAvailable);

    if (!electronAvailable) {
      return;
    }

    // Get initial maximize state
    const checkMaximized = async () => {
      if (window.electron?.window?.isMaximized) {
        try {
          const maximized = await window.electron.window.isMaximized();
          setIsMaximized(maximized);
        } catch (error) {
          console.error('Error checking window state:', error);
        }
      }
    };

    checkMaximized();

    // Listen for window state changes
    let cleanupMaximize, cleanupUnmaximize;
    if (window.electron?.window?.onMaximize && window.electron?.window?.onUnmaximize) {
      cleanupMaximize = window.electron.window.onMaximize(() => {
        setIsMaximized(true);
      });
      cleanupUnmaximize = window.electron.window.onUnmaximize(() => {
        setIsMaximized(false);
      });
    }

    return () => {
      if (cleanupMaximize) cleanupMaximize();
      if (cleanupUnmaximize) cleanupUnmaximize();
    };
  }, []);

  const handleMinimize = () => {
    if (window.electron?.window?.minimize) {
      window.electron.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electron?.window?.maximize) {
      window.electron.window.maximize();
    }
  };

  const handleClose = () => {
    if (window.electron?.window?.close) {
      window.electron.window.close();
    }
  };

  if (!isElectron) {
    return null;
  }

  return (
    <div className="setup-titlebar">
      {/* Left side - Logo and Title */}
      <div className="titlebar-left">
        <div className="titlebar-logo">
          <div className="logo-dot"></div>
        </div>
        <span className="titlebar-title">SharedLM Setup</span>
      </div>
      
      {/* Middle - Draggable region */}
      <div className="titlebar-drag-region"></div>
      
      {/* Right side - Window controls */}
      <div className="titlebar-controls">
        <button 
          className="titlebar-btn close-btn" 
          onClick={handleClose} 
          title="Close"
          aria-label="Close"
        >
          <span className="btn-inner"></span>
        </button>
        <button 
          className="titlebar-btn minimize-btn" 
          onClick={handleMinimize} 
          title="Minimize"
          aria-label="Minimize"
        >
          <span className="btn-inner"></span>
        </button>
        <button 
          className="titlebar-btn maximize-btn" 
          onClick={handleMaximize} 
          title={isMaximized ? "Restore" : "Maximize"}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          <span className="btn-inner"></span>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;

