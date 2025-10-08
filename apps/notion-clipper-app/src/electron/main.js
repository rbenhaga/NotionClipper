const { app, BrowserWindow, Menu, Tray, globalShortcut, shell, ipcMain, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { exec } = require('child_process');

if (!app.requestSingleInstanceLock()) {
  console.log('⚠️ Another instance already running');
  app.quit();
  process.exit(0);
}

if (process.platform === 'win32') {
  try {
    // Forcer l'encodage UTF-8 pour la console Windows
    process.env.PYTHONIOENCODING = 'utf-8';
    process.env.LC_ALL = 'en_US.UTF-8';

    // Configuration pour Node.js
    if (process.stdout && process.stdout.setEncoding) {
      process.stdout.setEncoding('utf8');
    }
    if (process.stderr && process.stderr.setEncoding) {
      process.stderr.setEncoding('utf8');
    }

  } catch (e) {
    // Fallback silencieux
  }
}


// Import depuis core-shared (logique pure)
const { 
  ConfigService, 
  CacheService, 
  contentDetector 
} = require('@notion-clipper/core-shared');

// Import depuis core-electron (services Node.js)
const { 
  ElectronClipboardService, 
  ElectronNotionService,
  ElectronStatsService,
  ElectronPollingService
} = require('@notion-clipper/core-electron');

// Import depuis adapters-electron
const {
  ElectronClipboardAdapter,
  ElectronConfigAdapter,
  ElectronNotionAPIAdapter,
  ElectronCacheAdapter,
  ElectronStatsAdapter
} = require('@notion-clipper/adapters-electron');

let newClipboardService = null;
let newNotionService = null;
let newConfigService = null;
let newCacheService = null;
let newStatsService = null;
let newPollingService = null;
let servicesInitialized = false;

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

async function initializeNewServices() {
  try {
    console.log('🔧 Initializing new services...');

    // ===================================
    // 1. CONFIG (core-shared + adapter)
    // ===================================
    const configAdapter = new ElectronConfigAdapter();
    newConfigService = new ConfigService(configAdapter);
    console.log('✅ ConfigService initialized');

    // ===================================
    // 2. CACHE (core-shared + adapter)
    // ===================================
    const cacheAdapter = new ElectronCacheAdapter({ maxSize: 2000, ttl: 3600000 });
    await cacheAdapter.initialize();
    newCacheService = new CacheService(cacheAdapter);
    console.log('✅ CacheService initialized');

    // ===================================
    // 3. STATS (core-electron + adapter)
    // ===================================
    const statsAdapter = new ElectronStatsAdapter();
    newStatsService = new ElectronStatsService(statsAdapter);
    await newStatsService.initialize();
    console.log('✅ StatsService initialized');

    // ===================================
    // 4. CLIPBOARD (core-electron + adapter)
    // ===================================
    const clipboardAdapter = new ElectronClipboardAdapter();
    newClipboardService = new ElectronClipboardService(clipboardAdapter, cacheAdapter);
    console.log('✅ ClipboardService initialized');

    // ===================================
    // 5. NOTION (core-electron + adapter)
    // ===================================
    const notionAdapter = new ElectronNotionAPIAdapter();
    newNotionService = new ElectronNotionService(notionAdapter, cacheAdapter);
    console.log('✅ NotionService initialized');

    // ===================================
    // 6. POLLING (core-electron, utilise NotionService)
    // ===================================
    newPollingService = new ElectronPollingService(newNotionService, undefined, 30000);
    console.log('✅ PollingService initialized');

    // ===================================
    // 7. PARSER (supprimé - parser.adapter.js était vide)
    // ===================================
    // newParserService = null; // Plus nécessaire

    servicesInitialized = true;
    console.log('✅ All services initialized successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Services initialization failed:', error);
    servicesInitialized = false;
    return false;
  }
}

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
    console.log('🔧 Dev mode: Loading from dev server');
    mainWindow.loadURL('http://localhost:3000');
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
      // ✅ TODO : Utiliser le nouveau configService
      // if (!newConfigService.get('trayNotificationShown')) {
      new Notification({
        title: 'Notion Clipper Pro',
        body: "L'application continue en arrière-plan. Utilisez l'icône système pour quitter.",
        icon: path.join(__dirname, '../../assets/icon.png')
      }).show();
      // newConfigService.set('trayNotificationShown', true);
      // }
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
        if (newClipboardService && newClipboardService.stopWatching) {
          newClipboardService.stopWatching();
        }
        if (newPollingService) newPollingService.stop();


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
    // ✅ TODO : Utiliser le nouveau cacheService
    // if (newCacheService && typeof newCacheService.forceCleanCache === 'function') {
    //   console.log('🧹 Appel de forceCleanCache avec nouveau service...');
    //   await newCacheService.forceCleanCache();
    // }

    // Démarrer le polling automatique
    if (newPollingService) {
      newPollingService.start(30000); // 30 secondes
      console.log('[OK] Polling started');
    }
    // ✅ TODO : Initialiser Notion avec le nouveau service
    console.log('[INFO] Notion initialization moved to new service architecture');

    // Clipboard service simplifié (plus de surveillance automatique)
    console.log('✅ Clipboard service ready');

    // Logger les stats de démarrage
    if (newStatsService) {
      await newStatsService.incrementClips();
    }
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

// Application lifecycle
app.whenReady().then(async () => {
  console.log('🎯 Electron app ready');
  
  try {
    // Initialiser les nouveaux services
    const servicesReady = await initializeNewServices();
    if (!servicesReady) {
      throw new Error('Failed to initialize services');
    }

    // Enregistrer TOUS les handlers IPC
    registerAllIPC();
    
    // Créer la fenêtre
    createWindow();
    createTray();
    registerShortcuts();

    // Démarrer la surveillance du clipboard
    if (newClipboardService?.startWatching) {
      newClipboardService.startWatching(500);

      // Relayer les événements vers le frontend
      newClipboardService.on('changed', (content) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const serializable = {
            type: content?.type || 'text',
            text: typeof content === 'string' ? content : content?.text || '',
            timestamp: Date.now()
          };
          mainWindow.webContents.send('clipboard:changed', serializable);
        }
      });
    }

    console.log('✅ Application started successfully');
    
  } catch (error) {
    console.error('❌ Startup error:', error);
    dialog.showErrorBox('Erreur de démarrage', error.message);
    app.quit();
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
  if (newClipboardService && newClipboardService.stopWatching) newClipboardService.stopWatching();
  if (newPollingService) {
    newPollingService.stop();
  }
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

// Export pour les tests ET pour les IPC handlers
module.exports = {
  mainWindow,  // NÉCESSAIRE pour les IPC handlers
  get newConfigService() { return newConfigService; },
  get newClipboardService() { return newClipboardService; },
  get newNotionService() { return newNotionService; },
  get newCacheService() { return newCacheService; },
  get newStatsService() { return newStatsService; },
  get newPollingService() { return newPollingService; },
  get servicesInitialized() { return servicesInitialized; }
};