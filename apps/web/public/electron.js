const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Use dynamic import for electron-store to handle both ESM and CommonJS
let Store;
let store;

async function initializeStore() {
  if (!store) {
    try {
      // Try dynamic import (works with ESM versions)
      const storeModule = await import('electron-store');
      Store = storeModule.default || storeModule;
      store = new Store();
    } catch (error) {
      // Fallback to require (works with CommonJS versions)
      try {
        Store = require('electron-store');
        store = new Store();
      } catch (requireError) {
        console.error('Failed to load electron-store:', requireError);
        // Create a mock store if electron-store fails
        store = {
          get: () => undefined,
          set: () => true,
          delete: () => true,
          clear: () => true
        };
      }
    }
  }
  return store;
}

let mainWindow;

// Determine if running in development mode
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
    autoHideMenuBar: true
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Send initial window state after window is ready
    if (mainWindow.isMaximized()) {
      mainWindow.webContents.send('window-maximized');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Window controls for custom titlebar
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Send window state changes to renderer
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized');
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-unmaximized');
    }
  });
}

// Initialize store and create window
app.whenReady().then(async () => {
  await initializeStore();
  setupStorageHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Storage handlers - ensure store is initialized before use
function setupStorageHandlers() {
  ipcMain.handle('store-get', async (event, key) => {
    const storeInstance = await initializeStore();
    return storeInstance.get(key);
  });

  ipcMain.handle('store-set', async (event, key, value) => {
    const storeInstance = await initializeStore();
    storeInstance.set(key, value);
    return true;
  });

  ipcMain.handle('store-delete', async (event, key) => {
    const storeInstance = await initializeStore();
    storeInstance.delete(key);
    return true;
  });

  ipcMain.handle('store-clear', async () => {
    const storeInstance = await initializeStore();
    storeInstance.clear();
    return true;
  });
}