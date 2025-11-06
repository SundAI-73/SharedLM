#!/bin/bash

echo "🚀 Building SharedLM Desktop App..."

# Step 1: Build backend
echo "📦 Building backend..."
cd ../backend
pip install pyinstaller
pyinstaller backend.spec

# Step 2: Build frontend
echo "⚛️ Building React app..."
cd ../frontend
npm run build

# Step 3: Package with Electron
echo "🖥️ Packaging desktop app..."
electron-builder --win --mac --linux

echo "✅ Build complete! Check frontend/dist/ folder"