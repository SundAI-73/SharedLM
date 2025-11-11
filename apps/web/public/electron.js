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
      preload: path.join(__dirname, 'preload.js'),
      devTools: true // Enable DevTools even in production for debugging
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
    autoHideMenuBar: true
  });

  // In packaged app, files are in resources/app.asar or resources/app
  // electron.js is at public/electron.js, so build is at ../build from there
  let startURL;
  if (isDev) {
    startURL = 'http://localhost:3000';
  } else {
    // Use path.resolve for absolute path, and normalize separators
    const indexPath = path.resolve(__dirname, '..', 'build', 'index.html');
    startURL = `file://${indexPath.replace(/\\/g, '/')}`;
  }

  console.log('=== Electron Debug Info ===');
  console.log('Loading URL:', startURL);
  console.log('__dirname:', __dirname);
  console.log('app.isPackaged:', app.isPackaged);
  console.log('app.getAppPath():', app.getAppPath());
  console.log('==========================');
  
  mainWindow.loadURL(startURL).catch(err => {
    console.error('Failed to load URL:', err);
  });

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });

  // Log any console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer console [${level}]:`, message);
  });

  // Log navigation errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorDescription, 'URL:', validatedURL);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools to see console output (temporarily for debugging)
    mainWindow.webContents.openDevTools({ mode: 'detach' });

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