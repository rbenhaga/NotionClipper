const { app, BrowserWindow, Menu, Tray, globalShortcut, shell, ipcMain, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { exec } = require('child_process');

// ✅ CORRECTION : Configuration encodage UTF-8 pour Windows
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

// ✅ NOUVEAU : Importer les packages compilés directement
const corePath = path.join(__dirname, '..', '..', '..', '..', 'packages', 'core', 'dist', 'index.js');
const {
  ClipboardService,
  NotionService,
  ConfigService,
  CacheService,
  contentDetector
} = require(corePath);

// ✅ AJOUTER : Import des adapters locaux
const ElectronClipboardAdapter = require('./adapters/clipboard.adapter');
const ElectronNotionAPIAdapter = require('./adapters/notion-api.adapter');
const ElectronConfigAdapter = require('./adapters/config.adapter');
const ElectronCacheAdapter = require('./adapters/cache.adapter');
const ElectronStatsAdapter = require('./adapters/stats.adapter');
const ElectronParserAdapter = require('./adapters/parser.adapter');
const ElectronPollingAdapter = require('./adapters/polling.adapter');

let newClipboardService = null;
let newNotionService = null;
let newConfigService = null;
let newCacheService = null;
let newStatsService = null;
let newParserService = null;
let newPollingService = null;

// ✅ AJOUTER : Exporter pour que les IPC puissent y accéder
module.exports = {
  get newClipboardService() {
    return newClipboardService;
  },
  get newNotionService() {
    return newNotionService;
  },
  get newConfigService() {
    return newConfigService;
  },
  get newCacheService() {
    return newCacheService;
  },
  get newStatsService() {
    return newStatsService;
  },
  get newParserService() {
    return newParserService;
  },
  get newPollingService() {
    return newPollingService;
  }
};

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

// ✅ AJOUTER cette fonction (maintenant async pour le cache)
async function initializeNewServices() {
  try {
    console.log('🔧 Initializing new services...');

    // ✅ CONFIG : Créer l'adapter Config (en premier car les autres en dépendent)
    const configAdapter = new ElectronConfigAdapter();
    console.log('✅ ElectronConfigAdapter created');

    // Essayer de créer le ConfigService TypeScript
    try {
      newConfigService = new ConfigService(configAdapter);
      console.log('✅ ConfigService TypeScript initialized');
    } catch (tsError) {
      console.warn('⚠️ ConfigService TS failed, using adapter directly:', tsError.message);
      newConfigService = configAdapter;
    }

    // ✅ CACHE : Créer l'adapter Cache (nécessite initialisation async)
    const cacheAdapter = new ElectronCacheAdapter({ maxSize: 2000, ttl: 3600000 });
    await cacheAdapter.initialize(); // Cache nécessite initialisation async
    console.log('✅ ElectronCacheAdapter created and initialized');

    // Essayer de créer le CacheService TypeScript
    try {
      newCacheService = new CacheService(cacheAdapter);
      console.log('✅ CacheService TypeScript initialized');
    } catch (tsError) {
      console.warn('⚠️ CacheService TS failed, using adapter directly:', tsError.message);
      newCacheService = cacheAdapter;
    }

    // Stats
    const statsAdapter = new ElectronStatsAdapter();
    await statsAdapter.initialize();
    newStatsService = statsAdapter; // Utiliser directement l'adapter
    console.log('[OK] ElectronStatsAdapter initialized');

    // Parser
    const parserAdapter = new ElectronParserAdapter();
    newParserService = parserAdapter;
    console.log('[OK] ElectronParserAdapter initialized');

    // ✅ CLIPBOARD : Créer l'adapter Electron
    const clipboardAdapter = new ElectronClipboardAdapter();
    console.log('✅ ElectronClipboardAdapter created');

    // Essayer de créer le ClipboardService TypeScript
    try {
      // Le ClipboardService attend (clipboard, storage) selon l'interface
      const mockStorage = {
        get: async (key) => null,
        set: async (key, value) => true,
        delete: async (key) => true,
        clear: async () => true
      };

      newClipboardService = new ClipboardService(clipboardAdapter, mockStorage);
      console.log('✅ ClipboardService TypeScript initialized');
    } catch (tsError) {
      console.warn('⚠️ ClipboardService TS failed, using adapter directly:', tsError.message);
      newClipboardService = clipboardAdapter;
    }

    // ✅ NOTION : Créer l'adapter Notion
    const notionAdapter = new ElectronNotionAPIAdapter();
    console.log('✅ ElectronNotionAPIAdapter created');

    // Polling
    const pollingAdapter = new ElectronPollingAdapter(notionAdapter, cacheAdapter);
    newPollingService = pollingAdapter;
    console.log('[OK] ElectronPollingAdapter initialized');

    // Essayer de créer le NotionService TypeScript
    try {
      newNotionService = new NotionService(notionAdapter);
      console.log('✅ NotionService TypeScript initialized');
    } catch (tsError) {
      console.warn('⚠️ NotionService TS failed, using adapter directly:', tsError.message);
      newNotionService = notionAdapter;
    }

    console.log('[OK] New services initialized (All 7 services migrated!)');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
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
    // ✅ TODO : Utiliser le nouveau cacheService après migration
    console.log('🔍 Cache service migration pending...');

    // ✅ NOUVEAU : Test des nouveaux services core
    console.log('🔧 Test des nouveaux services core...');
    console.log('ClipboardService disponible:', !!ClipboardService);
    console.log('NotionService disponible:', !!NotionService);

    // ⚠️ TEMPORAIRE : Pas d'initialisation complète pour l'instant
    // On teste juste que les packages se chargent correctement
    console.log('✅ Packages core chargés avec succès');

    // ✅ NOUVEAU : Utiliser les nouveaux services
    // TODO : Migrer le polling vers les nouveaux services
    console.log('[INFO] Polling service migration pending');
    // ✅ AJOUTER ceci (maintenant async)
    const newServicesReady = await initializeNewServices();
    if (newServicesReady) {
      console.log('✅ Migration: New services ready');
    }

    // Enregistrer TOUS les handlers IPC
    registerAllIPC();
    // Créer la fenêtre
    createWindow();
    createTray();
    registerShortcuts();

    // ✅ NOUVEAU : Démarrer la surveillance avec le nouveau service
    if (newClipboardService && newClipboardService.startWatching) {
      newClipboardService.startWatching(500); // Check toutes les 500ms

      // Relayer les événements vers le frontend
      newClipboardService.on('changed', (content) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Simplifier le contenu pour la sérialisation
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

// Export pour les tests
module.exports = { mainWindow };