import React, { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import './InstallationLocation.css';

const InstallationLocation = ({ installPath, onPathChange, onNext, onBack }) => {
  const [localPath, setLocalPath] = useState(installPath || '');
  const [diskSpace, setDiskSpace] = useState({ free: 0, total: 0 });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!localPath) {
      // Set default path based on platform
      let defaultPath = '';
      if (window.electron?.platform === 'win32') {
        defaultPath = 'C:\\Program Files\\SharedLM';
      } else if (window.electron?.platform === 'darwin') {
        defaultPath = '/Applications/SharedLM';
      } else {
        defaultPath = '/opt/sharedlm';
      }
      setLocalPath(defaultPath);
      onPathChange(defaultPath);
    }
  }, []);

  useEffect(() => {
    if (localPath) {
      checkDiskSpace();
    }
  }, [localPath]);

  const checkDiskSpace = async () => {
    if (window.electron?.getDiskSpace) {
      setIsValidating(true);
      try {
        const space = await window.electron.getDiskSpace(localPath);
        setDiskSpace(space);
      } catch (error) {
        console.error('Error checking disk space:', error);
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleBrowse = async () => {
    if (window.electron?.selectInstallDirectory) {
      try {
        const selectedPath = await window.electron.selectInstallDirectory();
        if (selectedPath) {
          setLocalPath(selectedPath);
          onPathChange(selectedPath);
        }
      } catch (error) {
        console.error('Error selecting directory:', error);
      }
    }
  };

  const requiredSpace = 2; // GB for SharedLM + Ollama
  const hasEnoughSpace = diskSpace.free >= requiredSpace;

  return (
    <div className="location-page">
      <div className="location-header">
        <h1 className="page-title">Installation Location</h1>
        <div className="step-indicator">Step 2 of 4</div>
      </div>

      <div className="location-content">
        <p className="location-description">
          Choose the installation directory for SharedLM and Ollama.
        </p>

        <div className="path-input-group">
          <input
            type="text"
            className="input path-input"
            value={localPath}
            onChange={(e) => {
              setLocalPath(e.target.value);
              onPathChange(e.target.value);
            }}
            placeholder="Select installation directory..."
          />
          <button className="btn btn-secondary browse-btn" onClick={handleBrowse}>
            <FolderOpen size={18} />
            Browse
          </button>
        </div>

        {isValidating ? (
          <div className="validation-status">
            <span className="status-text">Validating disk space...</span>
          </div>
        ) : diskSpace.free > 0 ? (
          <div className="disk-info">
            <div className="disk-space">
              <span className="disk-label">Available space:</span>
              <span className={`disk-value ${hasEnoughSpace ? 'valid' : 'invalid'}`}>
                {diskSpace.free.toFixed(1)} GB free
              </span>
            </div>
            {!hasEnoughSpace && (
              <div className="disk-warning">
                ⚠️ Insufficient disk space. At least {requiredSpace} GB required.
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="location-footer">
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!localPath || !hasEnoughSpace}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default InstallationLocation;

