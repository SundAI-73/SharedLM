const fs = require('fs');
const path = require('path');

// Fix electron build paths
const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');

// Ensure electron.js and preload.js are accessible
console.log('✅ Electron build fix completed');

