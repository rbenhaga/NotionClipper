const { app, BrowserWindow, Menu, Tray, globalShortcut, shell, ipcMain, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { exec } = require('child_process');

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
let isQuitting = false;

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
  // Configuration sécurisée
  const webPreferences = {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
    webviewTag: false,
    sandbox: true,
    webSecurity: !isDev, // Désactiver seulement en dev
    allowRunningInsecureContent: false
  };
  if (isDev) {
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
  }
  mainWindow = new BrowserWindow({
    width: CONFIG.windowWidth,
    height: CONFIG.windowHeight,
    minWidth: CONFIG.windowMinWidth,
    minHeight: CONFIG.windowMinHeight,
    webPreferences,
    icon: path.join(__dirname, '../../assets/icon.png'),
    frame: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    transparent: false,
    backgroundColor: '#ffffff'
  });
  // Headers de sécurité supplémentaires
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'X-Frame-Options': ['DENY'],
        'X-Content-Type-Options': ['nosniff'],
        'Content-Security-Policy': [
          isDev 
            ? "default-src 'self' http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:* ws://localhost:*"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'"
        ]
      }
    });
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
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (!configService.get('trayNotificationShown')) {
        new Notification({
          title: 'Notion Clipper Pro',
          body: "L'application continue en arrière-plan. Utilisez l'icône système pour quitter.",
          icon: path.join(__dirname, '../../assets/icon.png')
        }).show();
        configService.set('trayNotificationShown', true);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Créer le tray
function createTray() {
  console.log('🔲 Creating tray...');
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Afficher Notion Clipper',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Mode',
      submenu: [
        {
          label: 'Toujours visible',
          type: 'checkbox',
          checked: mainWindow?.isAlwaysOnTop(),
          click: () => {
            mainWindow?.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: async () => {
        console.log('🔴 Quitting application from tray...');
        isQuitting = true;
        
        // Nettoyer tous les services
        if (clipboardService) {
          clipboardService.stopWatching();
        }
        if (pollingService) {
          pollingService.stop();
        }
        if (parserService && parserService.destroy) {
          parserService.destroy();
        }
        
        // Désenregistrer les raccourcis
        globalShortcut.unregisterAll();
        
        // Détruire la fenêtre
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy();
        }
        
        // Détruire le tray
        if (tray && !tray.isDestroyed()) {
          tray.destroy();
        }
        
        // En mode dev, tuer aussi le serveur Vite
        if (isDev) {
          console.log('🔴 Killing dev servers...');
          // Sur Windows
          if (process.platform === 'win32') {
            exec('taskkill /f /im node.exe', (err) => {
              if (err) console.error('Error killing node processes:', err);
            });
          } else {
            // Sur Mac/Linux
            exec('pkill -f "vite"', (err) => {
              if (err) console.error('Error killing vite:', err);
            });
          }
        }
        
        // Forcer la fermeture
        setTimeout(() => {
          app.exit(0);
        }, 100);
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
  const accelerator = process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C';
  
  globalShortcut.register(accelerator, () => {
    if (mainWindow) {
      if (!mainWindow.isVisible() || mainWindow.isMinimized()) {
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else if (!mainWindow.isFocused()) {
        mainWindow.focus();
        mainWindow.moveTop();
      } else {
        mainWindow.hide();
      }
    }
  });
}

// Initialisation des services
async function initializeServices() {
  console.log('🚀 Initializing services...');
  
  try {
    // Nettoyer le cache des propriétés système cachées
    if (cacheService && typeof cacheService.forceCleanCache === 'function') {
      console.log('🧹 Appel de forceCleanCache dans initializeServices...');
      cacheService.forceCleanCache();
    } else {
      console.warn('⚠️ cacheService.forceCleanCache non disponible');
    }
    
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

    // Clipboard service simplifié (plus de surveillance automatique)
    console.log('✅ Clipboard service ready');
    
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
    registerContentIPC();
    registerPageIPC();
    registerSuggestionIPC();
    registerEventsIPC();
    
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
    
    // HANDLERS MANQUANTS POUR LES CONTRÔLES DE FENÊTRE
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
    // Nettoyer le cache des propriétés système cachées
    console.log('🔍 Vérification de cacheService...');
    console.log('cacheService:', typeof cacheService);
    console.log('cacheService.forceCleanCache:', typeof cacheService?.forceCleanCache);
    
    if (cacheService && typeof cacheService.forceCleanCache === 'function') {
      console.log('🧹 Appel de forceCleanCache dans app.whenReady...');
      cacheService.forceCleanCache();
    } else {
      console.warn('⚠️ cacheService.forceCleanCache non disponible dans app.whenReady');
    }
    
    // Initialiser les services de base
    pollingService.initialize(notionService, cacheService, statsService);
    // Vérifier si c'est le premier lancement
    const isFirstRun = !configService.get('onboardingCompleted');
    if (!isFirstRun) {
      // Charger config et initialiser si token présent
      const notionToken = configService.getNotionToken();
      if (notionToken) {
        await notionService.initialize(notionToken);
        // Démarrer le polling si configuré
        if (configService.get('enablePolling')) {
          pollingService.start();
        }
      }
    }
    // Enregistrer TOUS les handlers IPC
    registerAllIPC();
    // Créer la fenêtre
    createWindow();
    createTray();
    registerShortcuts();
    
    clipboardService.startWatching(500); // Check toutes les 500ms
    
    // Relayer les événements vers le frontend
    clipboardService.on('changed', (content) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard:changed', content);
      }
    });
    
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

app.on('before-quit', (event) => {
  console.log('👋 Before quit event...');
  
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
  }
  
  // Nettoyer les services
  if (clipboardService) clipboardService.stopWatching();
  if (pollingService) pollingService.stop();
  if (parserService && parserService.destroy) parserService.destroy();
  
  globalShortcut.unregisterAll();
  
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
});

// Ajouter aussi un handler pour will-quit
app.on('will-quit', () => {
  console.log('🔴 App will quit');
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