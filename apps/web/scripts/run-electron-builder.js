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

const electronBuilderArgs = [
  `--config.directories.output=${outputDir}`,
  ...builderArgs,
];

// Resolve local electron-builder binary to avoid PATH/npx issues on Windows
// __dirname is apps/web/scripts, so go up one level to apps/web/node_modules
const electronBuilderBin = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

if (!fs.existsSync(electronBuilderBin)) {
  console.error('electron-builder binary not found at:', electronBuilderBin);
  console.error('Ensure devDependencies are installed (npm install) in apps/web.');
  process.exit(1);
}

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

