# SharedLM Setup Wizard - Setup Guide

## Overview

The SharedLM Setup Wizard is a custom installation wizard built with React and Electron that provides a seamless installation experience for users. It handles:

1. License agreement acceptance
2. Installation directory selection
3. Hardware scanning and model recommendations
4. Installation of SharedLM + Ollama
5. Model download queueing

## Project Structure

```
apps/setup-wizard/
├── public/
│   ├── electron.js          # Main Electron process (IPC handlers, installation logic)
│   ├── preload.js            # Preload script (exposes safe APIs to renderer)
│   ├── index.html            # HTML template
│   └── icon.png              # Application icon
├── src/
│   ├── pages/                # Wizard page components
│   │   ├── SplashScreen.js
│   │   ├── LicenseAgreement.js
│   │   ├── InstallationLocation.js
│   │   ├── ModelSelection.js
│   │   ├── InstallationProgress.js
│   │   └── Completion.js
│   ├── App.js                # Main app with page routing
│   ├── App.css               # Global styles
│   ├── index.js              # React entry point
│   └── index.css             # Base styles
├── scripts/
│   ├── fix-electron-build.js # Build fix script
│   └── run-electron-builder.js # Electron builder runner
├── package.json              # Dependencies and scripts
├── electron-builder.json     # Electron builder configuration
└── installer.nsh             # NSIS installer customizations
```

## Installation Flow

### Page 0: Splash Screen
- Auto-dismisses after 2.5 seconds
- Shows SharedLM logo and branding
- Fades to License Agreement

### Page 1: License Agreement
- Scrollable license text
- Radio buttons for accept/decline
- Next button disabled until accepted

### Page 2: Installation Location
- Browse button to select directory
- Real-time disk space validation
- Shows available space and warnings

### Page 3: Model Selection
- Silent hardware scan (RAM, CPU, GPU)
- Shows compatible models only
- Phi-3 Mini always selected by default
- Dynamic storage calculation
- Warnings for large downloads

### Page 4: Installation Progress
- Progress bar with percentage
- Step-by-step status updates
- Models queued for background download
- Auto-advances to completion

### Page 5: Completion
- Success message
- Installation details
- Launch option checkbox
- Finish button

## Development

### Prerequisites
- Node.js 18+
- npm 10+

### Setup
```bash
cd apps/setup-wizard
npm install
```

### Run in Development
```bash
npm run electron-dev
```

This will:
1. Start React dev server on port 3000
2. Launch Electron window connected to dev server

### Build for Production
```bash
npm run build:electron
```

This creates the production build in `build/` directory.

### Create Installer
```bash
npm run dist-installer
```

This creates a Windows NSIS installer in `../application/setup/`.

## Integration with SharedLM

### Current Status
The setup wizard is a standalone application. To integrate it with the actual SharedLM installation:

### 1. Copy SharedLM Application
In `public/electron.js`, the `install-sharedlm` handler needs to:
- Copy the built SharedLM application from `apps/web/build` to the selected install path
- Include all necessary files (electron binaries, resources, etc.)

### 2. Install Ollama
The wizard currently has placeholder logic for Ollama installation. To implement:

**Windows:**
- Download Ollama installer from https://ollama.com/download/windows
- Run installer silently: `OllamaSetup.exe /S`
- Verify installation: `ollama --version`

**macOS:**
- Download from https://ollama.com/download/mac
- Install via Homebrew or DMG

**Linux:**
- Run: `curl -fsSL https://ollama.com/install.sh | sh`

### 3. Model Download Queue
After installation, models should be queued for download. The wizard saves selected models to a config file. The main SharedLM app should:
- Read the config file on first launch
- Download queued models using Ollama: `ollama pull <model-name>`
- Show download progress in the app

### 4. Launch Application
On completion, the wizard should launch the installed SharedLM application from the install path.

## Customization

### Styling
- Global styles: `src/App.css`
- Page-specific styles: `src/pages/*.css`
- Color scheme: Dark theme with red accents (#ff0000)

### Models
Edit `AVAILABLE_MODELS` in `src/pages/ModelSelection.js` to add/remove models.

### License Text
Edit the `licenseText` constant in `src/pages/LicenseAgreement.js`.

## Building Distribution

### Windows Installer (NSIS)
```bash
npm run dist-installer
```

The installer will:
- Allow custom installation directory
- Create desktop and start menu shortcuts
- Include uninstaller
- Run with admin privileges if needed

### Output Location
Installers are created in: `apps/application/setup/`

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `npm install`
- Clear build cache: Delete `build/` and `node_modules/`, then reinstall

### Electron Issues
- Check `public/electron.js` for IPC handler errors
- Verify `public/preload.js` exposes correct APIs
- Check browser console for renderer errors

### Installation Issues
- Verify disk space before installation
- Check file permissions for install directory
- Ensure Ollama installation path is correct

## Next Steps

1. **Integrate with SharedLM build**: Copy actual application files during installation
2. **Implement Ollama download**: Add real download and installation logic
3. **Model download queue**: Implement background download system in main app
4. **Testing**: Test on Windows, macOS, and Linux
5. **Code signing**: Add code signing for Windows installer
6. **Auto-updater**: Integrate with electron-updater for future updates

