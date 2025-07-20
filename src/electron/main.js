const { app, BrowserWindow, Menu, Tray, globalShortcut, shell, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

// Importer les services
const configService = require('./services/config.service');
const clipboardService = require('./services/clipboard.service');
const notionService = require('./services/notion.service');
const cacheService = require('./services/cache.service');
const statsService = require('./services/stats.service');
const pollingService = require('./services/polling.service');
const parserService = require('./services/parser.service');

// Importer les handlers IPC
const registerNotionIPC = require('./ipc/notion.ipc');
const registerClipboardIPC = require('./ipc/clipboard.ipc');
const registerConfigIPC = require('./ipc/config.ipc');
const registerStatsIPC = require('./ipc/stats.ipc');
const registerContentIPC = require('./ipc/content.ipc');
const registerPageIPC = require('./ipc/page.ipc');
const registerSuggestionIPC = require('./ipc/suggestion.ipc');
const registerEventsIPC = require('./ipc/events.ipc');

let mainWindow = null;
let tray = null;

// Configuration de l'application
const CONFIG = {
  devServerUrl: 'http://localhost:3000',
  prodServerPath: path.join(__dirname, '../react/dist/index.html'),
  windowWidth: 900,
  windowHeight: 700,
  windowMinWidth: 600,
  windowMinHeight: 400
};

// Créer la fenêtre principale
function createWindow() {
  console.log('🪟 Creating main window...');
  
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
      webSecurity: !isDev // Désactiver en dev seulement
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Notion Clipper Pro',
    show: false, // Ne pas afficher immédiatement
    frame: false, // Si vous voulez une fenêtre sans cadre
    backgroundColor: '#1a1a1a'
  });

  // Charger l'application
  if (isDev) {
    console.log('🔧 Loading dev server:', CONFIG.devServerUrl);
    mainWindow.loadURL(CONFIG.devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    console.log('📦 Loading production build:', CONFIG.prodServerPath);
    mainWindow.loadFile(CONFIG.prodServerPath);
  }

  // Après la création de mainWindow, ajouter le CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' data: https://fonts.gstatic.com; " +
          "img-src 'self' data: https: blob:; " +
          "connect-src 'self' ws://localhost:* http://localhost:* https://api.imgbb.com; " +
          "frame-src 'self' https://notion.so https://*.notion.site;"
        ]
      }
    });
  });

  // Afficher quand prêt
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow.show();
    mainWindow.focus();
  });

  // Gérer les erreurs de chargement
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load:', errorCode, errorDescription);
  });

  // Gérer la fermeture
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Créer le tray
function createTray() {
  console.log('🔲 Creating tray...');
  
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Afficher Notion Clipper Pro',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Actualiser',
      click: () => {
        if (mainWindow) {
          mainWindow.reload();
        }
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
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Enregistrer les raccourcis globaux
function registerShortcuts() {
  console.log('⌨️ Registering shortcuts...');
  
  const accelerator = process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C';
  
  globalShortcut.register(accelerator, () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Initialisation des services
async function initializeServices() {
  console.log('🚀 Initializing services...');
  
  try {
    // Initialiser le polling avec les services
    pollingService.initialize(notionService, cacheService, statsService);
    
    // Initialiser Notion si token disponible
    if (configService.isConfigured()) {
      const result = await notionService.initialize();
      if (result.success) {
        console.log('✅ Notion service initialized');
        
        // Démarrer le polling si activé
        if (configService.get('enablePolling')) {
          pollingService.start();
        }
      } else {
        console.log('❌ Notion initialization failed:', result.error);
      }
    } else {
      console.log('ℹ️ Notion not configured yet');
    }

    // Démarrer la surveillance du clipboard
    clipboardService.startWatching();
    console.log('✅ Clipboard service started');
    
    // Logger les stats de démarrage
    statsService.increment('app_starts');
  } catch (error) {
    console.error('❌ Service initialization error:', error);
  }
}

// Enregistrer tous les handlers IPC
function registerAllIPC() {
  console.log('📡 Registering IPC handlers...');
  
  try {
    // Enregistrer les handlers de chaque module
    registerNotionIPC();
    registerClipboardIPC();
    registerConfigIPC();
    registerStatsIPC();
    
    // Handlers IPC pour la fenêtre
    ipcMain.handle('get-app-version', () => app.getVersion());
    
    ipcMain.handle('open-external', async (event, url) => {
      try {
        await shell.openExternal(url);
        return true;
      } catch (error) {
        console.error('Error opening external link:', error);
        return false;
      }
    });
    
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
    
    console.log('✅ All IPC handlers registered');
  } catch (error) {
    console.error('❌ IPC registration error:', error);
  }
}

function registerIPCHandlers() {
  registerNotionIPC();
  registerClipboardIPC();
  registerConfigIPC();
  registerStatsIPC();
  registerContentIPC();
  registerPageIPC();
  registerSuggestionIPC();
  registerEventsIPC();
}

// Application lifecycle
app.whenReady().then(async () => {
  console.log('🎯 Electron app ready');
  
  try {
    // Initialiser les services
    pollingService.initialize(notionService, cacheService, statsService);
    // Charger config et initialiser si token présent
    const notionToken = configService.getNotionToken();
    if (notionToken) {
      await notionService.initialize(notionToken);
    }
    // Enregistrer TOUS les handlers IPC
    registerIPCHandlers();
    // Créer la fenêtre
    createWindow();
    createTray();
    registerShortcuts();
    // Démarrer le polling si configuré
    if (configService.get('enablePolling')) {
      pollingService.start();
    }
    // Démarrer la surveillance du clipboard
    clipboardService.startWatching();
    
    console.log('✅ Application started successfully');
  } catch (error) {
    console.error('❌ Startup error:', error);
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
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
  console.log('👋 Shutting down...');
  
  // Nettoyer les services
  if (clipboardService) clipboardService.stopWatching();
  if (pollingService) pollingService.stop();
  if (parserService) parserService.destroy();
  globalShortcut.unregisterAll();
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export pour les tests
module.exports = { mainWindow };