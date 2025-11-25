# SharedLM Setup Wizard

A custom installation wizard for SharedLM desktop application with Ollama integration.

## Features

- **5-Step Installation Process**:
  1. Splash Screen (auto-dismiss)
  2. License Agreement
  3. Installation Location Selection
  4. Model Selection (with hardware scanning)
  5. Installation Progress
  6. Completion Screen

- **Hardware Scanning**: Automatically detects system RAM, CPU, and GPU
- **Smart Model Recommendations**: Suggests compatible models based on hardware
- **Storage Validation**: Checks available disk space before installation
- **Background Downloads**: Queues model downloads for post-installation

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron-dev

# Build for production
npm run build:electron

# Create installer
npm run dist-installer
```

## Building Installer

The setup wizard creates a Windows NSIS installer that:
- Allows custom installation directory
- Creates desktop and start menu shortcuts
- Installs SharedLM + Ollama
- Configures model downloads

## Structure

```
apps/setup-wizard/
├── public/
│   ├── electron.js      # Main Electron process
│   ├── preload.js        # Preload script for IPC
│   └── index.html        # HTML template
├── src/
│   ├── pages/            # Wizard pages
│   ├── App.js            # Main app component
│   └── index.js          # Entry point
└── scripts/              # Build scripts
```

