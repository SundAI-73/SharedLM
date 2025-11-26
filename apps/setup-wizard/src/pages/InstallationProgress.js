import React, { useState, useEffect } from 'react';
import { XCircle, Play, Check, CheckCircle } from 'lucide-react';
import './InstallationProgress.css';

const InstallationProgress = ({ installPath, selectedModels, modelData, modelsToRemove, existingModels, onComplete, onBack }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Preparing installation...');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Installing SharedLM application...',
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
        if (data.progress < 50) setCurrentStep(0);
        else setCurrentStep(1);
      });

      const result = await window.electron.installSharedLM(installPath, selectedModels, modelData || [], modelsToRemove || []);
      
      if (result && result.success) {
        setIsComplete(true);
        setProgress(100);
        setStatus('Installation complete!');
        setCurrentStep(1);
        
        // User will click Launch button to proceed
        // Auto-advance removed - user controls when to proceed
      } else {
        const errorMsg = result?.error || 'Installation failed. Please try again.';
        setError(errorMsg);
        setStatus('Installation failed');
      }

      // Cleanup listener
      return () => {
        if (progressListener) progressListener();
      };
    } catch (err) {
      console.error('Installation error:', err);
      // Extract error message properly
      let errorMessage = 'Installation failed. Please try again.';
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.toString && err.toString() !== '[object Object]') {
          errorMessage = err.toString();
        } else {
          // Try to extract from error object
          try {
            errorMessage = JSON.stringify(err);
          } catch {
            errorMessage = 'Installation failed. Check console for details.';
          }
        }
      }
      setError(errorMessage);
      setStatus('Installation failed');
    }
  };

  const simulateInstallation = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);
      
      if (currentProgress < 50) {
        setStatus('Installing SharedLM application...');
        setCurrentStep(0);
      } else if (currentProgress < 100) {
        setStatus('Finalizing setup...');
        setCurrentStep(1);
      } else {
        clearInterval(interval);
        setIsComplete(true);
        setStatus('Installation complete!');
        // User will click Launch button to proceed
        // Auto-advance removed - user controls when to proceed
      }
    }, 50);
  };

  const handleLaunch = async () => {
    try {
      if (!window.electron?.launchApplication) {
        setError('Launch function not available. Please check the console for details.');
        return;
      }

      // Show loading state
      setStatus('Launching application...');
      
      const result = await window.electron.launchApplication(installPath);
      
      if (result && !result.success) {
        const errorMsg = result.error || 'Unknown error';
        setError(`Failed to launch application: ${errorMsg}\n\nPlease check:\n1. Application was installed correctly\n2. File exists at: ${installPath}\\SharedLM\\SharedLM.exe\n3. Check console for more details`);
        console.error('Launch failed:', result);
        setStatus('Launch failed');
        return; // Don't close if launch failed
      }
      
      // Wait a moment to ensure the app starts before closing
      setStatus('Application launching...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Close the installer only if launch succeeded
      if (window.electron?.window?.close) {
        window.electron.window.close();
      } else {
        // Fallback for development
        window.close();
      }
    } catch (error) {
      console.error('Error launching application:', error);
      setError(`Failed to launch application: ${error.message || 'Unknown error'}\n\nPlease check the installation path and try again.`);
      setStatus('Launch failed');
      return; // Don't close if there was an error
    }
  };

  return (
    <div className="progress-page">
      <div className="progress-header">
        <h1 className="page-title">Installation Progress</h1>
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
              <div className="progress-logo-container">
                <img 
                  src={`${process.env.PUBLIC_URL || ''}/logo.svg`} 
                  alt="SharedLM" 
                  className={`progress-logo-image ${isComplete ? 'complete' : 'loading'}`}
                  onError={(e) => { console.error('Logo failed to load:', e.target.src); }} 
                />
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
                        <Check size={16} />
                      ) : index === currentStep ? (
                        <div className="step-spinner" />
                      ) : (
                        <div className="step-dot" />
                      )}
                    </div>
                    <span className="step-label">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {isComplete && (
              <div className="installation-details-section">
                <div className="installation-details">
                  <div className="detail-item">
                    <span className="detail-label">Installation Path:</span>
                    <span className="detail-value">{installPath}</span>
                  </div>
                  {(selectedModels.length > 0 || (existingModels && existingModels.length > 0)) && (
                    <div className="detail-item">
                      <span className="detail-label">Models Available:</span>
                      <span className="detail-value">
                        {selectedModels.length + (existingModels?.filter(m => !modelsToRemove?.includes(m)).length || 0)} model(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(selectedModels.length > 0 || (existingModels && existingModels.length > 0)) && (
              <div className="models-queue-info">
                <p className="queue-title">Models available:</p>
                {selectedModels.length > 0 && (
                  <>
                    <p className="queue-subtitle">New models:</p>
                    <ul className="models-queue-list">
                      {selectedModels.map((modelId, index) => {
                        const model = modelData?.find(m => m.id === modelId);
                        const modelName = model?.name || modelId;
                        const modelParams = model?.parameters ? ` (${model.parameters})` : '';
                        return (
                          <li key={index}>
                            {modelName}{modelParams}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
                {existingModels && existingModels.length > 0 && (
                  <>
                    <p className="queue-subtitle">Existing models (already on your system):</p>
                    <ul className="models-queue-list existing">
                      {existingModels
                        .filter(modelName => !modelsToRemove?.includes(modelName))
                        .map((modelName, index) => (
                          <li key={`existing-${index}`}>
                            {modelName} <span className="existing-badge">(Installed)</span>
                          </li>
                        ))}
                    </ul>
                  </>
                )}
                <p className="queue-note">
                  {isComplete 
                    ? 'All models are ready to use. You can start using the application now.'
                    : 'Models are downloading in the background. Existing models are available immediately. You can start using the application while new models download.'}
                </p>
              </div>
            )}

          </>
        )}
      </div>

      <div className="progress-footer">
        {!isComplete && !error ? (
          <button className="btn btn-secondary" onClick={onBack} disabled>
            Back
          </button>
        ) : isComplete ? (
          <button className="btn btn-primary" onClick={handleLaunch}>
            <Play size={18} style={{ marginRight: '8px' }} />
            Launch Application
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default InstallationProgress;

