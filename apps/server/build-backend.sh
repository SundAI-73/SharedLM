#!/bin/bash

# Install PyInstaller
pip install pyinstaller

# Build standalone executable
pyinstaller --onefile \
  --name app \
  --add-data "database:database" \
  --add-data "api:api" \
  --add-data "services:services" \
  --hidden-import=uvicorn \
  --hidden-import=fastapi \
  app.py

echo "Backend built successfully!"