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

  ipcMain.on('minimize-window', (event) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  ipcMain.on('maximize-window', (event) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('close-window', (event) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
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
      webviewTag: true,
      webSecurity: false,
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

  // === Configuration avancée de la session pour Notion ===
  const notionSession = mainWindow.webContents.session;

  // Intercepter toutes les requêtes vers Notion
  notionSession.webRequest.onBeforeSendHeaders(
    {
      urls: ['https://*.notion.so/*', 'https://*.notion.site/*']
    },
    (details, callback) => {
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      details.requestHeaders['Referer'] = 'https://www.notion.so/';
      delete details.requestHeaders['Origin'];
      delete details.requestHeaders['X-Requested-With'];
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // Forcer la suppression complète des headers de sécurité
  notionSession.webRequest.onHeadersReceived(
    {
      urls: ['https://*.notion.so/*', 'https://*.notion.site/*']
    },
    (details, callback) => {
      const responseHeaders = {};
      Object.keys(details.responseHeaders).forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (!['x-frame-options', 'content-security-policy', 'x-content-type-options'].includes(lowerHeader)) {
          responseHeaders[header] = details.responseHeaders[header];
        }
      });
      responseHeaders['Content-Security-Policy'] = "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;";
      responseHeaders['X-Frame-Options'] = 'ALLOWALL';
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

  // Autoriser Google Fonts pour l'app locale
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    {
      urls: [
        'http://localhost:*/*',
        'http://127.0.0.1:*/*',
        'file://*'
      ]
    },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      // CSP permissive pour Google Fonts
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' http://localhost:5000 https://api.notion.com",
        "frame-src 'self' https://*.notion.so https://*.notion.site"
      ].join('; ');
      responseHeaders['Content-Security-Policy'] = [csp];
      callback({ responseHeaders });
    }
  );
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

// === BrowserView pour Notion Preview ===
const { BrowserView } = require('electron');
let previewView = null;

ipcMain.handle('show-notion-preview', async (event, url) => {
  if (!mainWindow) return;
  if (previewView) {
    mainWindow.removeBrowserView(previewView);
    previewView.destroy();
  }
  previewView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:notion-preview'
    }
  });
  mainWindow.addBrowserView(previewView);
  const bounds = mainWindow.getBounds();
  previewView.setBounds({
    x: 50,
    y: 100,
    width: bounds.width - 100,
    height: bounds.height - 150
  });
  await previewView.webContents.loadURL(url);
  previewView.webContents.session.webRequest.onHeadersReceived(
    { urls: ['https://*.notion.so/*'] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [''],
          'X-Frame-Options': ['']
        }
      });
    }
  );
  return true;
});
ipcMain.handle('hide-notion-preview', () => {
  if (previewView && mainWindow) {
    mainWindow.removeBrowserView(previewView);
    previewView.destroy();
    previewView = null;
  }
});

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

// Arrêter le backend quand Electron se ferme
app.on('before-quit', () => {
  if (backendProcess) {
    // Sur Windows, il faut tuer le process et ses enfants
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`taskkill /pid ${backendProcess.pid} /T /F`);
    } else {
      backendProcess.kill();
    }
  }
});