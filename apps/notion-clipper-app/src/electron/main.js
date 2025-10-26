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

// Handler pour quand une deuxième instance essaie de se lancer
app.on('second-instance', (event, commandLine, workingDirectory) => {
  console.log('🔄 Second instance detected, focusing main window');
  // Si une deuxième instance est lancée, focus sur la fenêtre existante
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

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
  ElectronSuggestionService,
  // 🆕 Nouveaux services
  ElectronFileService,
  ElectronHistoryService,
  ElectronQueueService
} = require('@notion-clipper/core-electron');

// Import depuis adapters-electron
const {
  ElectronClipboardAdapter,
  ElectronConfigAdapter,
  ElectronNotionAPIAdapter,
  ElectronCacheAdapter,
  ElectronStatsAdapter,
  ElectronStorageAdapter,
  // 🆕 Nouveaux adapters
  ElectronFileAdapter,
  ElectronHistoryAdapter,
  ElectronQueueAdapter
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
// 🆕 Nouveaux services
let newHistoryService = null;
let newQueueService = null;
let newFileService = null;
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
  // 🆕 Nouveaux services
  get newHistoryService() { return newHistoryService; },
  get newQueueService() { return newQueueService; },
  get newFileService() { return newFileService; },
  get servicesInitialized() { return servicesInitialized; },

  // 🆕 Getters pour les handlers IPC
  getHistoryService: () => newHistoryService,
  getQueueService: () => newQueueService,
  getFileService: () => newFileService,
  getNotionService: () => newNotionService,

  // Fonction pour réinitialiser le NotionService
  reinitializeNotionService: (token) => {
    try {
      console.log('[MAIN] 🔄 Reinitializing NotionService...');
      console.log('[MAIN] Token provided:', !!token);

      if (!token) {
        console.error('[MAIN] ❌ No token provided for reinitialization');
        return false;
      }

      console.log('[MAIN] 🔧 Creating new NotionAPIAdapter...');
      const notionAdapter = new ElectronNotionAPIAdapter(token);

      console.log('[MAIN] 🔧 Creating new ElectronNotionService...');
      // ✅ FIX: Mettre à jour BOTH la variable globale ET l'export
      newNotionService = new ElectronNotionService(notionAdapter, newCacheService, newHistoryService);
      module.exports.newNotionService = newNotionService;

      console.log('[MAIN] ✅ NotionService reinitialized successfully');
      console.log('[MAIN] ✅ Service available:', !!newNotionService);

      return true;
    } catch (error) {
      console.error('[MAIN] ❌ Error reinitializing NotionService:', error);
      console.error('[MAIN] ❌ Stack:', error.stack);
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
const registerWindowIPC = require('./ipc/window.ipc');
// 🆕 Nouveaux handlers IPC
const { registerFileHandlers } = require('./ipc/file.ipc');
const { registerHistoryHandlers } = require('./ipc/history.ipc');
const { registerQueueHandlers } = require('./ipc/queue.ipc');

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
  windowMinHeight: 200,
  // ✅ Configuration mode minimaliste - Ultra compact
  minimalistWidth: 200, // Largeur très compacte
  minimalistHeight: 450 // Hauteur confortable
};

// ✅ État de la fenêtre sauvegardé
let windowState = {
  isMinimalist: false,
  normalBounds: null,
  minimalistBounds: null,
  lastMode: 'normal'
};

// ✅ Fonction pour valider si des bounds sont visibles à l'écran
function areBoundsVisible(bounds, screenBounds, margin = 80) {
  if (!bounds || !screenBounds) return false;

  // ✅ Validation stricte avec marge généreuse
  const rightEdge = bounds.x + bounds.width;
  const bottomEdge = bounds.y + bounds.height;

  const isVisible = (
    bounds.x >= margin &&
    bounds.y >= margin &&
    rightEdge <= (screenBounds.width - margin) &&
    bottomEdge <= (screenBounds.height - margin)
  );

  if (!isVisible) {
    console.log('🔍 Bounds validation failed:', {
      bounds,
      screenBounds,
      rightEdge,
      bottomEdge,
      maxRight: screenBounds.width - margin,
      maxBottom: screenBounds.height - margin
    });
  }

  return isVisible;
}

// ✅ Fonction pour ajuster des bounds pour qu'elles soient visibles
function adjustBoundsToScreen(bounds, screenBounds, margin = 80) {
  const adjusted = { ...bounds };

  // ✅ Ajuster X avec priorité sur la visibilité complète
  if (adjusted.x < margin) {
    adjusted.x = margin;
  } else if (adjusted.x + adjusted.width > screenBounds.width - margin) {
    adjusted.x = screenBounds.width - adjusted.width - margin;
    // ✅ Sécurité : si même après ajustement c'est trop à gauche
    if (adjusted.x < margin) {
      adjusted.x = margin;
    }
  }

  // ✅ Ajuster Y avec priorité sur la visibilité complète
  if (adjusted.y < margin) {
    adjusted.y = margin;
  } else if (adjusted.y + adjusted.height > screenBounds.height - margin) {
    adjusted.y = screenBounds.height - adjusted.height - margin;
    // ✅ Sécurité : si même après ajustement c'est trop haut
    if (adjusted.y < margin) {
      adjusted.y = margin;
    }
  }

  console.log('🔧 Adjusted bounds:', {
    original: bounds,
    adjusted,
    screenBounds,
    margin
  });

  return adjusted;
}

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

    // 4. HISTORY SERVICE (needed by NotionService)
    const historyStorage = new ElectronStorageAdapter();
    newHistoryService = new ElectronHistoryService(historyStorage);
    console.log('✅ HistoryService initialized');

    // 5. NOTION API (core-electron + adapter)
    const token = await newConfigService.getNotionToken();
    if (token) {
      const notionAdapter = new ElectronNotionAPIAdapter(token);
      newNotionService = new ElectronNotionService(notionAdapter, newCacheService, newHistoryService);
      console.log('✅ NotionService initialized with token');
    } else {
      console.log('⚠️ NotionService waiting for token');
    }

    // 6. CLIPBOARD (core-electron + adapter)
    const clipboardAdapter = new ElectronClipboardAdapter();
    newClipboardService = new ElectronClipboardService(clipboardAdapter);
    console.log('✅ ClipboardService initialized');

    // 7. POLLING (core-electron, utilise NotionService)
    newPollingService = new ElectronPollingService(newNotionService, undefined, 30000);
    console.log('✅ PollingService initialized');

    // 8. SUGGESTION SERVICE - Système intelligent
    newSuggestionService = new ElectronSuggestionService(newNotionService);
    console.log('✅ SuggestionService initialized (intelligent system)');

    // 9. PARSER SERVICE
    newParserService = new ElectronParserService();
    console.log('✅ ParserService initialized');

    // 10. 🆕 NOUVEAUX SERVICES
    // FILE SERVICE
    const fileAdapter = new ElectronFileAdapter();
    const notionToken = await newConfigService.getNotionToken();
    if (notionToken && newNotionService) {
      newFileService = new ElectronFileService(newNotionService.notionAPI, newCacheService, notionToken);
      console.log('✅ FileService initialized');
    } else {
      console.log('⚠️ FileService waiting for token');
    }

    // QUEUE SERVICE
    const queueStorage = new ElectronStorageAdapter();
    if (newNotionService && newHistoryService) {
      newQueueService = new ElectronQueueService(queueStorage, newNotionService, newHistoryService);
      console.log('✅ QueueService initialized');
    } else {
      console.log('⚠️ QueueService waiting for dependencies');
    }

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
// WINDOW STATE CLEANUP
// ============================================
async function cleanupWindowState() {
  if (!newConfigService) return;

  try {
    const savedState = await newConfigService.get('windowState');
    if (!savedState) return;

    let needsCleanup = false;
    const cleanState = { ...savedState };

    // ✅ Nettoyer les bounds minimalistes avec des dimensions incorrectes
    if (cleanState.minimalistBounds) {
      if (cleanState.minimalistBounds.width !== CONFIG.minimalistWidth ||
        cleanState.minimalistBounds.height !== CONFIG.minimalistHeight) {
        console.log('🧹 Cleaning up corrupted minimalist bounds');
        cleanState.minimalistBounds = {
          x: cleanState.minimalistBounds.x,
          y: cleanState.minimalistBounds.y,
          width: CONFIG.minimalistWidth,
          height: CONFIG.minimalistHeight
        };
        needsCleanup = true;
      }
    }

    if (needsCleanup) {
      await newConfigService.set('windowState', cleanState);
      console.log('✅ Window state cleaned up');
    }
  } catch (error) {
    console.error('❌ Error cleaning window state:', error);
  }
}

// ============================================
// WINDOW CREATION
// ============================================
async function createWindow() {
  console.log('🪟 Creating main window...');

  // ✅ Nettoyer les données corrompues avant de créer la fenêtre
  await cleanupWindowState();

  const webPreferences = {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
    webviewTag: false,
    sandbox: true,
    webSecurity: !isDev,
    allowRunningInsecureContent: false
  };

  // ✅ Charger l'icône de l'app depuis les nouveaux fichiers générés
  const fs = require('fs');
  const appIconPath = path.join(__dirname, '../../assets/icons/app-icon-256.png');
  let appIcon = null;

  try {
    if (fs.existsSync(appIconPath)) {
      appIcon = nativeImage.createFromPath(appIconPath);
      console.log('✅ App icon loaded successfully');
    } else {
      console.warn('⚠️ App icon not found at:', appIconPath);
    }
  } catch (error) {
    console.error('❌ Error loading app icon:', error);
  }

  // ✅ Restaurer l'état de la fenêtre sauvegardé
  let savedState = null;
  if (newConfigService) {
    try {
      savedState = await newConfigService.get('windowState');
      if (savedState) {
        console.log('💾 Found saved window state:', savedState);
      }
    } catch (error) {
      console.error('❌ Error loading window state:', error);
    }
  }

  // ✅ Déterminer la taille et position initiale
  let initialBounds;
  const screen = require('electron').screen;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const screenBounds = { width: screenWidth, height: screenHeight };

  // ✅ Restaurer l'état précédent si disponible et valide
  if (savedState && savedState.lastMode) {
    windowState.lastMode = savedState.lastMode;
    windowState.isMinimalist = savedState.lastMode === 'minimalist';

    if (savedState.normalBounds) {
      windowState.normalBounds = savedState.normalBounds;
    }
    if (savedState.minimalistBounds) {
      // ✅ Normaliser les bounds sauvegardées pour utiliser les dimensions de CONFIG
      windowState.minimalistBounds = {
        x: savedState.minimalistBounds.x,
        y: savedState.minimalistBounds.y,
        width: CONFIG.minimalistWidth,
        height: CONFIG.minimalistHeight
      };
    }

    console.log(`🔄 Restoring last mode: ${windowState.lastMode}`);
  } else {
    windowState.isMinimalist = false;
    windowState.lastMode = 'normal';
    console.log('🚀 Starting in default normal mode');
  }

  // ✅ Déterminer les bounds initiales selon le mode
  if (windowState.isMinimalist && windowState.minimalistBounds) {
    // Mode minimaliste avec position sauvegardée
    // ✅ TOUJOURS utiliser les dimensions de CONFIG pour la validation ET l'ajustement
    const normalizedBounds = {
      x: windowState.minimalistBounds.x,
      y: windowState.minimalistBounds.y,
      width: CONFIG.minimalistWidth,
      height: CONFIG.minimalistHeight
    };

    if (areBoundsVisible(normalizedBounds, screenBounds)) {
      initialBounds = normalizedBounds;
      console.log('✅ Using saved minimalist bounds (normalized)');
    } else {
      // Position sauvegardée invalide, ajuster
      initialBounds = adjustBoundsToScreen(normalizedBounds, screenBounds);
      console.log('⚠️ Adjusted minimalist bounds to screen');
    }
  } else if (!windowState.isMinimalist && windowState.normalBounds) {
    // Mode normal avec position sauvegardée
    if (areBoundsVisible(windowState.normalBounds, screenBounds)) {
      initialBounds = windowState.normalBounds;
      console.log('✅ Using saved normal bounds');
    } else {
      // Position sauvegardée invalide, utiliser défaut centré
      initialBounds = {
        x: Math.floor((screenWidth - CONFIG.windowWidth) / 2),
        y: Math.floor((screenHeight - CONFIG.windowHeight) / 2),
        width: CONFIG.windowWidth,
        height: CONFIG.windowHeight
      };
      console.log('⚠️ Using default centered bounds (saved was off-screen)');
    }
  } else {
    // Pas de position sauvegardée, utiliser défaut selon le mode
    if (windowState.isMinimalist) {
      // Position par défaut minimaliste (coin bas-droit avec marge généreuse)
      const marginRight = 120;
      const marginBottom = 80;
      initialBounds = {
        x: screenWidth - CONFIG.minimalistWidth - marginRight,
        y: screenHeight - CONFIG.minimalistHeight - marginBottom,
        width: CONFIG.minimalistWidth,
        height: CONFIG.minimalistHeight
      };

      // ✅ Double vérification de sécurité
      initialBounds = adjustBoundsToScreen(initialBounds, screenBounds, 80);
      console.log('🎯 Using default minimalist position (safe)');
    } else {
      // Position par défaut normale (centrée)
      initialBounds = {
        x: Math.floor((screenWidth - CONFIG.windowWidth) / 2),
        y: Math.floor((screenHeight - CONFIG.windowHeight) / 2),
        width: CONFIG.windowWidth,
        height: CONFIG.windowHeight
      };
      console.log('🎯 Using default normal position');
    }
  }

  // ✅ Créer la fenêtre avec les contraintes appropriées selon le mode
  const windowOptions = {
    ...initialBounds,
    resizable: true,
    webPreferences,
    icon: appIcon,
    frame: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    transparent: false,
    backgroundColor: '#ffffff',
    shadow: true,
    hasShadow: true,
    ...(process.platform === 'darwin' && {
      vibrancy: 'under-window',
      visualEffectState: 'active'
    }),
    ...(process.platform === 'win32' && {
      roundedCorners: true
    })
  };

  // ✅ Définir les contraintes de taille selon le mode initial
  if (windowState.isMinimalist) {
    windowOptions.minWidth = 200;
    windowOptions.minHeight = 350;
    windowOptions.maxWidth = 350;
    windowOptions.maxHeight = screenHeight;
  } else {
    windowOptions.minWidth = CONFIG.windowMinWidth;
    windowOptions.minHeight = CONFIG.windowMinHeight;
    windowOptions.maxWidth = screenWidth;
    windowOptions.maxHeight = screenHeight;
  }

  mainWindow = new BrowserWindow(windowOptions);

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
    console.log('📁 __dirname:', __dirname);
    console.log('📁 Checking if file exists:', require('fs').existsSync(CONFIG.prodServerPath));

    // Fallback si le fichier n'existe pas
    if (!require('fs').existsSync(CONFIG.prodServerPath)) {
      const fallbackPath = path.join(__dirname, '../../src/react/dist/index.html');
      console.log('🔄 Trying fallback path:', fallbackPath);
      if (require('fs').existsSync(fallbackPath)) {
        mainWindow.loadFile(fallbackPath);
      } else {
        console.error('❌ No HTML file found! App will not display.');
        // Créer une page d'erreur simple
        mainWindow.loadURL('data:text/html,<h1>Error: Frontend not found</h1><p>Path: ' + CONFIG.prodServerPath + '</p>');
      }
    } else {
      mainWindow.loadFile(CONFIG.prodServerPath);
    }
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
  mainWindow.on('close', async (event) => {
    if (!isQuitting) {
      event.preventDefault();

      // ✅ Sauvegarder l'état actuel avant de fermer
      await saveCurrentWindowState();

      mainWindow.hide();

      // Show tray notification
      const trayNotificationShown = await newConfigService?.get('trayNotificationShown');
      if (!trayNotificationShown) {
        new Notification({
          title: 'Notion Clipper Pro',
          body: "L'application continue en arrière-plan. Utilisez l'icône système pour quitter."
        }).show();
        await newConfigService?.set('trayNotificationShown', true);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ✅ Sauvegarder automatiquement la position lors des changements
  let saveTimeout = null;

  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      await saveCurrentWindowState();
    }, 1000); // Attendre 1 seconde après le dernier changement
  };

  mainWindow.on('moved', debouncedSave);
  mainWindow.on('resized', debouncedSave);
}

// ============================================
// TRAY ICON
// ============================================
function createTray() {
  // ✅ Utiliser les nouvelles icônes générées
  const fs = require('fs');
  let trayIcon;

  if (process.platform === 'darwin') {
    // macOS - utiliser l'icône monochrome
    const monoPath = path.join(__dirname, '../../assets/icons/tray-icon-mono-16.png');

    if (fs.existsSync(monoPath)) {
      trayIcon = nativeImage.createFromPath(monoPath);
      console.log('✅ Tray icon (monochrome) loaded for macOS');
    } else {
      console.error('❌ Tray icon not found for macOS!');
      return;
    }
  } else {
    // Windows/Linux - utiliser l'icône colorée
    const colorPath = path.join(__dirname, '../../assets/icons/tray-icon-16.png');

    if (fs.existsSync(colorPath)) {
      trayIcon = nativeImage.createFromPath(colorPath);
      console.log('✅ Tray icon (color) loaded for Windows/Linux');
    } else {
      console.error('❌ Tray icon not found for Windows/Linux!');
      return;
    }
  }

  if (trayIcon.isEmpty()) {
    console.error('❌ Tray icon is empty!');
    return;
  }

  tray = new Tray(trayIcon);

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
            text: typeof content === 'string' ? content : content?.data || '',  // ✅ Utiliser content.data
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
// WINDOW STATE MANAGEMENT
// ============================================
async function saveCurrentWindowState() {
  if (!mainWindow || !newConfigService) return;

  try {
    // ✅ NE PAS sauvegarder si maximisée
    if (mainWindow.isMaximized()) {
      console.log('⚠️ Window is maximized - not saving bounds');
      return;
    }

    const currentBounds = mainWindow.getBounds();

    // ✅ Mettre à jour l'état selon le mode actuel avec normalisation des tailles
    if (windowState.isMinimalist) {
      // ✅ Pour le mode minimaliste, sauvegarder SEULEMENT la position, pas la taille
      windowState.minimalistBounds = {
        x: currentBounds.x,
        y: currentBounds.y,
        width: CONFIG.minimalistWidth,  // Toujours utiliser la taille de CONFIG
        height: CONFIG.minimalistHeight
      };
    } else {
      // ✅ Pour le mode normal, sauvegarder la taille réelle
      windowState.normalBounds = currentBounds;
    }

    // ✅ Sauvegarder l'état complet
    const stateToSave = {
      isMinimalist: windowState.isMinimalist,
      normalBounds: windowState.normalBounds,
      minimalistBounds: windowState.minimalistBounds,
      lastMode: windowState.lastMode
    };

    await newConfigService.set('windowState', stateToSave);
    console.log('💾 Window state saved:', stateToSave);
  } catch (error) {
    console.error('❌ Error saving window state:', error);
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
    registerWindowIPC();
    // 🆕 Nouveaux handlers
    registerFileHandlers();
    registerHistoryHandlers();
    registerQueueHandlers();

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

    // ✅ Gestion du mode minimaliste
    ipcMain.handle('window-toggle-minimalist', async (event, isMinimalist) => {
      if (!mainWindow) return;

      try {
        const screen = require('electron').screen;
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const screenBounds = { width: screenWidth, height: screenHeight };

        if (isMinimalist) {
          // Passer en mode minimaliste
          console.log('🔄 Switching to minimalist mode');

          // ✅ Sauvegarder la position actuelle SEULEMENT si pas maximisée
          if (!mainWindow.isMaximized()) {
            windowState.normalBounds = mainWindow.getBounds();
          } else {
            // Si maximisée, unmaximize d'abord et utiliser la taille par défaut
            mainWindow.unmaximize();
            windowState.normalBounds = {
              x: Math.floor((screenWidth - CONFIG.windowWidth) / 2),
              y: Math.floor((screenHeight - CONFIG.windowHeight) / 2),
              width: CONFIG.windowWidth,
              height: CONFIG.windowHeight
            };
          }
          windowState.lastMode = 'minimalist';

          // ✅ Déterminer les bounds cibles pour le mode minimaliste
          let targetBounds = null;

          if (windowState.minimalistBounds) {
            // ✅ TOUJOURS utiliser les dimensions de CONFIG pour cohérence
            const normalizedBounds = {
              x: windowState.minimalistBounds.x,
              y: windowState.minimalistBounds.y,
              width: CONFIG.minimalistWidth,
              height: CONFIG.minimalistHeight
            };

            // ✅ Valider et ajuster si nécessaire
            if (areBoundsVisible(normalizedBounds, screenBounds)) {
              targetBounds = normalizedBounds;
              console.log('✅ Using saved minimalist bounds (normalized)');
            } else {
              targetBounds = adjustBoundsToScreen(normalizedBounds, screenBounds);
              console.log('⚠️ Adjusted saved minimalist bounds to screen');
            }
          } else {
            // ✅ Position par défaut : coin bas-droit avec marge de sécurité TRÈS généreuse
            const marginRight = 120;  // Marge encore plus grande
            const marginBottom = 80;  // Marge encore plus grande
            targetBounds = {
              x: screenWidth - CONFIG.minimalistWidth - marginRight,
              y: screenHeight - CONFIG.minimalistHeight - marginBottom,
              width: CONFIG.minimalistWidth,
              height: CONFIG.minimalistHeight
            };

            // ✅ Double vérification de sécurité
            targetBounds = adjustBoundsToScreen(targetBounds, screenBounds, 80);
            console.log('🎯 Using default minimalist position (safe)');
          }

          console.log('📐 Setting minimalist bounds:', targetBounds);

          // ✅ Appliquer les bounds et contraintes
          mainWindow.setBounds(targetBounds, true);
          mainWindow.setMinimumSize(200, 350);
          mainWindow.setMaximumSize(350, screenHeight);

          windowState.isMinimalist = true;

        } else {
          // Revenir en mode normal
          console.log('🔄 Switching to normal mode');

          // ✅ Sauvegarder la position minimaliste actuelle
          const currentBounds = mainWindow.getBounds();
          windowState.minimalistBounds = {
            x: currentBounds.x,
            y: currentBounds.y,
            width: CONFIG.minimalistWidth,
            height: CONFIG.minimalistHeight
          };

          console.log('Saved minimalist position:', windowState.minimalistBounds);

          windowState.lastMode = 'normal';

          // ✅ Retirer les contraintes de taille
          mainWindow.setMinimumSize(CONFIG.windowMinWidth, CONFIG.windowMinHeight);
          mainWindow.setMaximumSize(screenWidth, screenHeight);

          // ✅ Déterminer les bounds pour le mode normal
          let targetBounds = null;

          if (windowState.normalBounds && areBoundsVisible(windowState.normalBounds, screenBounds)) {
            targetBounds = windowState.normalBounds;
            console.log('✅ Using saved normal bounds');
          } else {
            // Position par défaut centrée
            targetBounds = {
              x: Math.floor((screenWidth - CONFIG.windowWidth) / 2),
              y: Math.floor((screenHeight - CONFIG.windowHeight) / 2),
              width: CONFIG.windowWidth,
              height: CONFIG.windowHeight
            };
            console.log('🎯 Using default centered position');
          }

          // ✅ S'assurer que la fenêtre n'est pas maximisée
          if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
          }

          mainWindow.setBounds(targetBounds, true);
          windowState.isMinimalist = false;
        }

        // ✅ Sauvegarder l'état complet
        await saveCurrentWindowState();

        return true;
      } catch (error) {
        console.error('❌ Error toggling minimalist mode:', error);
        return false;
      }
    });

    // ✅ Sauvegarder la position de la fenêtre
    ipcMain.handle('window-save-position', async () => {
      await saveCurrentWindowState();
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