const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
  
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    onMaximize: (callback) => {
      ipcRenderer.on('window-maximized', callback);
      return () => ipcRenderer.removeListener('window-maximized', callback);
    },
    onUnmaximize: (callback) => {
      ipcRenderer.on('window-unmaximized', callback);
      return () => ipcRenderer.removeListener('window-unmaximized', callback);
    }
  },
  
  // Storage APIs
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
    clear: () => ipcRenderer.invoke('store-clear')
  }
});