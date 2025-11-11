#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the built index.html
const indexPath = path.join(__dirname, '..', 'build', 'index.html');

console.log('Fixing index.html for Electron...');

// Read the file
let html = fs.readFileSync(indexPath, 'utf8');

// Remove the CSP meta tag that blocks file:// protocol
html = html.replace(
  /<meta http-equiv="Content-Security-Policy"[^>]*>/gi,
  ''
);

// Also remove other restrictive security headers that don't work with file://
html = html.replace(
  /<meta http-equiv="X-Frame-Options"[^>]*>/gi,
  ''
);

// Write it back
fs.writeFileSync(indexPath, html, 'utf8');

console.log('✓ Removed CSP and X-Frame-Options headers from index.html');
console.log('✓ index.html is now Electron-compatible');

