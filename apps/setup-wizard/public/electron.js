const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec, spawn } = require('child_process');
const os = require('os');
const util = require('util');
const execAsync = util.promisify(exec);

const isDev = !app.isPackaged;
let mainWindow;

// System information cache
let systemInfo = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev
    },
    icon: path.join(__dirname, 'icon.png'),
    frame: false,
    show: false,
    autoHideMenuBar: true,
    resizable: true
  });

  let startURL;
  if (isDev) {
    startURL = 'http://localhost:3000';
  } else {
    const indexPath = path.resolve(__dirname, '..', 'build', 'index.html');
    startURL = `file://${indexPath.replace(/\\/g, '/')}`;
  }

  mainWindow.loadURL(startURL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up window state listeners
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

// Get system hardware information
async function getSystemInfo() {
  if (systemInfo) return systemInfo;

  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    const platform = os.platform();
    
    let gpuInfo = null;
    try {
      if (platform === 'win32') {
        const { stdout } = await execAsync('wmic path win32_VideoController get name');
        const gpuLines = stdout.split('\n').filter(line => line.trim() && !line.includes('Name'));
        gpuInfo = gpuLines.map(line => line.trim()).filter(Boolean);
      } else if (platform === 'darwin') {
        const { stdout } = await execAsync('system_profiler SPDisplaysDataType');
        gpuInfo = stdout.includes('Chipset Model') ? ['Apple GPU'] : ['Unknown'];
      } else {
        const { stdout } = await execAsync('lspci | grep -i vga');
        gpuInfo = stdout.split('\n').filter(Boolean).map(line => line.trim());
      }
    } catch (e) {
      gpuInfo = ['Unknown'];
    }

    systemInfo = {
      ram: {
        total: Math.round(totalMem / (1024 * 1024 * 1024)), // GB
        free: Math.round(freeMem / (1024 * 1024 * 1024)), // GB
        used: Math.round((totalMem - freeMem) / (1024 * 1024 * 1024)) // GB
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0
      },
      gpu: gpuInfo,
      platform: platform,
      arch: os.arch()
    };

    return systemInfo;
  } catch (error) {
    console.error('Error getting system info:', error);
    return {
      ram: { total: 8, free: 4, used: 4 },
      cpu: { cores: 4, model: 'Unknown', speed: 0 },
      gpu: ['Unknown'],
      platform: os.platform(),
      arch: os.arch()
    };
  }
}

// Get available disk space
async function getDiskSpace(installPath) {
  try {
    if (os.platform() === 'win32') {
      const drive = installPath.substring(0, 2);
      const { stdout } = await execAsync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace,Size`);
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('FreeSpace'));
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        const freeBytes = parseInt(parts[0]);
        const totalBytes = parseInt(parts[1]);
        return {
          free: freeBytes ? freeBytes / (1024 * 1024 * 1024) : 0, // GB
          total: totalBytes ? totalBytes / (1024 * 1024 * 1024) : 0 // GB
        };
      }
    } else if (os.platform() === 'darwin') {
      const { stdout } = await execAsync(`df -g "${installPath}" | tail -1 | awk '{print $4,$2}'`);
      const parts = stdout.trim().split(/\s+/);
      return {
        free: parseInt(parts[0]) || 0,
        total: parseInt(parts[1]) || 0
      };
    } else {
      const { stdout } = await execAsync(`df -BG "${installPath}" | tail -1 | awk '{print $4,$2}'`);
      const parts = stdout.trim().split(/\s+/);
      return {
        free: parseInt(parts[0]) || 0,
        total: parseInt(parts[1]) || 0
      };
    }
  } catch (error) {
    console.error('Error getting disk space:', error);
  }
  return { free: 0, total: 0 };
}

// IPC Handlers
ipcMain.handle('get-system-info', async () => {
  return await getSystemInfo();
});

ipcMain.handle('get-disk-space', async (event, installPath) => {
  return await getDiskSpace(installPath);
});

ipcMain.handle('select-install-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: path.join(os.homedir(), 'AppData', 'Local', 'SharedLM')
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('install-sharedlm', async (event, installPath, selectedModels) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure install directory exists
      await fs.mkdir(installPath, { recursive: true });
      
      let progress = 0;
      
      // Step 1: Install SharedLM (copy application files)
      const updateProgress = (step, message) => {
        event.sender.send('install-progress', {
          progress: step,
          status: message
        });
      };
      
      updateProgress(10, 'Preparing installation directory...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(20, 'Installing SharedLM application...');
      // In production, copy the built SharedLM app to installPath
      // For now, create a placeholder
      const appDir = path.join(installPath, 'SharedLM');
      await fs.mkdir(appDir, { recursive: true });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateProgress(40, 'Checking Ollama installation...');
      const ollamaInstalled = await checkOllamaInstalled();
      
      if (!ollamaInstalled) {
        updateProgress(50, 'Downloading Ollama...');
        // Download and install Ollama based on platform
        await downloadOllama();
        updateProgress(70, 'Installing Ollama...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        updateProgress(60, 'Ollama already installed, skipping...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      updateProgress(80, 'Configuring installation...');
      // Create configuration file with selected models
      const configPath = path.join(installPath, 'config.json');
      const config = {
        installPath,
        models: selectedModels,
        installedAt: new Date().toISOString()
      };
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(90, 'Finalizing installation...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(100, 'Installation complete!');
      
      resolve({
        success: true,
        installPath,
        modelsQueued: selectedModels
      });
    } catch (error) {
      console.error('Installation error:', error);
      reject({
        success: false,
        error: error.message
      });
    }
  });
});

async function checkOllamaInstalled() {
  try {
    await execAsync('ollama --version');
    return true;
  } catch {
    return false;
  }
}

ipcMain.handle('check-ollama-installed', async () => {
  return await checkOllamaInstalled();
});

async function downloadOllama() {
  // In production, download and install Ollama based on platform
  // For Windows: Download from https://ollama.com/download/windows
  // For macOS: Download from https://ollama.com/download/mac
  // For Linux: curl -fsSL https://ollama.com/install.sh | sh
  
  const platform = os.platform();
  console.log(`Downloading Ollama for ${platform}...`);
  
  // Placeholder - actual implementation would:
  // 1. Download Ollama installer
  // 2. Run installer silently
  // 3. Verify installation
  
  return { success: true };
}

ipcMain.handle('download-ollama', async (event) => {
  return await downloadOllama();
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

