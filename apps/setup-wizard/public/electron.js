const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec, spawn } = require('child_process');
const os = require('os');
const util = require('util');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const execAsync = util.promisify(exec);

// Helper function to recursively copy directories
async function copyDirectory(source, destination) {
  // Verify source path doesn't point to asar
  if (source.includes('.asar')) {
    throw new Error(`Cannot copy from asar file: ${source}`);
  }
  
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.resolve(source, entry.name); // Use resolve for absolute path
    const destPath = path.join(destination, entry.name);
    
    // Skip if source path points to asar
    if (sourcePath.includes('.asar')) {
      console.warn(`⚠️ Skipping entry that points to asar: ${entry.name}`);
      continue;
    }
    
    try {
      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, destPath);
      } else {
        await fs.copyFile(sourcePath, destPath);
      }
    } catch (copyError) {
      console.error(`❌ Error copying ${entry.name}:`, copyError.message);
      // Continue with other entries
    }
  }
}

const isDev = !app.isPackaged;
let mainWindow;

// System information cache
let systemInfo = null;

// Backend API URL - defaults to localhost:8000
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.detail || data}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 790,
    height: 623, // Increased from 595 to 623 to account for 28px titlebar (595 + 28 = 623)
    minWidth: 790,
    minHeight: 623, // Increased from 595 to 623
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
    
    let gpuInfo = [];
    let hasDedicatedGPU = false;
    try {
      if (platform === 'win32') {
        // Get GPU information using wmic
        const { stdout } = await execAsync('wmic path win32_VideoController get name,AdapterRAM');
        const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Name'));
        gpuInfo = lines.map(line => {
          const parts = line.trim().split(/\s{2,}/);
          const name = parts[0] || 'Unknown';
          // Check if it's a dedicated GPU (has significant VRAM or is not integrated)
          const isDedicated = !name.toLowerCase().includes('intel') && 
                              !name.toLowerCase().includes('amd radeon graphics') &&
                              !name.toLowerCase().includes('integrated');
          if (isDedicated) hasDedicatedGPU = true;
          return name;
        }).filter(Boolean);
      } else if (platform === 'darwin') {
        // macOS GPU detection
        try {
          const { stdout } = await execAsync('system_profiler SPDisplaysDataType');
          const lines = stdout.split('\n');
          for (const line of lines) {
            if (line.includes('Chipset Model:')) {
              const gpuName = line.split('Chipset Model:')[1].trim();
              gpuInfo.push(gpuName);
              // Check if it's a dedicated GPU (not Intel or Apple integrated)
              if (!gpuName.toLowerCase().includes('intel') && 
                  !gpuName.toLowerCase().includes('apple m') &&
                  !gpuName.toLowerCase().includes('apple a')) {
                hasDedicatedGPU = true;
              }
            }
          }
          if (gpuInfo.length === 0) {
            // Try alternative method
            const { stdout: altStdout } = await execAsync('system_profiler SPHardwareDataType | grep "Graphics"');
            if (altStdout) {
              gpuInfo.push('Apple GPU');
            }
          }
        } catch (e) {
          gpuInfo = ['Apple GPU'];
        }
      } else {
        // Linux GPU detection
        try {
          // Try nvidia-smi first (for NVIDIA GPUs)
          try {
            const { stdout: nvidiaStdout } = await execAsync('nvidia-smi --query-gpu=name --format=csv,noheader');
            const nvidiaGPUs = nvidiaStdout.split('\n').filter(Boolean).map(line => line.trim());
            if (nvidiaGPUs.length > 0) {
              gpuInfo = nvidiaGPUs;
              hasDedicatedGPU = true;
            }
          } catch (e) {
            // NVIDIA not available, try lspci
            const { stdout } = await execAsync('lspci | grep -iE "vga|3d|display"');
            const lines = stdout.split('\n').filter(Boolean);
            gpuInfo = lines.map(line => {
              // Extract GPU name from lspci output
              const match = line.match(/:\s+(.+?)(?:\s+\[|$)/);
              const name = match ? match[1].trim() : line.trim();
              // Check if it's a dedicated GPU
              if (name.toLowerCase().includes('nvidia') || 
                  name.toLowerCase().includes('amd') ||
                  name.toLowerCase().includes('radeon')) {
                hasDedicatedGPU = true;
              }
              return name;
            });
          }
        } catch (e) {
          // Fallback to basic lspci
          try {
            const { stdout } = await execAsync('lspci | grep -i vga');
            gpuInfo = stdout.split('\n').filter(Boolean).map(line => line.trim());
          } catch (e2) {
            gpuInfo = ['Unknown'];
          }
        }
      }
    } catch (e) {
      gpuInfo = ['Unknown'];
    }
    
    if (gpuInfo.length === 0) {
      gpuInfo = ['Unknown'];
    }

    // Calculate RAM more accurately (round to 1 decimal place for precision)
    const totalMemGB = Math.round((totalMem / (1024 * 1024 * 1024)) * 10) / 10;
    const freeMemGB = Math.round((freeMem / (1024 * 1024 * 1024)) * 10) / 10;
    const usedMemGB = Math.round(((totalMem - freeMem) / (1024 * 1024 * 1024)) * 10) / 10;
    
    systemInfo = {
      ram: {
        total: totalMemGB,
        free: freeMemGB,
        used: usedMemGB
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0
      },
      gpu: gpuInfo,
      hasDedicatedGPU: hasDedicatedGPU,
      platform: platform,
      arch: os.arch(),
      platformName: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : platform === 'linux' ? 'Linux' : platform
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

ipcMain.handle('install-sharedlm', async (event, installPath, selectedModels, modelData, modelsToRemove) => {
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
      
      // Copy the built SharedLM application to installPath
      const appDir = path.join(installPath, 'SharedLM');
      await fs.mkdir(appDir, { recursive: true });
      
      // Determine source path based on whether we're in development or production
      const isDev = !app.isPackaged;
      let sourcePath;
      
      if (isDev) {
        // In development, use the built web app
        sourcePath = path.resolve(__dirname, '..', '..', 'web', 'build');
      } else {
        // In production, the portable exe is bundled as an extraResource
        // Look for SharedLM-Portable-*.exe in the resources/application directory
        console.log('🔍 Looking for bundled portable executable...');
        console.log('  process.execPath:', process.execPath);
        console.log('  process.resourcesPath:', process.resourcesPath);
        
        // List of possible paths to check for the portable exe
        const possiblePaths = [
          // Primary: Use process.resourcesPath
          process.resourcesPath ? path.resolve(process.resourcesPath, 'application') : null,
          // Portable build: resources next to executable
          path.resolve(process.execPath, '..', 'resources', 'application'),
          // Alternative: resources in parent directory
          path.resolve(process.execPath, '..', '..', 'resources', 'application')
        ]
        .filter(p => p !== null)
        .map(p => path.normalize(p));
        
        // Try to find the portable exe
        let foundExe = false;
        for (const testPath of possiblePaths) {
          try {
            const stat = await fs.stat(testPath);
            if (stat.isDirectory()) {
              // Look for SharedLM-Portable-*.exe
              const contents = await fs.readdir(testPath);
              const exeFile = contents.find(item => 
                item.toLowerCase().endsWith('.exe') && 
                item.toLowerCase().includes('sharedlm')
              );
              
              if (exeFile) {
                sourcePath = path.join(testPath, exeFile);
                foundExe = true;
                console.log('✅ Found portable executable:', sourcePath);
                break;
              } else {
                console.log('⚠️ Directory exists but no SharedLM exe found:', testPath);
                console.log('   Contents:', contents.slice(0, 5).join(', '));
              }
            } else if (stat.isFile() && testPath.toLowerCase().endsWith('.exe')) {
              // It's the exe file itself
              sourcePath = testPath;
              foundExe = true;
              console.log('✅ Found portable executable (direct path):', sourcePath);
              break;
            }
          } catch (err) {
            console.log('❌ Not found:', testPath, '-', err.message);
          }
        }
        
        if (!foundExe) {
          console.error('❌ Portable executable not found in any of the checked paths');
          console.error('Checked paths:');
          possiblePaths.forEach((p, i) => {
            console.error(`  ${i + 1}. ${p}`);
          });
        }
      }
      
      // Copy application (portable exe)
      try {
        if (!sourcePath) {
          throw new Error('Application source path not determined. The application may not be bundled with the installer.');
        }
        
        console.log('📦 Using source path:', sourcePath);
        
        // Verify the source path exists
        let sourceExists = false;
        let isFile = false;
        try {
          const stat = await fs.stat(sourcePath);
          sourceExists = true;
          isFile = stat.isFile();
        } catch (statError) {
          console.error('❌ Cannot access source path:', statError.message);
          throw new Error(`Cannot access application file: ${statError.message}`);
        }
        
        if (sourceExists && isFile) {
          // It's a portable exe - just copy it directly
          console.log('✅ Found portable executable, copying...');
          
          // Copy the exe to the install directory
          const destExePath = path.join(appDir, path.basename(sourcePath));
          await fs.copyFile(sourcePath, destExePath);
          
          console.log('✅ Portable executable copied to:', destExePath);
          updateProgress(30, 'Application installed successfully');
          
          // Verify it was copied
          const exeExists = await fs.access(destExePath).then(() => true).catch(() => false);
          if (exeExists) {
            console.log('✅ Executable verified at:', destExePath);
          } else {
            throw new Error('Executable copy verification failed');
          }
        } else if (sourceExists) {
          // Fallback: it's a directory (for unpacked builds)
          console.log('✅ Found application directory, copying files...');
          
          if (sourcePath.includes('.asar')) {
            throw new Error(`Invalid source path (points to asar file): ${sourcePath}`);
          }
          
          // Copy all files from source to destination
          const files = await fs.readdir(sourcePath);
          console.log(`📦 Copying ${files.length} items from source to: ${appDir}`);
          
          for (const file of files) {
            try {
              const sourceFile = path.resolve(sourcePath, file);
              const destFile = path.join(appDir, file);
              
              if (sourceFile.includes('.asar')) {
                console.warn(`⚠️ Skipping file that points to asar: ${file}`);
                continue;
              }
              
              const stat = await fs.stat(sourceFile);
              
              if (stat.isDirectory()) {
                await copyDirectory(sourceFile, destFile);
                console.log(`  ✓ Copied directory: ${file}`);
              } else {
                await fs.copyFile(sourceFile, destFile);
                console.log(`  ✓ Copied file: ${file}`);
              }
            } catch (fileError) {
              console.error(`❌ Error copying ${file}:`, fileError.message);
            }
          }
          
          updateProgress(30, 'Application files copied successfully');
        } else {
          // If source doesn't exist, show detailed error
          console.error('❌ Source application not found at:', sourcePath);
          console.error('Installation cannot continue without the application files.');
          
          // Try to list what's actually in the resources directory for debugging
          try {
            const resourcesDir = path.resolve(process.execPath, '..', 'resources');
            const resourcesExists = await fs.access(resourcesDir).then(() => true).catch(() => false);
            if (resourcesExists) {
              const resourcesContents = await fs.readdir(resourcesDir);
              console.error('Resources directory contents:', resourcesContents);
            }
          } catch (listError) {
            console.error('Could not list resources directory:', listError);
          }
          
          updateProgress(30, 'Application source not found - installation incomplete');
          const errorMsg = `Application source not found at: ${sourcePath}\n\nPlease ensure the application is bundled with the installer.\n\nChecked paths:\n- Portable: ${path.resolve(process.execPath, '..', 'resources', 'application')}\n- Installer: ${path.join(process.resourcesPath || '', 'application')}\n- Alternative: ${path.resolve(process.execPath, '..', '..', 'resources', 'application')}`;
          throw new Error(errorMsg);
        }
      } catch (copyError) {
        console.error('❌ Error copying application files:', copyError);
        console.error('Error stack:', copyError.stack);
        // Don't continue if copy fails - this is critical
        throw copyError;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(40, 'Preparing AI runtime...');
      const ollamaInstalled = await checkOllamaInstalled();
      
      if (!ollamaInstalled) {
        updateProgress(45, 'Installing AI runtime...');
        // Download and install Ollama silently in the background
        // Don't show errors to user - just continue if it fails
        try {
          const ollamaResult = await downloadOllama(installPath);
          if (ollamaResult && ollamaResult.success) {
            updateProgress(60, 'AI runtime ready');
          } else {
            updateProgress(60, 'Continuing setup...');
            console.warn('Ollama installation had issues, but continuing:', ollamaResult?.warning);
          }
        } catch (ollamaError) {
          // Don't fail the entire installation if Ollama fails
          console.warn('Ollama installation failed, but continuing:', ollamaError.message);
          updateProgress(60, 'Continuing setup...');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        updateProgress(50, 'Configuring AI runtime...');
        // Configure existing Ollama installation for silent mode
        try {
          await configureOllamaSilent();
        } catch (configError) {
          console.warn('Could not configure Ollama for silent mode:', configError.message);
        }
        updateProgress(60, 'AI runtime ready');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Remove models that user wants to uninstall
      if (modelsToRemove && modelsToRemove.length > 0) {
        updateProgress(75, 'Removing selected models...');
        
        try {
          // Check if backend is available
          await makeRequest(`${BACKEND_URL}/ollama/check`);
          
          let removedCount = 0;
          for (const modelName of modelsToRemove) {
            try {
              await makeRequest(`${BACKEND_URL}/ollama/model/${encodeURIComponent(modelName)}`, {
                method: 'DELETE'
              });
              removedCount++;
              updateProgress(
                75 + Math.floor((removedCount / modelsToRemove.length) * 5),
                `Removed ${modelName} (${removedCount}/${modelsToRemove.length})`
              );
            } catch (removeError) {
              console.error(`Failed to remove model ${modelName}:`, removeError);
              // Continue with other models even if one fails
            }
          }
        } catch (backendError) {
          console.error('Backend API error during removal:', backendError);
        }
      }
      
      // Download selected models via backend API
      if (selectedModels && selectedModels.length > 0 && modelData) {
        updateProgress(80, 'Preparing model downloads...');
        
        try {
          // Check if backend is available
          await makeRequest(`${BACKEND_URL}/ollama/check`);
          
          // Check which models are already installed
          const existingModels = await getExistingOllamaModels();
          
          // Prepare model download requests (only for models not already installed)
          const modelRequests = selectedModels
            .map(modelId => {
              const model = modelData.find(m => m.id === modelId);
              if (!model) return null;
              
              // Check if model is already installed
              const modelName = model.ollamaCommand.replace('ollama run ', '').trim();
              const baseName = modelName.split(':')[0];
              const isInstalled = existingModels.some(existing => 
                existing === modelName || existing === baseName || existing.startsWith(baseName)
              );
              
              if (isInstalled) {
                return null; // Skip already installed models
              }
              
              return {
                model_id: modelId,
                ollama_command: model.ollamaCommand || `ollama run ${modelId}`
              };
            })
            .filter(Boolean);
          
          if (modelRequests.length > 0) {
            updateProgress(85, `Downloading ${modelRequests.length} new model(s)...`);
            
            // Download models one by one with progress updates
            let downloadedCount = 0;
            for (const modelReq of modelRequests) {
              const modelName = modelReq.model_id;
              updateProgress(
                85 + Math.floor((downloadedCount / modelRequests.length) * 10),
                `Downloading ${modelName}...`
              );
              
              try {
                await makeRequest(`${BACKEND_URL}/ollama/download`, {
                  method: 'POST',
                  body: modelReq
                });
                downloadedCount++;
                updateProgress(
                  85 + Math.floor((downloadedCount / modelRequests.length) * 10),
                  `Downloaded ${modelName} (${downloadedCount}/${modelRequests.length})`
                );
              } catch (modelError) {
                console.error(`Failed to download model ${modelName}:`, modelError);
                // Continue with other models even if one fails
              }
            }
            
            updateProgress(95, `Downloaded ${downloadedCount}/${modelRequests.length} new models`);
          } else {
            updateProgress(90, 'All selected models are already installed');
          }
        } catch (backendError) {
          console.error('Backend API error:', backendError);
          // Continue installation even if backend is unavailable
          // Models can be downloaded later
          updateProgress(85, 'Backend unavailable, models will download on first launch');
        }
      }
      
      updateProgress(96, 'Configuring installation...');
      // Create configuration file with selected models and Ollama integration info
      const configPath = path.join(installPath, 'config.json');
      const config = {
        installPath,
        models: selectedModels,
        modelData: modelData,
        installedAt: new Date().toISOString(),
        ollamaIntegration: {
          shouldCreate: true,
          name: "Local Ollama",
          baseUrl: "http://localhost:11434/v1",
          apiType: "openai",
          providerId: "custom_local_ollama",
          apiKey: "ollama" // Placeholder - Ollama doesn't require real API key
        }
      };
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(98, 'Finalizing installation...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(100, 'Installation complete!');
      
      return {
        success: true,
        installPath,
        modelsQueued: selectedModels
      };
    } catch (error) {
      console.error('Installation error:', error);
      console.error('Error stack:', error.stack);
      
      // Properly serialize error message
      let errorMessage = 'Installation failed';
      if (error) {
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = error.toString() || 'Unknown error occurred';
          }
        }
      }
      
      // Throw a proper Error object so Electron IPC can serialize it correctly
      const installationError = new Error(errorMessage);
      if (error.stack) {
        installationError.stack = error.stack;
      }
      throw installationError;
    }
});

async function checkOllamaInstalled() {
  try {
    await execAsync('ollama --version');
    return true;
  } catch {
    return false;
  }
}

async function getExistingOllamaModels() {
  try {
    const { stdout } = await execAsync('ollama list');
    // Parse output - format is typically:
    // NAME              ID              SIZE    MODIFIED
    // llama3.2         1234567890      2.0 GB  2024-01-01
    const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('NAME'));
    const models = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 0) {
        const modelName = parts[0];
        if (modelName) {
          models.push(modelName);
        }
      }
    }
    return models;
  } catch (error) {
    console.error('Error getting existing models:', error);
    return [];
  }
}

ipcMain.handle('check-ollama-installed', async () => {
  return await checkOllamaInstalled();
});

ipcMain.handle('get-existing-ollama-models', async () => {
  const isInstalled = await checkOllamaInstalled();
  if (!isInstalled) {
    return [];
  }
  return await getExistingOllamaModels();
});

async function downloadOllama(installPath = null) {
  const platform = os.platform();
  const tempDir = os.tmpdir();
  
  console.log(`Downloading and installing Ollama for ${platform}...`);
  
  try {
    let installerPath;
    let downloadUrl;
    
    if (platform === 'win32') {
      // Windows: Download installer from GitHub releases (direct link)
      // Using the latest Windows installer from Ollama's GitHub releases
      downloadUrl = 'https://github.com/ollama/ollama/releases/latest/download/OllamaSetup.exe';
      installerPath = path.join(tempDir, `OllamaSetup_${Date.now()}.exe`);
      
      console.log('Downloading Ollama for Windows...');
      await downloadFile(downloadUrl, installerPath);
      
      // Verify file was downloaded (should be > 1MB for the installer)
      const stats = await fs.stat(installerPath);
      if (stats.size < 1024 * 1024) {
        throw new Error('Downloaded file is too small, may not be the installer');
      }
      console.log(`Downloaded ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Wait a moment to ensure file is fully written and not locked
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Install silently on Windows using execAsync for better error handling
      // Use /VERYSILENT /SUPPRESSMSGBOXES /NORESTART to make it completely silent
      // /D parameter specifies installation directory (must be last parameter, no quotes around path)
      console.log('Installing Ollama (silent mode)...');
      
      // Determine Ollama installation path
      let ollamaInstallPath;
      if (installPath) {
        // Install Ollama to a subdirectory in the user's selected path
        ollamaInstallPath = path.join(installPath, 'Ollama');
      } else {
        // Default to Program Files if no path specified
        ollamaInstallPath = 'C:\\Program Files\\Ollama';
      }
      
      try {
        // Use execAsync with proper shell execution for Windows
        // /VERYSILENT = no UI, /SUPPRESSMSGBOXES = no message boxes, /NORESTART = don't restart
        // /D="path" = custom installation directory (must be last, no quotes in NSIS)
        const installCommand = `"${installerPath}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /D="${ollamaInstallPath}"`;
        await execAsync(installCommand, {
          timeout: 120000, // 2 minute timeout
          windowsHide: true // Hide the console window
        });
        console.log(`Ollama installed successfully to ${ollamaInstallPath}`);
        
        // IMMEDIATELY stop Ollama after installation (before it can launch)
        console.log('Stopping Ollama immediately after installation...');
        try {
          // Kill any Ollama processes that might have started
          await execAsync('taskkill /F /IM ollama.exe /T 2>nul || exit 0', { timeout: 3000 });
          // Stop the service if it started
          await execAsync('net stop Ollama 2>nul || exit 0', { timeout: 5000 });
          console.log('✅ Stopped Ollama immediately after installation');
        } catch (err) {
          console.log('Ollama not running yet (this is okay)');
        }
      } catch (execError) {
        // If exec fails, try spawn as fallback
        console.log('Exec failed, trying spawn...');
        await new Promise((resolve, reject) => {
          const installArgs = ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', `/D=${ollamaInstallPath}`];
          const installProcess = spawn(installerPath, installArgs, {
            detached: false,
            stdio: 'ignore',
            windowsHide: true
          });
          
          installProcess.on('close', (code) => {
            if (code === 0 || code === null) {
              console.log(`Ollama installed successfully to ${ollamaInstallPath}`);
              
              // IMMEDIATELY stop Ollama after installation (use Promise to handle async)
              (async () => {
                try {
                  console.log('Stopping Ollama immediately after installation...');
                  await execAsync('taskkill /F /IM ollama.exe /T 2>nul || exit 0', { timeout: 3000 });
                  await execAsync('net stop Ollama 2>nul || exit 0', { timeout: 5000 });
                  console.log('✅ Stopped Ollama immediately after installation');
                } catch (err) {
                  console.log('Ollama not running yet (this is okay)');
                }
                resolve();
              })();
            } else {
              reject(new Error(`Ollama installer exited with code ${code}`));
            }
          });
          
          installProcess.on('error', (err) => {
            // If spawn fails with EBUSY, wait and retry once
            if (err.code === 'EBUSY') {
              console.log('File busy, waiting and retrying...');
              setTimeout(() => {
                const retryProcess = spawn(installerPath, installArgs, {
                  detached: false,
                  stdio: 'ignore',
                  windowsHide: true
                });
                
                retryProcess.on('close', (retryCode) => {
                  if (retryCode === 0 || retryCode === null) {
                    console.log(`Ollama installed successfully to ${ollamaInstallPath} (retry)`);
                    
                    // IMMEDIATELY stop Ollama after installation (use Promise to handle async)
                    (async () => {
                      try {
                        console.log('Stopping Ollama immediately after installation...');
                        await execAsync('taskkill /F /IM ollama.exe /T 2>nul || exit 0', { timeout: 3000 });
                        await execAsync('net stop Ollama 2>nul || exit 0', { timeout: 5000 });
                        console.log('✅ Stopped Ollama immediately after installation');
                      } catch (err) {
                        console.log('Ollama not running yet (this is okay)');
                      }
                      resolve();
                    })();
                  } else {
                    reject(new Error(`Ollama installer exited with code ${retryCode}`));
                  }
                });
                
                retryProcess.on('error', (retryErr) => {
                  reject(new Error(`Failed to run Ollama installer: ${retryErr.message}`));
                });
              }, 2000);
            } else {
              reject(new Error(`Failed to run Ollama installer: ${err.message}`));
            }
          });
        });
      }
      
      // Clean up installer after a delay to ensure installation started
      setTimeout(async () => {
        try {
          await fs.unlink(installerPath);
        } catch (cleanupError) {
          console.warn('Could not clean up installer:', cleanupError.message);
        }
      }, 5000);
      
    } else if (platform === 'darwin') {
      // macOS: Download from GitHub releases
      downloadUrl = 'https://github.com/ollama/ollama/releases/latest/download/Ollama-darwin.zip';
      installerPath = path.join(tempDir, `Ollama_${Date.now()}.zip`);
      
      console.log('Downloading Ollama for macOS...');
      await downloadFile(downloadUrl, installerPath);
      
      // Verify download
      const stats = await fs.stat(installerPath);
      if (stats.size < 1024 * 1024) {
        throw new Error('Downloaded file is too small');
      }
      console.log(`Downloaded ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Extract and install
      const extractPath = path.join(tempDir, `ollama_extract_${Date.now()}`);
      await fs.mkdir(extractPath, { recursive: true });
      
      console.log('Extracting Ollama (silent mode)...');
      // -q flag makes unzip quiet/silent
      await execAsync(`unzip -q "${installerPath}" -d "${extractPath}"`);
      
      const appPath = path.join(extractPath, 'Ollama.app');
      
      // Determine installation path
      let ollamaInstallPath;
      if (installPath) {
        // Install Ollama to a subdirectory in the user's selected path
        ollamaInstallPath = path.join(installPath, 'Ollama.app');
        // Ensure parent directory exists
        await fs.mkdir(installPath, { recursive: true });
      } else {
        // Default to Applications if no path specified
        ollamaInstallPath = '/Applications/Ollama.app';
      }
      
      // Remove existing installation if present
      try {
        await fs.access(ollamaInstallPath);
        await execAsync(`rm -rf "${ollamaInstallPath}"`);
      } catch {
        // Doesn't exist, that's fine
      }
      
      // Copy to installation location (silent - no output)
      console.log(`Installing Ollama to ${ollamaInstallPath} (silent mode)...`);
      // Redirect output to /dev/null for silent installation
      await execAsync(`cp -R "${appPath}" "${ollamaInstallPath}" > /dev/null 2>&1`);
      
      // IMMEDIATELY stop Ollama after installation (macOS)
      console.log('Stopping Ollama immediately after installation...');
      try {
        await execAsync('pkill -f ollama 2>/dev/null || true', { timeout: 3000 });
        console.log('✅ Stopped Ollama immediately after installation');
      } catch (err) {
        console.log('Ollama not running yet (this is okay)');
      }
      
      // Clean up
      try {
        await fs.unlink(installerPath);
        await execAsync(`rm -rf "${extractPath}"`);
      } catch (cleanupError) {
        console.warn('Could not clean up files:', cleanupError.message);
      }
      
    } else {
      // Linux: Use install script (silent mode)
      console.log('Installing Ollama for Linux (silent mode)...');
      // curl -fsSL: f=fail silently, s=silent, S=show errors only, L=follow redirects
      // Redirect all output to /dev/null for truly silent installation
      await execAsync('curl -fsSL https://ollama.com/install.sh | sh > /dev/null 2>&1');
      
      // IMMEDIATELY stop Ollama after installation (Linux)
      console.log('Stopping Ollama immediately after installation...');
      try {
        await execAsync('systemctl --user stop ollama 2>/dev/null || systemctl stop ollama 2>/dev/null || pkill -f ollama 2>/dev/null || true', { timeout: 3000 });
        console.log('✅ Stopped Ollama immediately after installation');
      } catch (err) {
        console.log('Ollama not running yet (this is okay)');
      }
    }
    
    // Wait a moment for installation to fully complete before verification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify installation by checking if ollama command is available
    console.log('Verifying Ollama installation...');
    let verified = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!verified && attempts < maxAttempts) {
      try {
        const result = await execAsync('ollama --version', { timeout: 5000 });
        if (result.stdout && result.stdout.includes('ollama')) {
          verified = true;
          console.log('Ollama verified:', result.stdout.trim());
        }
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Verification attempt ${attempts}/${maxAttempts}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!verified) {
      throw new Error('Ollama installation verification failed. Please install Ollama manually from https://ollama.com');
    }
    
    // Configure Ollama to run silently in background (no GUI, no auto-start)
    console.log('Configuring Ollama to run silently...');
    await configureOllamaSilent();
    
    return { success: true };
    
  } catch (error) {
    console.error('Error installing Ollama:', error);
    throw new Error(`Failed to install Ollama: ${error.message}. Please install manually from https://ollama.com`);
  }
}

// Configure Ollama to run silently without GUI and disable auto-start
async function configureOllamaSilent() {
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      // Windows: Stop Ollama service, disable auto-start, kill GUI processes
      console.log('Configuring Ollama for Windows (silent mode)...');
      
      // 1. Kill any running Ollama GUI processes first (before stopping service)
      try {
        // Use taskkill to stop GUI instances (ignore errors if no processes)
        await execAsync('taskkill /F /IM ollama.exe /T 2>nul || exit 0', { timeout: 5000 });
        console.log('✅ Stopped any running Ollama GUI processes');
        // Wait a moment for processes to terminate
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        // No processes running, that's fine
        console.log('No Ollama GUI processes to stop');
      }
      
      // 2. Stop Ollama service if running
      try {
        await execAsync('net stop Ollama', { timeout: 10000 });
        console.log('✅ Stopped Ollama service');
        // Wait a moment for service to stop
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        // Service might not be running or might not exist yet, that's okay
        console.log('Ollama service not running or not found (this is okay)');
      }
      
      // 3. Disable Ollama service from auto-starting
      try {
        await execAsync('sc config Ollama start= disabled', { timeout: 10000 });
        console.log('✅ Disabled Ollama service auto-start');
      } catch (err) {
        console.log('Could not disable Ollama service (may require admin):', err.message);
      }
      
      // 4. Remove Ollama from Windows startup (registry)
      try {
        // Remove from HKCU Run registry key (user-level startup)
        await execAsync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v Ollama /f 2>nul || exit 0', { timeout: 5000 });
        console.log('✅ Removed Ollama from Windows startup (user)');
      } catch (err) {
        // Key might not exist, that's fine
        console.log('Ollama not in user startup registry (this is okay)');
      }
      
      // 5. Also try to remove from machine-level startup (requires admin, may fail)
      try {
        await execAsync('reg delete "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v Ollama /f 2>nul || exit 0', { timeout: 5000 });
        console.log('✅ Removed Ollama from Windows startup (machine)');
      } catch (err) {
        // May require admin, that's okay
        console.log('Could not remove from machine startup (may require admin)');
      }
      
    } else if (platform === 'darwin') {
      // macOS: Stop Ollama, disable launch agent
      console.log('Configuring Ollama for macOS (silent mode)...');
      
      // 1. Kill any running Ollama processes
      try {
        await execAsync('pkill -f ollama 2>/dev/null || true', { timeout: 5000 });
        console.log('✅ Stopped any running Ollama processes');
      } catch (err) {
        console.log('No Ollama processes to stop');
      }
      
      // 2. Disable Ollama launch agent (auto-start)
      try {
        const launchAgentPath = path.join(process.env.HOME || '~', 'Library/LaunchAgents/com.ollama.ollama.plist');
        try {
          await fs.access(launchAgentPath);
          // Unload the launch agent
          await execAsync(`launchctl unload "${launchAgentPath}" 2>/dev/null || true`, { timeout: 5000 });
          console.log('✅ Disabled Ollama launch agent');
        } catch {
          console.log('Ollama launch agent not found (this is okay)');
        }
      } catch (err) {
        console.log('Could not disable launch agent:', err.message);
      }
      
    } else {
      // Linux: Stop Ollama service, disable systemd service
      console.log('Configuring Ollama for Linux (silent mode)...');
      
      // 1. Stop Ollama systemd service if it exists
      try {
        await execAsync('systemctl --user stop ollama 2>/dev/null || systemctl stop ollama 2>/dev/null || true', { timeout: 5000 });
        console.log('✅ Stopped Ollama service');
      } catch (err) {
        console.log('Ollama service not running (this is okay)');
      }
      
      // 2. Disable Ollama from auto-starting
      try {
        await execAsync('systemctl --user disable ollama 2>/dev/null || systemctl disable ollama 2>/dev/null || true', { timeout: 5000 });
        console.log('✅ Disabled Ollama service auto-start');
      } catch (err) {
        console.log('Could not disable Ollama service (this is okay)');
      }
      
      // 3. Kill any running Ollama processes
      try {
        await execAsync('pkill -f ollama 2>/dev/null || true', { timeout: 5000 });
        console.log('✅ Stopped any running Ollama processes');
      } catch (err) {
        console.log('No Ollama processes to stop');
      }
    }
    
    console.log('✅ Ollama configured to run silently');
    
  } catch (error) {
    console.warn('Warning: Could not fully configure Ollama for silent mode:', error.message);
    // Don't throw - this is not critical, installation succeeded
  }
}

// Helper function to download files with redirect support
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const download = (downloadUrl, depth = 0) => {
      if (depth > 5) {
        return reject(new Error('Too many redirects'));
      }
      
      const urlObj = new URL(downloadUrl);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      };
      
      const file = require('fs').createWriteStream(destPath);
      let downloadedBytes = 0;
      
      const req = httpModule.get(requestOptions, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            file.close();
            try {
              require('fs').unlinkSync(destPath);
            } catch (e) {
              // Ignore cleanup errors
            }
            // Handle relative redirects
            const absoluteRedirect = redirectUrl.startsWith('http') 
              ? redirectUrl 
              : `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
            return download(absoluteRedirect, depth + 1);
          }
        }
        
        if (res.statusCode !== 200) {
          file.close();
          try {
            require('fs').unlinkSync(destPath);
          } catch (e) {
            // Ignore cleanup errors
          }
          return reject(new Error(`Download failed with status ${res.statusCode}`));
        }
        
        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        console.log(`Downloading ${totalBytes > 0 ? `${(totalBytes / 1024 / 1024).toFixed(2)} MB` : 'unknown size'}...`);
        
        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          file.write(chunk);
          
          // Log progress for large files
          if (totalBytes > 0 && downloadedBytes % (1024 * 1024) === 0) {
            const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            console.log(`Download progress: ${percent}%`);
          }
        });
        
        res.on('end', () => {
          file.end();
          console.log(`Download complete: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
          resolve();
        });
      });
      
      req.on('error', (error) => {
        file.close();
        try {
          require('fs').unlinkSync(destPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        reject(error);
      });
      
      req.setTimeout(300000, () => { // 5 minute timeout
        req.destroy();
        file.close();
        try {
          require('fs').unlinkSync(destPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        reject(new Error('Download timeout'));
      });
    };
    
    download(url);
  });
}

ipcMain.handle('download-ollama', async (event) => {
  return await downloadOllama();
});

async function launchApplication(installPath) {
  try {
    const platform = os.platform();
    let executablePath;
    
    // The application is installed in [installPath]/SharedLM/
    const appDir = path.join(installPath, 'SharedLM');
    
    console.log('Launching application from installPath:', installPath);
    console.log('App directory:', appDir);
    
    if (platform === 'win32') {
      // Windows: Look for SharedLM-Portable-*.exe or SharedLM.exe
      console.log('Looking for executable in:', appDir);
      
      let executableExists = false;
      try {
        const files = await fs.readdir(appDir);
        console.log('Files in appDir:', files);
        
        // Look for portable exe first, then regular exe
        const portableExe = files.find(f => 
          f.toLowerCase().endsWith('.exe') && 
          f.toLowerCase().includes('sharedlm') && 
          f.toLowerCase().includes('portable')
        );
        
        const regularExe = files.find(f => 
          f.toLowerCase().endsWith('.exe') && 
          f.toLowerCase() === 'sharedlm.exe'
        );
        
        if (portableExe) {
          executablePath = path.join(appDir, portableExe);
          executableExists = true;
          console.log('✅ Found portable executable:', executablePath);
        } else if (regularExe) {
          executablePath = path.join(appDir, regularExe);
          executableExists = true;
          console.log('✅ Found executable:', executablePath);
        } else {
          // Try direct path
          executablePath = path.join(appDir, 'SharedLM.exe');
          try {
            await fs.access(executablePath);
            executableExists = true;
            console.log('✅ Found executable at direct path:', executablePath);
          } catch {
            // Check if electron.js exists (development mode)
            const electronJsPath = path.join(appDir, 'electron.js');
            try {
              await fs.access(electronJsPath);
              console.log('✅ Found electron.js (development mode), launching with Electron');
              // Launch using Electron - set environment to mark as installed (not dev)
              const electronPath = process.execPath;
              const childProcess = spawn(electronPath, [electronJsPath], {
                detached: true,
                stdio: 'ignore',
                cwd: appDir,
                env: {
                  ...process.env,
                  // Mark as not dev mode so it uses file:// URLs instead of localhost
                  ELECTRON_IS_DEV: '0',
                  // Set the app directory in environment
                  ELECTRON_APP_DIR: appDir
                }
              });
              
              childProcess.on('error', (err) => {
                console.error('Failed to spawn Electron process:', err);
                throw err;
              });
              
              childProcess.unref();
              console.log('Process spawned successfully with Electron');
              return { success: true };
            } catch {
              throw new Error(`No SharedLM executable found in ${appDir}. Files: ${files.join(', ')}`);
            }
          }
        }
      } catch (dirError) {
        console.error('App directory does not exist or cannot be read:', appDir);
        throw new Error(`Cannot access app directory: ${dirError.message}`);
      }
      
      if (!executableExists) {
        throw new Error('Executable not found');
      }
      
      // Launch on Windows
      console.log('Spawning process:', executablePath);
      const childProcess = spawn(executablePath, [], {
        detached: true,
        stdio: 'ignore',
        cwd: appDir
      });
      
      childProcess.on('error', (err) => {
        console.error('Failed to spawn process:', err);
        throw err;
      });
      
      childProcess.unref();
      console.log('Process spawned successfully');
      
    } else if (platform === 'darwin') {
      // macOS: Launch SharedLM.app
      executablePath = path.join(appDir, 'SharedLM.app', 'Contents', 'MacOS', 'SharedLM');
      
      try {
        await fs.access(executablePath);
      } catch {
        const altPath = path.join(appDir, 'SharedLM.app');
        try {
          await fs.access(altPath);
          executablePath = altPath;
        } catch {
          // Check if electron.js exists (development mode)
          const electronJsPath = path.join(appDir, 'electron.js');
          try {
            await fs.access(electronJsPath);
            console.log('✅ Found electron.js (development mode), launching with Electron');
            // Launch using Electron - set environment to mark as installed (not dev)
            const electronPath = process.execPath;
            spawn(electronPath, [electronJsPath], {
              detached: true,
              stdio: 'ignore',
              cwd: appDir,
              env: {
                ...process.env,
                ELECTRON_IS_DEV: '0',
                ELECTRON_APP_DIR: appDir
              }
            }).unref();
            console.log('Process spawned successfully with Electron');
            return { success: true };
          } catch {
            throw new Error(`SharedLM.app not found`);
          }
        }
      }
      
      // Launch on macOS
      spawn('open', [executablePath], {
        detached: true,
        stdio: 'ignore'
      }).unref();
      
    } else {
      // Linux: Launch SharedLM executable
      executablePath = path.join(appDir, 'SharedLM');
      
      try {
        await fs.access(executablePath);
      } catch {
        // Check if electron.js exists (development mode)
        const electronJsPath = path.join(appDir, 'electron.js');
        try {
          await fs.access(electronJsPath);
          console.log('✅ Found electron.js (development mode), launching with Electron');
          // Launch using Electron - set environment to mark as installed (not dev)
          const electronPath = process.execPath;
          spawn(electronPath, [electronJsPath], {
            detached: true,
            stdio: 'ignore',
            cwd: appDir,
            env: {
              ...process.env,
              ELECTRON_IS_DEV: '0',
              ELECTRON_APP_DIR: appDir
            }
          }).unref();
          console.log('Process spawned successfully with Electron');
          return { success: true };
        } catch {
          throw new Error(`SharedLM executable not found at ${executablePath}`);
        }
      }
      
      // Make executable (if needed)
      try {
        await execAsync(`chmod +x "${executablePath}"`);
      } catch {
        // Ignore chmod errors
      }
      
      // Launch on Linux
      spawn(executablePath, [], {
        detached: true,
        stdio: 'ignore',
        cwd: appDir
      }).unref();
    }
    
    console.log(`Launched SharedLM from: ${executablePath}`);
    return { success: true };
  } catch (error) {
    console.error('Error launching application:', error);
    return { success: false, error: error.message };
  }
}

ipcMain.handle('launch-application', async (event, installPath) => {
  return await launchApplication(installPath);
});

// Handler to read installation config (for main app)
ipcMain.handle('read-install-config', async (event, installPath) => {
  try {
    const configPath = path.join(installPath, 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Failed to read install config:', error);
    return null;
  }
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

