// src/electron/main.js
const { app, BrowserWindow, Menu, Tray, globalShortcut, shell } = require('electron');
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
    ? path.join(__dirname, '../../notion_backend.py')
    : path.join(process.resourcesPath, 'app/notion_backend.py'),
  windowWidth: 900,
  windowHeight: 700,
  windowMinWidth: 600,
  windowMinHeight: 400
};

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
      webSecurity: true, // Gardons la sécurité activée
      partition: 'persist:notion' // Session isolée pour Notion
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Notion Clipper Pro',
    show: false,
    frame: true,
    backgroundColor: '#1a1a1a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // IMPORTANT: Intercepter et modifier les headers CSP pour Notion
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { 
      urls: [
        'https://*.notion.so/*',
        'https://*.notion.site/*',
        'https://www.notion.so/*'
      ] 
    },
    (details, callback) => {
      console.log('Intercepting headers for:', details.url);
      
      // Copier les headers
      const responseHeaders = { ...details.responseHeaders };
      
      // Supprimer les headers qui bloquent l'iframe
      Object.keys(responseHeaders).forEach(header => {
        const headerLower = header.toLowerCase();
        
        // Supprimer X-Frame-Options
        if (headerLower === 'x-frame-options') {
          console.log('Removing X-Frame-Options header');
          delete responseHeaders[header];
        }
        
        // Modifier ou supprimer Content-Security-Policy
        if (headerLower === 'content-security-policy') {
          console.log('Modifying Content-Security-Policy header');
          // Option 1: Supprimer complètement (plus simple mais moins sécurisé)
          delete responseHeaders[header];
          
          // Option 2: Modifier seulement frame-ancestors (plus sécurisé)
          // responseHeaders[header] = responseHeaders[header].map(policy => 
          //   policy.replace(/frame-ancestors[^;]*;?/g, 'frame-ancestors *;')
          // );
        }
      });
      
      callback({ 
        cancel: false, 
        responseHeaders: responseHeaders 
      });
    }
  );

  // Charger l'application
  if (isDev) {
    mainWindow.loadURL(CONFIG.devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(CONFIG.prodServerPath);
  }

  // Gérer l'affichage de la fenêtre
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Restaurer la position de la fenêtre
    const bounds = store.get('windowBounds');
    if (bounds) {
      mainWindow.setBounds(bounds);
    }
  });

  // Sauvegarder la position de la fenêtre
  mainWindow.on('close', () => {
    if (!mainWindow.isDestroyed()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  // Empêcher la fermeture complète sur macOS
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Gérer les liens externes
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Afficher', 
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    { 
      label: 'Quitter', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Notion Clipper Pro');
  tray.setContextMenu(contextMenu);
  
  // Double-clic pour afficher la fenêtre
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
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
  });
}

// Application lifecycle
app.whenReady().then(() => {
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