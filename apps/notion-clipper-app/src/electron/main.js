// apps/notion-clipper-app/src/electron/main.js
// 🎯 VERSION OPTIMISÉE - Gestion robuste des fenêtres et du mode minimaliste

// Charger les variables d'environnement depuis la racine du monorepo
const path = require('path');
// __dirname = .../apps/notion-clipper-app/src/electron
// Donc on remonte de 4 niveaux pour atteindre la racine
const envPath = path.resolve(__dirname, '../../../../.env');
console.log('🔍 Loading .env from:', envPath);
const dotenvResult = require('dotenv').config({ path: envPath });
if (dotenvResult.error) {
  console.error('❌ Error loading .env:', dotenvResult.error);
} else {
  console.log('✅ Loaded .env variables:', Object.keys(dotenvResult.parsed || {}));
  console.log('🔑 NOTION_CLIENT_ID:', process.env.NOTION_CLIENT_ID ? 'présent' : 'MANQUANT');
  console.log('🔑 NOTION_CLIENT_SECRET:', process.env.NOTION_CLIENT_SECRET ? 'présent' : 'MANQUANT');
}

const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, dialog, ipcMain, screen: electronScreen, shell } = require('electron');

// Configurer le protocole personnalisé pour ouvrir l'app depuis le navigateur
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('notion-clipper', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('notion-clipper');
}
const isDev = !app.isPackaged;

// ============================================
// SERVICES & ADAPTERS (Nouvelle architecture)
// ============================================
const { ConfigService } = require('@notion-clipper/core-shared');
const { ElectronNotionService } = require('@notion-clipper/core-electron');
const { ElectronClipboardService } = require('@notion-clipper/core-electron');
const { ElectronPollingService } = require('@notion-clipper/core-electron');
const { ElectronSuggestionService } = require('@notion-clipper/core-electron');
const { ElectronStatsService } = require('@notion-clipper/core-electron');
const { ElectronParserService } = require('@notion-clipper/core-electron');
const { ElectronFileService } = require('@notion-clipper/core-electron');
const { ElectronHistoryService } = require('@notion-clipper/core-electron');
const { ElectronQueueService } = require('@notion-clipper/core-electron');

// Adapters
const { ElectronStorageAdapter } = require('@notion-clipper/adapters-electron');
const { ElectronConfigAdapter } = require('@notion-clipper/adapters-electron');
const { ElectronClipboardAdapter } = require('@notion-clipper/adapters-electron');
const { ElectronNotionAPIAdapter } = require('@notion-clipper/adapters-electron');
const { ElectronCacheAdapter } = require('@notion-clipper/adapters-electron');
const { ElectronStatsAdapter } = require('@notion-clipper/adapters-electron');
const { ElectronFileAdapter } = require('@notion-clipper/adapters-electron');

// Services instances
let newConfigService = null;
let newNotionService = null;
let newClipboardService = null;
let newPollingService = null;
let newSuggestionService = null;
let newStatsService = null;
let newParserService = null;
let newCacheService = null;
let newFileService = null;
let newHistoryService = null;
let newQueueService = null;

// Export services for IPC handlers
module.exports = {
  get newConfigService() { return newConfigService; },
  get newNotionService() { return newNotionService; },
  set newNotionService(service) { newNotionService = service; },
  get newClipboardService() { return newClipboardService; },
  get newPollingService() { return newPollingService; },
  get newSuggestionService() { return newSuggestionService; },
  get newStatsService() { return newStatsService; },
  get newParserService() { return newParserService; },
  get newCacheService() { return newCacheService; },
  get newFileService() { return newFileService; },
  get newHistoryService() { return newHistoryService; },
  get newQueueService() { return newQueueService; }
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
const { registerFileHandlers } = require('./ipc/file.ipc');
const { registerHistoryHandlers } = require('./ipc/history.ipc');
const { registerQueueHandlers } = require('./ipc/queue.ipc');
// OAuth handlers removed - using direct IPC in notion.ipc.js
const { setupMultiWorkspaceInternalHandlers } = require('./ipc/multi-workspace-internal.ipc');

// Window and Tray
let mainWindow = null;
let tray = null;
let isQuitting = false;

// ============================================
// 🎯 CONFIGURATION ROBUSTE
// ============================================
const CONFIG = {
  devServerUrl: 'http://localhost:3000',
  prodServerPath: path.join(__dirname, '../react/dist/index.html'),

  // Mode Normal
  windowWidth: 900,
  windowHeight: 700,
  windowMinWidth: 600,
  windowMinHeight: 400,

  // Mode Minimaliste - Ultra compact
  minimalistWidth: 320,
  minimalistHeight: 480,
  minimalistMinWidth: 280,
  minimalistMinHeight: 400,
  minimalistMaxWidth: 400,

  // Marges de sécurité pour le positionnement
  screenMargin: 20, // Marge minimale par rapport aux bords de l'écran
  defaultMarginRight: 20, // Marge par défaut à droite (mode minimaliste)
  defaultMarginBottom: 80 // Marge par défaut en bas (barre des tâches)
};

// ============================================
// 🎯 ÉTAT DE LA FENÊTRE GLOBAL
// ============================================
let windowState = {
  isMinimalist: false,
  normalBounds: null,
  minimalistPosition: null, // Seulement position (x, y) - dimensions viennent de CONFIG
  lastMode: 'normal'
};

// ============================================
// 🎯 UTILITAIRES DE GESTION DES BOUNDS
// ============================================

/**
 * Obtenir les dimensions de l'écran avec zone de travail
 */
function getScreenBounds() {
  const primaryDisplay = electronScreen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x: screenX, y: screenY } = primaryDisplay.workArea;

  return {
    x: screenX,
    y: screenY,
    width,
    height
  };
}

/**
 * Valider si des bounds sont complètement visibles à l'écran
 */
function areBoundsVisible(bounds) {
  if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number' ||
    typeof bounds.width !== 'number' || typeof bounds.height !== 'number') {
    return false;
  }

  const screen = getScreenBounds();
  const margin = CONFIG.screenMargin;

  const rightEdge = bounds.x + bounds.width;
  const bottomEdge = bounds.y + bounds.height;

  const isVisible = (
    bounds.x >= screen.x + margin &&
    bounds.y >= screen.y + margin &&
    rightEdge <= screen.x + screen.width - margin &&
    bottomEdge <= screen.y + screen.height - margin &&
    bounds.width > 0 &&
    bounds.height > 0
  );

  if (!isVisible) {
    console.log('🔍 Bounds validation failed:', {
      bounds,
      screen,
      rightEdge,
      bottomEdge,
      requiredMaxRight: screen.x + screen.width - margin,
      requiredMaxBottom: screen.y + screen.height - margin
    });
  }

  return isVisible;
}

/**
 * Ajuster des bounds pour qu'elles soient complètement visibles
 */
function adjustBoundsToScreen(bounds) {
  const screen = getScreenBounds();
  const margin = CONFIG.screenMargin;

  const adjusted = { ...bounds };

  // Ajuster la largeur et hauteur si trop grandes
  const maxWidth = screen.width - (2 * margin);
  const maxHeight = screen.height - (2 * margin);

  if (adjusted.width > maxWidth) adjusted.width = maxWidth;
  if (adjusted.height > maxHeight) adjusted.height = maxHeight;

  // Ajuster la position X
  if (adjusted.x < screen.x + margin) {
    adjusted.x = screen.x + margin;
  } else if (adjusted.x + adjusted.width > screen.x + screen.width - margin) {
    adjusted.x = screen.x + screen.width - adjusted.width - margin;
  }

  // Ajuster la position Y
  if (adjusted.y < screen.y + margin) {
    adjusted.y = screen.y + margin;
  } else if (adjusted.y + adjusted.height > screen.y + screen.height - margin) {
    adjusted.y = screen.y + screen.height - adjusted.height - margin;
  }

  console.log('🔧 Bounds adjusted:', {
    original: bounds,
    adjusted,
    screen
  });

  return adjusted;
}

/**
 * Obtenir les bounds par défaut pour le mode minimaliste
 */
function getDefaultMinimalistBounds() {
  const screen = getScreenBounds();

  return {
    x: screen.x + screen.width - CONFIG.minimalistWidth - CONFIG.defaultMarginRight,
    y: screen.y + screen.height - CONFIG.minimalistHeight - CONFIG.defaultMarginBottom,
    width: CONFIG.minimalistWidth,
    height: CONFIG.minimalistHeight
  };
}

/**
 * Obtenir les bounds par défaut pour le mode normal (centré)
 */
function getDefaultNormalBounds() {
  const screen = getScreenBounds();

  return {
    x: screen.x + Math.floor((screen.width - CONFIG.windowWidth) / 2),
    y: screen.y + Math.floor((screen.height - CONFIG.windowHeight) / 2),
    width: CONFIG.windowWidth,
    height: CONFIG.windowHeight
  };
}

/**
 * Créer des bounds minimalistes à partir d'une position (x, y)
 */
function createMinimalistBounds(position) {
  return {
    x: position.x,
    y: position.y,
    width: CONFIG.minimalistWidth,
    height: CONFIG.minimalistHeight
  };
}

// ============================================
// 🎯 SAUVEGARDE ET RESTAURATION DE L'ÉTAT
// ============================================

/**
 * Sauvegarder l'état actuel de la fenêtre
 */
async function saveWindowState() {
  if (!newConfigService || !mainWindow) return;

  try {
    // Sauvegarder le mode actuel
    const stateToSave = {
      isMinimalist: windowState.isMinimalist,
      lastMode: windowState.isMinimalist ? 'minimalist' : 'normal',
      normalBounds: windowState.normalBounds,
      minimalistPosition: windowState.minimalistPosition
    };

    await newConfigService.set('windowState', stateToSave);

    console.log('💾 Window state saved:', stateToSave);
  } catch (error) {
    console.error('❌ Error saving window state:', error);
  }
}

/**
 * Restaurer l'état sauvegardé de la fenêtre
 */
async function restoreWindowState() {
  if (!newConfigService) return null;

  try {
    const savedState = await newConfigService.get('windowState');

    if (savedState) {
      console.log('💾 Found saved window state:', savedState);

      // Valider et nettoyer les données sauvegardées
      const cleanState = {
        isMinimalist: savedState.lastMode === 'minimalist',
        lastMode: savedState.lastMode || 'normal',
        normalBounds: savedState.normalBounds || null,
        minimalistPosition: savedState.minimalistPosition || null
      };

      return cleanState;
    }
  } catch (error) {
    console.error('❌ Error restoring window state:', error);
  }

  return null;
}

// ============================================
// 🎯 BASCULEMENT MODE MINIMALISTE
// ============================================

/**
 * Basculer entre mode normal et minimaliste
 */
async function toggleMinimalistMode(enable) {
  if (!mainWindow) return false;

  try {
    const screen = getScreenBounds();

    if (enable && !windowState.isMinimalist) {
      // ============================================
      // PASSER EN MODE MINIMALISTE
      // ============================================
      console.log('🔄 Switching to minimalist mode');

      // 1. Sauvegarder la position actuelle du mode normal
      if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
        windowState.normalBounds = mainWindow.getBounds();
        console.log('💾 Saved normal bounds:', windowState.normalBounds);
      }

      // 2. Déterminer les bounds pour le mode minimaliste
      let targetBounds;

      if (windowState.minimalistPosition) {
        // Utiliser la dernière position minimaliste sauvegardée
        targetBounds = createMinimalistBounds(windowState.minimalistPosition);

        // Valider et ajuster si nécessaire
        if (!areBoundsVisible(targetBounds)) {
          console.log('⚠️ Saved minimalist position off-screen, adjusting...');
          targetBounds = adjustBoundsToScreen(targetBounds);
        }
      } else {
        // Première utilisation du mode minimaliste - position par défaut
        targetBounds = getDefaultMinimalistBounds();
        targetBounds = adjustBoundsToScreen(targetBounds);
      }

      console.log('📐 Setting minimalist bounds:', targetBounds);

      // 3. Appliquer les bounds et contraintes
      mainWindow.unmaximize();
      mainWindow.setBounds(targetBounds, true);
      mainWindow.setMinimumSize(CONFIG.minimalistMinWidth, CONFIG.minimalistMinHeight);
      mainWindow.setMaximumSize(CONFIG.minimalistMaxWidth, screen.height - CONFIG.defaultMarginBottom);

      // 4. Mettre à jour l'état
      windowState.isMinimalist = true;
      windowState.lastMode = 'minimalist';

    } else if (!enable && windowState.isMinimalist) {
      // ============================================
      // PASSER EN MODE NORMAL
      // ============================================
      console.log('🔄 Switching to normal mode');

      // 1. Sauvegarder la position actuelle du mode minimaliste
      const currentBounds = mainWindow.getBounds();
      windowState.minimalistPosition = {
        x: currentBounds.x,
        y: currentBounds.y
      };
      console.log('💾 Saved minimalist position:', windowState.minimalistPosition);

      // 2. Déterminer les bounds pour le mode normal
      let targetBounds;

      if (windowState.normalBounds && areBoundsVisible(windowState.normalBounds)) {
        // Utiliser la dernière position normale sauvegardée
        targetBounds = windowState.normalBounds;
        console.log('✅ Using saved normal bounds');
      } else {
        // Position par défaut (centrée)
        targetBounds = getDefaultNormalBounds();
        console.log('🎯 Using default centered position');
      }

      // 3. Appliquer les bounds et contraintes
      mainWindow.setMinimumSize(CONFIG.windowMinWidth, CONFIG.windowMinHeight);
      mainWindow.setMaximumSize(screen.width, screen.height);
      mainWindow.setBounds(targetBounds, true);

      // 4. Mettre à jour l'état
      windowState.isMinimalist = false;
      windowState.lastMode = 'normal';
    }

    // Sauvegarder l'état complet
    await saveWindowState();

    return true;
  } catch (error) {
    console.error('❌ Error toggling minimalist mode:', error);
    return false;
  }
}

// ============================================
// 🎯 CRÉATION DE LA FENÊTRE
// ============================================

async function createWindow() {
  console.log('🪟 Creating main window...');

  // Charger l'icône de l'app
  const fs = require('fs');
  const appIconPath = path.join(__dirname, '../../assets/icons/app-icon-256.png');
  let appIcon = null;

  try {
    if (fs.existsSync(appIconPath)) {
      appIcon = nativeImage.createFromPath(appIconPath);
      console.log('✅ App icon loaded successfully');
    }
  } catch (error) {
    console.error('❌ Error loading app icon:', error);
  }

  // Restaurer l'état sauvegardé
  const savedState = await restoreWindowState();
  if (savedState) {
    windowState = savedState;
  }

  // 🔧 CORRECTION: Forcer le mode normal au démarrage pour éviter les problèmes de taille
  // L'utilisateur peut basculer en mode minimaliste après
  const forceNormalMode = true;

  // Déterminer les bounds initiales
  const screen = getScreenBounds();
  let initialBounds;

  if (!forceNormalMode && windowState.isMinimalist) {
    // Mode minimaliste (désactivé temporairement)
    if (windowState.minimalistPosition) {
      initialBounds = createMinimalistBounds(windowState.minimalistPosition);

      if (!areBoundsVisible(initialBounds)) {
        console.log('⚠️ Saved minimalist position off-screen, using default');
        initialBounds = getDefaultMinimalistBounds();
        initialBounds = adjustBoundsToScreen(initialBounds);
      }
    } else {
      initialBounds = getDefaultMinimalistBounds();
      initialBounds = adjustBoundsToScreen(initialBounds);
    }

    console.log('🎯 Starting in minimalist mode');
  } else {
    // Mode normal (toujours utilisé au démarrage)
    if (windowState.normalBounds && areBoundsVisible(windowState.normalBounds)) {
      initialBounds = windowState.normalBounds;
      console.log('✅ Using saved normal bounds');
    } else {
      initialBounds = getDefaultNormalBounds();
      console.log('🎯 Using default normal bounds');
    }

    // Forcer l'état en mode normal
    windowState.isMinimalist = false;
    windowState.lastMode = 'normal';
  }

  // Créer la fenêtre avec les options appropriées
  const windowOptions = {
    ...initialBounds,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: false,
      sandbox: true,
      webSecurity: !isDev,
      allowRunningInsecureContent: false
    },
    icon: appIcon,
    frame: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    transparent: false,
    backgroundColor: '#ffffff',
    shadow: true,
    hasShadow: true,
    show: false, // Montrer après le chargement pour éviter le flash
    ...(process.platform === 'darwin' && {
      vibrancy: 'under-window',
      visualEffectState: 'active'
    }),
    ...(process.platform === 'win32' && {
      roundedCorners: true
    })
  };

  // Définir les contraintes de taille (toujours en mode normal au démarrage)
  windowOptions.minWidth = CONFIG.windowMinWidth;
  windowOptions.minHeight = CONFIG.windowMinHeight;
  windowOptions.maxWidth = screen.width;
  windowOptions.maxHeight = screen.height;

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
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com;"
        ]
      }
    });
  });

  // Charger l'interface
  if (isDev) {
    console.log('🔧 Dev mode: Loading from dev server');
    mainWindow.loadURL(CONFIG.devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    console.log('🚀 Production mode: Loading from file');
    mainWindow.loadFile(CONFIG.prodServerPath);
  }

  // Sauvegarder automatiquement la position quand la fenêtre est déplacée/redimensionnée
  let saveBoundsTimeout;

  mainWindow.on('moved', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    clearTimeout(saveBoundsTimeout);
    saveBoundsTimeout = setTimeout(() => {
      const bounds = mainWindow.getBounds();

      if (windowState.isMinimalist) {
        windowState.minimalistPosition = { x: bounds.x, y: bounds.y };
      } else {
        windowState.normalBounds = bounds;
      }

      saveWindowState();
    }, 500); // Debounce de 500ms
  });

  mainWindow.on('resized', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    clearTimeout(saveBoundsTimeout);
    saveBoundsTimeout = setTimeout(() => {
      const bounds = mainWindow.getBounds();

      if (!windowState.isMinimalist) {
        windowState.normalBounds = bounds;
        saveWindowState();
      }
      // En mode minimaliste, on ne sauvegarde pas la taille (elle vient toujours de CONFIG)
    }, 500);
  });

  // Montrer la fenêtre quand elle est prête
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow.show();
  });

  // Gérer la fermeture
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================
// 🎯 TRAY ET MENU
// ============================================

function createTray() {
  const trayIconPath = process.platform === 'darwin'
    ? path.join(__dirname, '../../assets/icons/tray-icon-macos-Template.png')
    : path.join(__dirname, '../../assets/icons/tray-icon-color-32.png');

  try {
    const trayIcon = nativeImage.createFromPath(trayIconPath);
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

    tray.setContextMenu(contextMenu);
    tray.setToolTip('Notion Clipper Pro');

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

    console.log('✅ Tray created successfully');
  } catch (error) {
    console.error('❌ Error creating tray:', error);
  }
}

// ============================================
// 🎯 RACCOURCIS GLOBAUX
// ============================================

function registerShortcuts() {
  try {
    // Raccourci global pour afficher/masquer (Ctrl+Shift+C)
    globalShortcut.register('CommandOrControl+Shift+C', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    console.log('✅ Global shortcuts registered');
  } catch (error) {
    console.error('❌ Error registering shortcuts:', error);
  }
}

// ============================================
// 🎯 SERVICES INITIALIZATION
// ============================================

async function initializeNewServices() {
  try {
    console.log('🚀 Initializing services...');

    // 1. CONFIG (core-shared + adapter)
    const configAdapter = new ElectronConfigAdapter();
    newConfigService = new ConfigService(configAdapter);
    console.log('✅ ConfigService initialized');

    // 2. CACHE (core-electron + adapter)
    const cacheAdapter = new ElectronCacheAdapter();
    newCacheService = cacheAdapter;
    console.log('✅ CacheService initialized');

    // 3. STATS (core-electron + adapter)
    const statsAdapter = new ElectronStatsAdapter();
    newStatsService = new ElectronStatsService(statsAdapter);
    console.log('✅ StatsService initialized');

    // 4. HISTORY SERVICE
    const historyStorage = new ElectronStorageAdapter();
    newHistoryService = new ElectronHistoryService(historyStorage);
    console.log('✅ HistoryService initialized');

    // 5. NOTION (core-electron + adapter)
    const notionAdapter = new ElectronNotionAPIAdapter();
    const notionToken = await newConfigService.getNotionToken();

    if (notionToken) {
      newNotionService = new ElectronNotionService(notionAdapter, newCacheService);
      await newNotionService.setToken(notionToken);
      console.log('✅ NotionService initialized with token');
    } else {
      console.log('⚠️ NotionService waiting for token');
    }

    // 6. CLIPBOARD (core-electron + adapter)
    const clipboardAdapter = new ElectronClipboardAdapter();
    newClipboardService = new ElectronClipboardService(clipboardAdapter);
    console.log('✅ ClipboardService initialized');

    // 7. POLLING (core-electron, utilise NotionService)
    if (newNotionService) {
      newPollingService = new ElectronPollingService(newNotionService, undefined, 30000);
      console.log('✅ PollingService initialized');
    }

    // 8. SUGGESTION SERVICE
    if (newNotionService) {
      newSuggestionService = new ElectronSuggestionService(newNotionService);
      console.log('✅ SuggestionService initialized');
    }

    // 9. PARSER SERVICE
    newParserService = new ElectronParserService();
    console.log('✅ ParserService initialized');

    // 10. FILE SERVICE
    if (notionToken && newNotionService) {
      newFileService = new ElectronFileService(notionAdapter, newCacheService, notionToken);
      console.log('✅ FileService initialized');
    }

    // 11. QUEUE SERVICE
    if (newNotionService && newHistoryService) {
      const queueStorage = new ElectronStorageAdapter();
      newQueueService = new ElectronQueueService(queueStorage, newNotionService, newHistoryService);
      console.log('✅ QueueService initialized');
    }


    console.log('✅ All services initialized successfully');
    return true;

  } catch (error) {
    console.error('❌ Service initialization error:', error);

    return false;
  }
}

// ============================================
// 🎯 IPC REGISTRATION
// ============================================

function registerAllIPC() {
  try {
    console.log('📡 Registering IPC handlers...');



    // Handlers existants
    registerNotionIPC({ newConfigService, newNotionService, newCacheService });
    registerClipboardIPC({ newClipboardService });
    registerConfigIPC({ newConfigService });
    registerStatsIPC({ newStatsService });
    registerContentIPC({ newParserService });
    registerPageIPC({ newNotionService, newConfigService });
    registerSuggestionIPC({ newSuggestionService });
    registerEventsIPC({ newPollingService, newClipboardService });
    registerWindowIPC({ mainWindow });

    // Nouveaux handlers
    registerFileHandlers({ newFileService });
    registerHistoryHandlers({ newHistoryService });
    registerQueueHandlers({ newQueueService });

    // OAuth handlers integrated in notion.ipc.js

    // 🆕 Multi-workspace internal handlers
    setupMultiWorkspaceInternalHandlers();

    // 🎯 Handler pour basculer le mode minimaliste
    ipcMain.handle('window-toggle-minimalist', async (event, enable) => {
      return await toggleMinimalistMode(enable);
    });

    // Handler pour sauvegarder la position
    ipcMain.handle('window-save-position', async () => {
      await saveWindowState();
      return true;
    });

    // 🔍 Handler pour vérifier l'état des services
    ipcMain.handle('services-status', async () => {
      return {
        services: {
          config: !!newConfigService,
          notion: !!newNotionService,
          clipboard: !!newClipboardService,
          polling: !!newPollingService,
          suggestion: !!newSuggestionService,
          parser: !!newParserService,
          file: !!newFileService,
          history: !!newHistoryService,
          queue: !!newQueueService,
          cache: !!newCacheService,
          stats: !!newStatsService
        }
      };
    });

    // 🌐 Handler pour ouvrir des URLs dans le navigateur système
    ipcMain.handle('open-external', async (event, url) => {
      try {
        const { shell } = require('electron');
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error('❌ Error opening external URL:', error);
        return { success: false, error: error.message };
      }
    });

    console.log('✅ All IPC handlers registered');
  } catch (error) {
    console.error('❌ IPC registration error:', error);
  }
}

// ============================================
// 🆕 OAUTH PROTOCOL HANDLER
// ============================================

// Register custom protocol for OAuth callback
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('notionclipper', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('notionclipper');
}

// Handle OAuth callback URLs
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('🔗 Received OAuth callback URL:', url);

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol === 'notionclipper:') {
      if (parsedUrl.hostname === 'oauth') {
        const path = parsedUrl.pathname.slice(1); // Remove leading slash

        if (path === 'success') {
          const userId = parsedUrl.searchParams.get('user_id');
          const workspaceId = parsedUrl.searchParams.get('workspace_id');
          console.log('✅ OAuth success:', { userId, workspaceId });

          // Notify renderer process
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('oauth:success', { userId, workspaceId });

            // Focus and show window
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.show();
          }
        } else if (path === 'error') {
          const error = parsedUrl.searchParams.get('error');
          const message = parsedUrl.searchParams.get('message');
          console.error('❌ OAuth error:', { error, message });

          // Notify renderer process
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('oauth:error', { error, message });

            // Focus and show window
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.show();
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error parsing OAuth callback URL:', error);
  }
});

// Handle OAuth callback on Windows/Linux (via command line arguments)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }

    // Check for protocol handler (notion-clipper://)
    const protocolArg = commandLine.find(arg => arg.startsWith('notion-clipper://'));
    if (protocolArg) {
      console.log('🔗 Received protocol handler:', protocolArg);
      handleProtocolUrl(protocolArg);
    }

    // Check for OAuth callback in command line arguments (legacy)
    const oauthArg = commandLine.find(arg => arg.startsWith('notionclipper://'));
    if (oauthArg) {
      console.log('🔗 Received OAuth callback via second instance:', oauthArg);
      app.emit('open-url', event, oauthArg);
    }
  });
}

// Handle protocol URLs (notion-clipper://)
function handleProtocolUrl(url) {
  console.log('🔗 Handling protocol URL:', url);

  if (url.startsWith('notion-clipper://open')) {
    // Ouvrir/focuser la fenêtre principale
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  }
}

// Handle protocol on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

// ============================================
// 🎯 LIFECYCLE DE L'APPLICATION
// ============================================

app.whenReady().then(async () => {
  console.log('🎯 Electron app ready');

  try {
    // Initialiser les services
    const servicesReady = await initializeNewServices();
    if (!servicesReady) {
      throw new Error('Failed to initialize services');
    }

    // Enregistrer les IPC handlers
    registerAllIPC();

    // Créer l'interface
    await createWindow();
    createTray();
    registerShortcuts();

    // Démarrer les services de surveillance
    if (newClipboardService?.startWatching) {
      newClipboardService.startWatching();
      console.log('✅ Clipboard monitoring started');

      // 🔗 Connecter les événements clipboard vers React
      newClipboardService.on('changed', (content) => {
        console.log('📡 [MAIN] Clipboard content changed, notifying React...');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard:changed', content);
        }
      });
    }

    if (newPollingService) {
      newPollingService.start();
      console.log('✅ Polling service started');
    }

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});