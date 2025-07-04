// src/electron/main.js
const { app, BrowserWindow, Menu, Tray, globalShortcut, shell, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const Store = require('electron-store');
const treeKill = require('tree-kill');

const store = new Store();
let mainWindow = null;
let tray = null;
let backendProcess = null;

// Configuration de l'application
const CONFIG = {
  devServerUrl: 'http://localhost:3000',
  prodServerPath: path.join(__dirname, '../react/dist/index.html'),
  pythonScript: isDev 
    ? path.join(__dirname, '../../backend/app.py')
    : path.join(process.resourcesPath, 'app/backend/app.py'),
  windowWidth: 900,
  windowHeight: 700,
  windowMinWidth: 600,
  windowMinHeight: 400
};

// Handlers IPC
function setupIpcHandlers() {
  // Version de l'application
  ipcMain.handle('get-app-version', () => app.getVersion());
  
  // Ouvrir un lien externe
  ipcMain.handle('open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error('Error opening external link:', error);
      return false;
    }
  });
  
  // Contrôles de fenêtre
  ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  
  ipcMain.handle('window-close', () => {
    if (mainWindow) mainWindow.hide();
  });
  
  // Handler pour le rafraîchissement de l'app
  ipcMain.handle('refresh-app', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('refresh-app');
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: CONFIG.windowWidth,
    height: CONFIG.windowHeight,
    minWidth: CONFIG.windowMinWidth,
    minHeight: CONFIG.windowMinHeight,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      partition: 'persist:notion',
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableWebSQL: false
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Notion Clipper Pro',
    show: false,
    frame: false,
    backgroundColor: '#1a1a1a'
  });

  // Intercepter et modifier les headers CSP pour Notion
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { 
      urls: [
        'https://*.notion.so/*',
        'https://*.notion.site/*',
        'https://www.notion.so/*'
      ] 
    },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      
      // Supprimer les headers qui bloquent l'iframe
      Object.keys(responseHeaders).forEach((header) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader === 'x-frame-options' || 
            lowerHeader === 'content-security-policy' ||
            lowerHeader === 'x-content-type-options') {
          delete responseHeaders[header];
        }
      });
      
      callback({ responseHeaders });
    }
  );

  // Charger l'application
  if (isDev) {
    mainWindow.loadURL(CONFIG.devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(CONFIG.prodServerPath);
  }

  // Afficher la fenêtre quand prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Gérer la fermeture
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Afficher Notion Clipper Pro',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Actualiser',
      click: () => {
        mainWindow.reload();
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Notion Clipper Pro');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function startBackend() {
  if (backendProcess) return;
  
  console.log('Starting backend server...');
  
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  
  backendProcess = spawn(pythonCommand, [CONFIG.pythonScript], {
    env: { ...process.env, ELECTRON_RUN: 'true' }
  });
  
  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
  
  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    backendProcess = null;
  });
}

function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend server...');
    
    if (process.platform === 'win32') {
      treeKill(backendProcess.pid, 'SIGTERM');
    } else {
      backendProcess.kill('SIGTERM');
    }
    
    backendProcess = null;
  }
}

function registerShortcuts() {
  // Raccourci global pour afficher/masquer l'application
  const accelerator = process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C';
  
  globalShortcut.register(accelerator, () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    
    // Optionnel : émettre un événement vers le renderer
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('shortcut-triggered', 'toggle-window');
    }
  });
}

// Application lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  startBackend();
  createWindow();
  createTray();
  registerShortcuts();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
  globalShortcut.unregisterAll();
});

app.on('will-quit', () => {
  stopBackend();
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});