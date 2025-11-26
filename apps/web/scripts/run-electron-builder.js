#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const builderArgs = process.argv.slice(2);
// Output inside repo at apps/application (relative to this script at apps/web/scripts)
const outputDir = path.resolve(__dirname, '..', '..', 'application');

try {
  fs.mkdirSync(outputDir, { recursive: true });
} catch (error) {
  console.error('Failed to create desktop output directory:', error);
  process.exit(1);
}

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

const electronBuilderArgs = [
  `--config.directories.output=${outputDir}`,
  ...builderArgs,
];

// Add electron version if we found it
if (electronVersion) {
  electronBuilderArgs.unshift(`--config.electronVersion=${electronVersion}`);
}

// Resolve electron-builder binary to avoid PATH/npx issues on Windows
// Check both local node_modules (apps/web/node_modules) and root node_modules (for workspace hoisting)
// __dirname is apps/web/scripts, so go up one level to apps/web/node_modules
const localBin = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

// Check root node_modules (for npm workspaces hoisting)
// From apps/web/scripts, go up 3 levels to root, then to node_modules
const rootBin = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

// Try local first, then root (workspace hoisting)
let electronBuilderBin = null;
if (fs.existsSync(localBin)) {
  electronBuilderBin = localBin;
} else if (fs.existsSync(rootBin)) {
  electronBuilderBin = rootBin;
}

if (!electronBuilderBin) {
  console.error('electron-builder binary not found.');
  console.error('Checked locations:');
  console.error('  -', localBin);
  console.error('  -', rootBin);
  console.error('Ensure devDependencies are installed (npm install) in apps/web or at root.');
  process.exit(1);
}

// Find root node_modules path for electron (workspace hoisting)
const rootNodeModules = path.resolve(__dirname, '..', '..', '..', 'node_modules');
const localNodeModules = path.resolve(__dirname, '..', 'node_modules');
const rootElectron = path.join(rootNodeModules, 'electron');
const localElectron = path.join(localNodeModules, 'electron');

// Create symlink to hoisted electron if it doesn't exist locally
// This helps electron-builder find electron in workspace setups
if (!fs.existsSync(localElectron) && fs.existsSync(rootElectron)) {
  try {
    // Ensure local node_modules exists
    if (!fs.existsSync(localNodeModules)) {
      fs.mkdirSync(localNodeModules, { recursive: true });
    }
    
    // Create symlink (junction on Windows, symlink on Unix)
    if (process.platform === 'win32') {
      // Use junction on Windows (works for directories)
      const { execSync } = require('child_process');
      execSync(`mklink /J "${localElectron}" "${rootElectron}"`, { stdio: 'ignore' });
    } else {
      fs.symlinkSync(rootElectron, localElectron, 'dir');
    }
    console.log('✓ Created symlink to electron for electron-builder');
  } catch (error) {
    // If symlink creation fails, continue anyway - electron-builder might still work
    console.warn('⚠ Could not create electron symlink:', error.message);
  }
}

// Set NODE_PATH to help electron-builder find electron in hoisted location
const nodePath = [
  localNodeModules,
  rootNodeModules,
  process.env.NODE_PATH || ''
].filter(Boolean).join(path.delimiter);

let child;
if (process.platform === 'win32') {
  // Use cmd.exe to launch the .cmd reliably on Windows without manual quoting
  child = spawn(
    'cmd.exe',
    ['/d', '/s', '/c', electronBuilderBin, ...electronBuilderArgs],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
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
    cwd: process.cwd(),
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

  console.log(`Electron artifacts available at: ${outputDir}`);
});

