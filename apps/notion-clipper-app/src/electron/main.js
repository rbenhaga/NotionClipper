// apps/notion-clipper-app/src/electron/main.js
const { app, BrowserWindow, Menu, Tray, globalShortcut, shell, ipcMain, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  console.log('⚠️ Another instance already running');
  app.quit();
  process.exit(0);
}

// Windows encoding fix
if (process.platform === 'win32') {
  try {
    process.env.PYTHONIOENCODING = 'utf-8';
    process.env.LC_ALL = 'en_US.UTF-8';
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

// ============================================
// IMPORTS - NEW ARCHITECTURE
// ============================================

// Import depuis core-shared (logique pure)
const {
  ConfigService,
  CacheService
} = require('@notion-clipper/core-shared');

// Import depuis core-electron (services Node.js)
const {
  ElectronClipboardService,
  ElectronNotionService,
  ElectronStatsService,
  ElectronPollingService,
  ElectronParserService,
  ElectronSuggestionService
} = require('@notion-clipper/core-electron');

// Import depuis adapters-electron
const {
  ElectronClipboardAdapter,
  ElectronConfigAdapter,
  ElectronNotionAPIAdapter,
  ElectronCacheAdapter,
  ElectronStatsAdapter
} = require('@notion-clipper/adapters-electron');

// ============================================
// GLOBAL SERVICES
// ============================================
let newClipboardService = null;
let newNotionService = null;
let newConfigService = null;
let newCacheService = null;
let newStatsService = null;
let newPollingService = null;
let newSuggestionService = null;
let newParserService = null;
let servicesInitialized = false;

// Export services for IPC handlers
module.exports = {
  get newClipboardService() { return newClipboardService; },
  get newNotionService() { return newNotionService; },
  get newConfigService() { return newConfigService; },
  get newCacheService() { return newCacheService; },
  get newStatsService() { return newStatsService; },
  get newPollingService() { return newPollingService; },
  get newSuggestionService() { return newSuggestionService; },
  get newParserService() { return newParserService; },
  get servicesInitialized() { return servicesInitialized; },
  
  // Fonction pour réinitialiser le NotionService
  reinitializeNotionService(token) {
    try {
      const { ElectronNotionAPIAdapter } = require('@notion-clipper/adapters-electron');
      const { ElectronNotionService } = require('@notion-clipper/core-electron');
      
      const notionAdapter = new ElectronNotionAPIAdapter(token);
      newNotionService = new ElectronNotionService(notionAdapter, newCacheService);
      
      console.log('[MAIN] ✅ NotionService reinitialized in main.js');
      return true;
    } catch (error) {
      console.error('[MAIN] ❌ Error reinitializing NotionService:', error);
      return false;
    }
  }
};

// IPC Handlers
const registerNotionIPC = require('./ipc/notion.ipc');
const registerClipboardIPC = require('./ipc/clipboard.ipc');
const registerConfigIPC = require('./ipc/config.ipc');
const registerStatsIPC = require('./ipc/stats.ipc');
const registerContentIPC = require('./ipc/content.ipc');
const registerPageIPC = require('./ipc/page.ipc');
const registerSuggestionIPC = require('./ipc/suggestion.ipc');
const registerEventsIPC = require('./ipc/events.ipc');

// Window and Tray
let mainWindow = null;
let tray = null;
let isQuitting = false;

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  devServerUrl: 'http://localhost:3000',
  prodServerPath: path.join(__dirname, '../react/dist/index.html'),
  windowWidth: 900,
  windowHeight: 700,
  windowMinWidth: 600,
  windowMinHeight: 400
};

// ============================================
// SERVICE INITIALIZATION
// ============================================
async function initializeNewServices() {
  try {
    console.log('🔧 Initializing new services...');

    // 1. CONFIG (core-shared + adapter)
    const configAdapter = new ElectronConfigAdapter();
    newConfigService = new ConfigService(configAdapter);
    console.log('✅ ConfigService initialized');

    // 2. CACHE (core-shared + adapter)
    const cacheAdapter = new ElectronCacheAdapter();
    newCacheService = new CacheService(cacheAdapter);
    console.log('✅ CacheService initialized');

    // 3. STATS (core-electron + adapter)
    const statsAdapter = new ElectronStatsAdapter();
    newStatsService = new ElectronStatsService(statsAdapter);
    console.log('✅ StatsService initialized');

    // 4. NOTION API (core-electron + adapter)
    const token = await newConfigService.getNotionToken();
    if (token) {
      const notionAdapter = new ElectronNotionAPIAdapter(token);
      newNotionService = new ElectronNotionService(notionAdapter, newCacheService);
      console.log('✅ NotionService initialized with token');
    } else {
      console.log('⚠️ NotionService waiting for token');
    }

    // 5. CLIPBOARD (core-electron + adapter)
    const clipboardAdapter = new ElectronClipboardAdapter();
    newClipboardService = new ElectronClipboardService(clipboardAdapter);
    console.log('✅ ClipboardService initialized');

    // 6. POLLING (core-electron, utilise NotionService)
    newPollingService = new ElectronPollingService(newNotionService, undefined, 30000);
    console.log('✅ PollingService initialized');

    // 7. SUGGESTION SERVICE
    newSuggestionService = new ElectronSuggestionService(newNotionService);
    console.log('✅ SuggestionService initialized');

    // 8. PARSER SERVICE
    newParserService = new ElectronParserService();
    console.log('✅ ParserService initialized');

    servicesInitialized = true;
    console.log('✅ All services initialized successfully');
    return true;

  } catch (error) {
    console.error('❌ Service initialization error:', error);
    servicesInitialized = false;
    return false;
  }
}

// ============================================
// WINDOW CREATION
// ============================================
function createWindow() {
  console.log('🪟 Creating main window...');
  
  const webPreferences = {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
    webviewTag: false,
    sandbox: true,
    webSecurity: !isDev,
    allowRunningInsecureContent: false
  };

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

  // Security headers
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

  // Load application
  if (isDev) {
    console.log('🔧 Dev mode: Loading from dev server');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('📦 Loading production build:', CONFIG.prodServerPath);
    mainWindow.loadFile(CONFIG.prodServerPath);
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow.show();
    mainWindow.focus();
  });

  // Error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load:', errorCode, errorDescription);
  });

  // Close handling
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Show tray notification
      const trayNotificationShown = newConfigService?.get('trayNotificationShown');
      if (!trayNotificationShown) {
        new Notification({
          title: 'Notion Clipper Pro',
          body: "L'application continue en arrière-plan. Utilisez l'icône système pour quitter."
        }).show();
        newConfigService?.set('trayNotificationShown', true);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================
// TRAY ICON
// ============================================
function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const iconImage = nativeImage.createFromPath(iconPath);
  tray = new Tray(iconImage.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Afficher',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        isQuitting = true;
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

// ============================================
// GLOBAL SHORTCUTS
// ============================================
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

// ============================================
// SERVICE STARTUP
// ============================================
async function initializeServices() {
  console.log('🚀 Initializing services...');

  try {
    // Clean cache at startup
    if (newCacheService && typeof newCacheService.forceCleanCache === 'function') {
      console.log('🧹 Cleaning cache...');
      await newCacheService.forceCleanCache();
    }

    // Start polling
    if (newPollingService) {
      newPollingService.start(30000); // 30 seconds
      console.log('[OK] Polling started');
    }

    // Start clipboard monitoring
    if (newClipboardService?.startWatching) {
      newClipboardService.startWatching(500);

      // Relay clipboard events to frontend
      newClipboardService.on('changed', (content) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const serializable = {
            type: content?.type || 'text',
            text: typeof content === 'string' ? content : content?.text || content?.content || '',
            timestamp: Date.now()
          };
          mainWindow.webContents.send('clipboard:changed', serializable);
        }
      });

      newClipboardService.on('cleared', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard:cleared');
        }
      });

      console.log('✅ Clipboard monitoring started');
    }

    // Log startup stats
    if (newStatsService) {
      await newStatsService.incrementClips();
    }
  } catch (error) {
    console.error('❌ Service initialization error:', error);
  }
}

// ============================================
// IPC HANDLERS REGISTRATION
// ============================================
function registerAllIPC() {
  console.log('📡 Registering IPC handlers...');

  try {
    // Register all modular handlers
    registerNotionIPC();
    registerClipboardIPC();
    registerConfigIPC();
    registerStatsIPC();
    registerContentIPC();
    registerPageIPC();
    registerSuggestionIPC();
    registerEventsIPC();

    // Window control handlers
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

// ============================================
// APPLICATION LIFECYCLE
// ============================================
app.whenReady().then(async () => {
  console.log('🎯 Electron app ready');

  try {
    // Initialize services
    const servicesReady = await initializeNewServices();
    if (!servicesReady) {
      throw new Error('Failed to initialize services');
    }

    // Register IPC handlers
    registerAllIPC();

    // Create UI
    createWindow();
    createTray();
    registerShortcuts();

    // Start services
    await initializeServices();

  } catch (error) {
    console.error('❌ Application startup error:', error);
    dialog.showErrorBox(
      'Erreur de démarrage',
      'Impossible de démarrer l\'application. Veuillez réessayer.'
    );
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Cleanup
  if (newClipboardService?.stopWatching) {
    newClipboardService.stopWatching();
  }
  if (newPollingService) {
    newPollingService.stop();
  }
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Do not quit on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});