import React, { useState } from 'react';
import { CheckCircle, Play, ExternalLink } from 'lucide-react';
import './Completion.css';

const Completion = ({ installPath, selectedModels }) => {
  const [launchApp, setLaunchApp] = useState(true);

  const handleFinish = () => {
    if (launchApp && window.electron) {
      // Launch the installed application
      // In production, this would spawn the installed SharedLM executable
      // For now, we'll just close the installer
      console.log('Would launch SharedLM from:', installPath);
    }
    
    // Close the installer
    if (window.electron?.window?.close) {
      window.electron.window.close();
    } else {
      // Fallback for development
      window.close();
    }
  };

  return (
    <div className="completion-page">
      <div className="completion-content">
        <div className="completion-icon">
          <CheckCircle size={80} className="success-icon" />
        </div>
        
        <h1 className="completion-title">Installation Complete!</h1>
        
        <p className="completion-message">
          SharedLM has been successfully installed on your system.
        </p>

        <div className="installation-details">
          <div className="detail-item">
            <span className="detail-label">Installation Path:</span>
            <span className="detail-value">{installPath}</span>
          </div>
          
          {selectedModels.length > 0 && (
            <div className="detail-item">
              <span className="detail-label">Models Selected:</span>
              <span className="detail-value">{selectedModels.length} model(s)</span>
            </div>
          )}
        </div>

        {selectedModels.length > 0 && (
          <div className="background-download-info">
            <h3 className="download-title">Background Download</h3>
            <p className="download-description">
              The following models are queued for download and will be available automatically:
            </p>
            <ul className="download-models-list">
              {selectedModels.map((modelId, index) => (
                <li key={index}>
                  <span className="model-name">{modelId}</span>
                  <span className="download-status">Queued</span>
                </li>
              ))}
            </ul>
            <p className="download-note">
              Models will download in the background when you launch SharedLM. 
              You can start using the application immediately.
            </p>
          </div>
        )}

        <div className="launch-options">
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={launchApp}
              onChange={(e) => setLaunchApp(e.target.checked)}
            />
            <span>Launch SharedLM now</span>
          </label>
        </div>
      </div>

      <div className="completion-footer">
        <button className="btn btn-primary finish-btn" onClick={handleFinish}>
          <Play size={18} />
          Finish
        </button>
      </div>
    </div>
  );
};

export default Completion;

