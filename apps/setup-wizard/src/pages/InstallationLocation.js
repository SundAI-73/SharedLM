import React, { useState, useEffect } from 'react';
import { FolderOpen, HardDrive } from 'lucide-react';
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

  // Combined space requirements: SharedLM (725.6 MB) + Ollama (~500 MB) = ~1.2 GB
  const sharedlmSpaceMB = 725.6; // MB
  const ollamaSpaceMB = 500; // MB - approximate size for Ollama installation
  const requiredSpaceMB = sharedlmSpaceMB + ollamaSpaceMB; // Combined
  const requiredSpaceGB = (requiredSpaceMB / 1024).toFixed(1);
  const hasEnoughSpace = diskSpace.free >= (requiredSpaceMB / 1024);
  
  // Format free space display
  const freeSpaceGB = diskSpace.free > 0 ? diskSpace.free.toFixed(1) : '0.0';
  const displayMessage = isValidating 
    ? 'Checking disk space...'
    : diskSpace.free > 0
    ? `${freeSpaceGB} GB free space available. At least ${requiredSpaceGB} GB required.`
    : `At least ${requiredSpaceGB} GB required.`;

  return (
    <div className="location-page">
      <div className="location-logo">
        <img src={`${process.env.PUBLIC_URL || ''}/logo.svg`} alt="SharedLM" className="logo-image" onError={(e) => { console.error('Logo failed to load:', e.target.src); }} />
      </div>
      <div className="location-header">
        <h1 className="page-title">Select Destination Location</h1>
      </div>

      <div className="location-content">
        <p className="location-description">
          Setup will install SharedLM and Ollama into the following folder.
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
            placeholder=""
          />
          <button className="btn btn-secondary browse-btn" onClick={handleBrowse}>
            Browse
          </button>
        </div>

        <p className="location-instruction">
          To continue, click Next. If you would like to select a different location, click Browse.
        </p>
      </div>

      <div className="location-footer">
        <div className="location-disk-info">
          {isValidating ? (
            <div className="location-disk-summary">
              <HardDrive size={16} />
              <span>Checking disk space...</span>
            </div>
          ) : diskSpace.free > 0 ? (
            <div className={`location-disk-summary ${!hasEnoughSpace ? 'insufficient-space' : ''}`}>
              <HardDrive size={16} />
              <span>{diskSpace.free.toFixed(1)} GB free space available. At least {requiredSpaceGB} GB required.</span>
            </div>
          ) : (
            <div className="location-disk-summary">
              <HardDrive size={16} />
              <span>At least {requiredSpaceGB} GB required.</span>
            </div>
          )}
        </div>
        <div className="location-footer-buttons">
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
    </div>
  );
};

export default InstallationLocation;

