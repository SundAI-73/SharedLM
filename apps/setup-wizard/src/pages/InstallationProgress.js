import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import './InstallationProgress.css';

const InstallationProgress = ({ installPath, selectedModels, onComplete, onBack }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Preparing installation...');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Installing SharedLM application...',
    'Installing Ollama runtime...',
    'Configuring installation...',
    'Finalizing setup...'
  ];

  useEffect(() => {
    startInstallation();
  }, []);

  const startInstallation = async () => {
    try {
      if (!window.electron?.installSharedLM) {
        // Fallback simulation for development
        simulateInstallation();
        return;
      }

      const progressListener = window.electron.onInstallProgress((data) => {
        setProgress(data.progress);
        setStatus(data.status);
        
        // Update current step based on progress
        if (data.progress < 25) setCurrentStep(0);
        else if (data.progress < 50) setCurrentStep(1);
        else if (data.progress < 75) setCurrentStep(2);
        else setCurrentStep(3);
      });

      const result = await window.electron.installSharedLM(installPath, selectedModels);
      
      if (result.success) {
        setIsComplete(true);
        setProgress(100);
        setStatus('Installation complete!');
        setCurrentStep(3);
        
        // Auto-advance after 2 seconds
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError('Installation failed. Please try again.');
      }

      // Cleanup listener
      return () => {
        if (progressListener) progressListener();
      };
    } catch (err) {
      console.error('Installation error:', err);
      setError(err.message || 'Installation failed. Please try again.');
    }
  };

  const simulateInstallation = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);
      
      if (currentProgress < 30) {
        setStatus('Installing SharedLM application...');
        setCurrentStep(0);
      } else if (currentProgress < 60) {
        setStatus('Installing Ollama runtime...');
        setCurrentStep(1);
      } else if (currentProgress < 85) {
        setStatus('Configuring installation...');
        setCurrentStep(2);
      } else if (currentProgress < 100) {
        setStatus('Finalizing setup...');
        setCurrentStep(3);
      } else {
        clearInterval(interval);
        setIsComplete(true);
        setStatus('Installation complete!');
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    }, 50);
  };

  return (
    <div className="progress-page">
      <div className="progress-header">
        <h1 className="page-title">Installation Progress</h1>
        <div className="step-indicator">Step 4 of 4</div>
      </div>

      <div className="progress-content">
        {error ? (
          <div className="error-state">
            <XCircle size={48} className="error-icon" />
            <h3>Installation Failed</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry Installation
            </button>
          </div>
        ) : (
          <>
            <div className="progress-visual">
              <div className="progress-circle">
                {isComplete ? (
                  <CheckCircle size={64} className="success-icon" />
                ) : (
                  <Loader size={64} className="loading-icon" />
                )}
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="progress-text">{progress}%</div>
              </div>
            </div>

            <div className="status-section">
              <p className="status-text">{status}</p>
              
              <div className="steps-list">
                {steps.map((step, index) => (
                  <div 
                    key={index}
                    className={`step-item ${index < currentStep ? 'completed' : index === currentStep ? 'active' : 'pending'}`}
                  >
                    <div className="step-indicator-icon">
                      {index < currentStep ? (
                        <CheckCircle size={16} />
                      ) : index === currentStep ? (
                        <Loader size={16} className="spinning" />
                      ) : (
                        <div className="step-dot" />
                      )}
                    </div>
                    <span className="step-label">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedModels.length > 0 && (
              <div className="models-queue-info">
                <p className="queue-title">Models queued for background download:</p>
                <ul className="models-queue-list">
                  {selectedModels.map((modelId, index) => (
                    <li key={index}>{modelId}</li>
                  ))}
                </ul>
                <p className="queue-note">
                  Models will download automatically after you launch SharedLM.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {!isComplete && !error && (
        <div className="progress-footer">
          <button className="btn btn-secondary" onClick={onBack} disabled>
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default InstallationProgress;

