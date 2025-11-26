const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

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
// Check environment variable first (set by setup wizard when launching installed app)
const isDev = process.env.ELECTRON_IS_DEV !== '0' && !app.isPackaged;

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
      devTools: isDev // Only enable DevTools in development mode
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
    autoHideMenuBar: true
  });

  // In packaged app, files are in resources/app.asar or resources/app
  // electron.js is at public/electron.js, so build is at ../build from there
  // In installed directory, electron.js and index.html are in the same directory
  let startURL;
  if (isDev) {
    startURL = 'http://localhost:3000';
  } else {
    // Check if index.html is in the same directory (installed) or in ../build (packaged)
    const indexPathSameDir = path.resolve(__dirname, 'index.html');
    const indexPathBuild = path.resolve(__dirname, '..', 'build', 'index.html');
    
    // Use synchronous file access instead of async
    const fsSync = require('fs');
    let indexPath;
    if (fsSync.existsSync(indexPathSameDir)) {
      indexPath = indexPathSameDir;
      if (isDev) console.log('Using installed directory structure (index.html in same dir)');
    } else {
      indexPath = indexPathBuild;
      if (isDev) console.log('Using packaged directory structure (index.html in ../build)');
    }
    
    startURL = `file://${indexPath.replace(/\\/g, '/')}`;
  }

  // Only log debug info in development
  if (isDev) {
    console.log('=== Electron Debug Info ===');
    console.log('Loading URL:', startURL);
    console.log('__dirname:', __dirname);
    console.log('app.isPackaged:', app.isPackaged);
    console.log('app.getAppPath():', app.getAppPath());
    console.log('==========================');
  }
  
  mainWindow.loadURL(startURL).catch(err => {
    if (isDev) console.error('Failed to load URL:', err);
  });

  // Only log in development
  if (isDev) {
    // Log when page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page finished loading');
    });

    // Log any console messages from renderer
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`Renderer console [${level}]:`, message);
    });
  }

  // Log navigation errors (only in development)
  if (isDev) {
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load:', errorDescription, 'URL:', validatedURL);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Only open DevTools in development mode
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

  // Handler to read installation config file
  ipcMain.handle('read-install-config', async (event, installPath) => {
    try {
      if (!installPath) {
        // Try to get install path from store
        const storeInstance = await initializeStore();
        installPath = storeInstance.get('install_path');
      }
      
      if (!installPath) {
        return null;
      }
      
      const configPath = path.join(installPath, 'config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to read install config:', error);
      return null;
    }
  });
}