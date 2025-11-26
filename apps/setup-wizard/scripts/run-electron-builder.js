const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const builderArgs = process.argv.slice(2);

// Read electron version from package.json
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
let electronVersion = null;
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const electronDep = packageJson.devDependencies?.electron || packageJson.dependencies?.electron;
  if (electronDep) {
    // Extract version number (remove ^, ~, etc.)
    electronVersion = electronDep.replace(/^[\^~]/, '');
    // If it's a range, get the base version
    if (electronVersion.includes('-')) {
      electronVersion = electronVersion.split('-')[0];
    }
  }
} catch (error) {
  console.warn('⚠ Could not read electron version from package.json:', error.message);
}

const electronBuilderArgs = [...builderArgs];

// Add electron version if we found it
if (electronVersion) {
  electronBuilderArgs.unshift(`--config.electronVersion=${electronVersion}`);
}

// Resolve electron-builder binary
const localBin = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

const rootBin = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

let electronBuilderBin = null;
if (fs.existsSync(localBin)) {
  electronBuilderBin = localBin;
} else if (fs.existsSync(rootBin)) {
  electronBuilderBin = rootBin;
}

if (!electronBuilderBin) {
  console.error('electron-builder binary not found.');
  process.exit(1);
}

// Find root node_modules path for electron (workspace hoisting)
const rootNodeModules = path.resolve(__dirname, '..', '..', '..', 'node_modules');
const localNodeModules = path.resolve(__dirname, '..', 'node_modules');
const rootElectron = path.join(rootNodeModules, 'electron');
const localElectron = path.join(localNodeModules, 'electron');

// Create symlink to hoisted electron if it doesn't exist locally
if (!fs.existsSync(localElectron) && fs.existsSync(rootElectron)) {
  try {
    if (!fs.existsSync(localNodeModules)) {
      fs.mkdirSync(localNodeModules, { recursive: true });
    }
    
    if (process.platform === 'win32') {
      execSync(`mklink /J "${localElectron}" "${rootElectron}"`, { stdio: 'ignore' });
    } else {
      fs.symlinkSync(rootElectron, localElectron, 'dir');
    }
    console.log('✓ Created symlink to electron for electron-builder');
  } catch (error) {
    console.warn('⚠ Could not create electron symlink:', error.message);
  }
}

const nodePath = [
  localNodeModules,
  rootNodeModules,
  process.env.NODE_PATH || ''
].filter(Boolean).join(path.delimiter);

console.log('🚀 Building installer...');

let child;
if (process.platform === 'win32') {
  child = spawn(
    'cmd.exe',
    ['/d', '/s', '/c', electronBuilderBin, ...electronBuilderArgs],
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      windowsVerbatimArguments: false,
      env: {
        ...process.env,
        NODE_PATH: nodePath,
        CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      },
    }
  );
} else {
  child = spawn(electronBuilderBin, electronBuilderArgs, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_PATH: nodePath,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  });
}

child.on('close', (code, signal) => {
  if (signal) {
    console.error(`electron-builder terminated with signal ${signal}`);
    process.exit(1);
  }

  if (code !== 0) {
    process.exit(code ?? 1);
  }

  console.log('✅ Build complete!');
});

