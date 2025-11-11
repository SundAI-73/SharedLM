#!/bin/bash

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo "🚀 Building SharedLM Desktop App..."

# Step 1: Build backend
echo "📦 Building backend..."
cd "$PROJECT_ROOT/apps/server"
pip install pyinstaller
pyinstaller backend.spec

# Step 2: Build frontend
echo "⚛️ Building React app..."
cd "$PROJECT_ROOT/apps/web"
npm run build

# Step 3: Package with Electron
echo "🖥️ Packaging desktop app..."
node ./scripts/run-electron-builder.js --win --mac --linux

echo "✅ Build complete! Check apps/application/ folder"