const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getDiskSpace: (path) => ipcRenderer.invoke('get-disk-space', path),
  
  // Installation
  selectInstallDirectory: () => ipcRenderer.invoke('select-install-directory'),
  installSharedLM: (installPath, selectedModels, modelData, modelsToRemove) => 
    ipcRenderer.invoke('install-sharedlm', installPath, selectedModels, modelData, modelsToRemove),
  
  // Ollama
  checkOllamaInstalled: () => ipcRenderer.invoke('check-ollama-installed'),
  downloadOllama: () => ipcRenderer.invoke('download-ollama'),
  getExistingOllamaModels: () => ipcRenderer.invoke('get-existing-ollama-models'),
  
  // Application launch
  launchApplication: (installPath) => ipcRenderer.invoke('launch-application', installPath),
  
  // Installation progress listener
  onInstallProgress: (callback) => {
    ipcRenderer.on('install-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('install-progress');
  },
  
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    onMaximize: (callback) => {
      ipcRenderer.on('window-maximized', callback);
      return () => ipcRenderer.removeListener('window-maximized', callback);
    },
    onUnmaximize: (callback) => {
      ipcRenderer.on('window-unmaximized', callback);
      return () => ipcRenderer.removeListener('window-unmaximized', callback);
    }
  }
});

