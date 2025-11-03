// apps/notion-clipper-app/src/electron/main.ts
// 🎯 VERSION OPTIMISÉE - Gestion robuste des fenêtres et du mode minimaliste

// Charger les variables d'environnement depuis la racine du monorepo
import * as path from 'path';
// Load .env from monorepo root
import * as dotenv from 'dotenv';
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

import { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, dialog, ipcMain, screen as electronScreen, shell } from 'electron';

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
import { ConfigService } from '@notion-clipper/core-shared';
import {
  ElectronNotionService,
  ElectronClipboardService,
  ElectronPollingService,
  ElectronSuggestionService,
  ElectronStatsService,
  ElectronParserService,
  ElectronFileService,
  ElectronHistoryService,
  ElectronQueueService
} from '@notion-clipper/core-electron';

// Adapters
import {
  ElectronStorageAdapter,
  ElectronConfigAdapter,
  ElectronClipboardAdapter,
  ElectronNotionAPIAdapter,
  ElectronCacheAdapter,
  ElectronStatsAdapter,
  ElectronFileAdapter
} from '@notion-clipper/adapters-electron';

// OAuth Server
import { LocalOAuthServer } from './services/oauth-server';

import { FocusModeService } from '@notion-clipper/core-electron';
import { FloatingBubbleWindow } from './windows/FloatingBubble';
import { setupFocusModeIPC } from './ipc/focus-mode.ipc';

// Services instances
let newConfigService: ConfigService | null = null;
let newNotionService: ElectronNotionService | null = null;
let newClipboardService: ElectronClipboardService | null = null;
let newPollingService: ElectronPollingService | null = null;
let newSuggestionService: ElectronSuggestionService | null = null;
let newStatsService: ElectronStatsService | null = null;
let newParserService: ElectronParserService | null = null;
let newCacheService: ElectronCacheAdapter | null = null;
let newFileService: ElectronFileService | null = null;
let newHistoryService: ElectronHistoryService | null = null;
let newQueueService: ElectronQueueService | null = null;
let oauthServer: LocalOAuthServer | null = null;

// Adapters globaux pour file.ipc.ts
let notionAPI: ElectronNotionAPIAdapter | null = null;
let cache: ElectronCacheAdapter | null = null;

let focusModeService: FocusModeService | null = null;
let floatingBubble: FloatingBubbleWindow | null = null;

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
  get newQueueService() { return newQueueService; },
  get oauthServer() { return oauthServer; },
  get notionAPI() { return notionAPI; },
  get cache() { return cache; },
  get focusModeService() { return focusModeService; },
  get floatingBubble() { return floatingBubble; },
  reinitializeNotionService
};


// IPC Handlers
import registerNotionIPC from './ipc/notion.ipc';
import registerClipboardIPC from './ipc/clipboard.ipc';
import registerConfigIPC from './ipc/config.ipc';
import registerContentIPC from './ipc/content.ipc';
import registerPageIPC from './ipc/page.ipc';
import registerEventsIPC from './ipc/events.ipc';
import registerWindowIPC from './ipc/window.ipc';
import { setupHistoryIPC } from './ipc/history.ipc';
import { setupQueueIPC } from './ipc/queue.ipc';
import { setupCacheIPC } from './ipc/cache.ipc';
import { setupSuggestionIPC } from './ipc/suggestion.ipc';
import { setupFileIPC } from './ipc/file.ipc';
// OAuth handlers removed - using direct IPC in notion.ipc.js
import { setupMultiWorkspaceInternalHandlers } from './ipc/multi-workspace-internal.ipc';

// Window and Tray
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
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
  // Utiliser une marge plus petite pour la validation (5px au lieu de 20px)
  // Cela permet de restaurer des fenêtres qui sont légèrement hors écran
  const validationMargin = 5;

  const rightEdge = bounds.x + bounds.width;
  const bottomEdge = bounds.y + bounds.height;

  const isVisible = (
    bounds.x >= screen.x - validationMargin &&
    bounds.y >= screen.y - validationMargin &&
    rightEdge <= screen.x + screen.width + validationMargin &&
    bottomEdge <= screen.y + screen.height + validationMargin &&
    bounds.width > 0 &&
    bounds.height > 0
  );

  if (!isVisible) {
    console.log('🔍 Bounds validation failed:', {
      bounds,
      screen,
      rightEdge,
      bottomEdge,
      requiredMaxRight: screen.x + screen.width + validationMargin,
      requiredMaxBottom: screen.y + screen.height + validationMargin
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
        isMinimalist: (savedState as any)?.lastMode === 'minimalist',
        lastMode: (savedState as any)?.lastMode || 'normal',
        normalBounds: (savedState as any)?.normalBounds || null,
        minimalistPosition: (savedState as any)?.minimalistPosition || null
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
        // Using saved normal bounds
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
  let appIcon = null;

  // __dirname pointe vers dist/ après compilation
  // Utiliser les assets directement depuis le dossier source
  const assetsPath = path.join(__dirname, '../assets/icons');
  console.log('🔍 Looking for icons in:', assetsPath);

  // Essayer différents chemins d'icône selon la plateforme
  const iconPaths = process.platform === 'win32'
    ? [
      path.join(assetsPath, 'app.ico'),
      path.join(assetsPath, 'app-icon-256.png'),
      path.join(assetsPath, 'app-icon-128.png')
    ]
    : process.platform === 'darwin'
      ? [
        path.join(assetsPath, 'app.icns'),
        path.join(assetsPath, 'app-icon-512.png'),
        path.join(assetsPath, 'app-icon-256.png')
      ]
      : [
        path.join(assetsPath, 'app-icon-256.png'),
        path.join(assetsPath, 'app-icon-128.png')
      ];

  for (const iconPath of iconPaths) {
    try {
      if (fs.existsSync(iconPath)) {
        appIcon = nativeImage.createFromPath(iconPath);
        if (!appIcon.isEmpty()) {
          console.log('✅ App icon loaded successfully:', iconPath);
          console.log('   Icon size:', appIcon.getSize());
          break;
        } else {
          console.warn('⚠️ Icon loaded but is empty:', iconPath);
          appIcon = null;
        }
      } else {
        console.log('⚠️ Icon not found:', iconPath);
      }
    } catch (error) {
      console.warn('⚠️ Could not load icon:', iconPath, error);
    }
  }

  if (!appIcon) {
    console.error('❌ No app icon could be loaded');
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
      // Using saved normal bounds
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
      webSecurity: true,
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

  // Définir explicitement l'icône après la création (important pour Windows)
  if (appIcon && process.platform === 'win32') {
    mainWindow.setIcon(appIcon);
    // Définir aussi l'icône overlay pour la barre des tâches
    mainWindow.setOverlayIcon(appIcon, 'Notion Clipper Pro');
    console.log('✅ Window icon and overlay icon set for Windows');
  }

  // Security headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'X-Frame-Options': ['DENY'],
        'X-Content-Type-Options': ['nosniff'],
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' http://localhost:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* ws://localhost:* https://api.notion.com; font-src 'self' data: https://fonts.gstatic.com;"
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
    // Window ready to show
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
  const fs = require('fs');
  const assetsPath = path.join(__dirname, '../assets/icons');

  // Utiliser les icônes mono pour macOS (Template) et les icônes normales pour Windows/Linux
  const trayIconPath = process.platform === 'darwin'
    ? path.join(assetsPath, 'tray-icon-mono-32.png')
    : path.join(assetsPath, 'tray-icon-32.png');

  console.log('🔍 Looking for tray icon:', trayIconPath);

  try {
    if (!fs.existsSync(trayIconPath)) {
      console.error('❌ Tray icon not found:', trayIconPath);
      // Fallback vers une icône alternative
      const fallbackPath = path.join(assetsPath, 'app-icon-32.png');
      console.log('🔍 Trying fallback icon:', fallbackPath);

      if (fs.existsSync(fallbackPath)) {
        const trayIcon = nativeImage.createFromPath(fallbackPath);
        tray = new Tray(trayIcon);
        console.log('✅ Tray created with fallback icon');
      } else {
        console.error('❌ No tray icon available');
        return;
      }
    } else {
      const trayIcon = nativeImage.createFromPath(trayIconPath);
      tray = new Tray(trayIcon);
      console.log('✅ Tray icon loaded successfully');
    }

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

// ============================================
// 🎯 RACCOURCIS GLOBAUX - VERSION AMÉLIORÉE
// ============================================
function registerShortcuts() {
  try {
    console.log('⌨️  Registering global shortcuts...');

    // Raccourci global pour afficher/masquer OU quick send (Ctrl+Shift+C)
    const registered = globalShortcut.register('CommandOrControl+Shift+C', async () => {
      console.log('[SHORTCUT] CommandOrControl+Shift+C pressed');

      // 🎯 PRIORITÉ 1: MODE FOCUS ACTIF = QUICK SEND
      if (focusModeService && focusModeService.isEnabled()) {
        console.log('[SHORTCUT] Focus Mode active - Triggering quick send');

        try {
          // Afficher l'état "sending" sur la bulle
          if (floatingBubble && floatingBubble.isVisible()) {
            floatingBubble.updateState('sending');
          }

          // Récupérer le contenu du presse-papiers
          if (!newClipboardService) {
            throw new Error('Clipboard service not available');
          }

          const clipboardData = await newClipboardService.getContent();
          if (!clipboardData || !clipboardData.data) {
            console.log('[SHORTCUT] No content in clipboard');

            // Afficher erreur sur la bulle
            if (floatingBubble) {
              floatingBubble.updateState('error');
              setTimeout(() => {
                if (floatingBubble && floatingBubble.isVisible()) {
                  floatingBubble.updateState('active');
                }
              }, 2000);
            }

            // Notification système
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('notification', {
                type: 'error',
                title: 'Presse-papiers vide',
                message: 'Copiez du contenu avant d\'utiliser le quick send',
                duration: 3000
              });
            }
            return;
          }

          // Récupérer la page active du Mode Focus
          const state = focusModeService.getState();
          if (!state.activePageId) {
            throw new Error('No active page in Focus Mode');
          }

          // Envoyer vers Notion
          console.log('[SHORTCUT] Sending content to page:', state.activePageTitle);
          const result = await newNotionService.sendToNotion({
            pageId: state.activePageId,
            content: clipboardData
          });

          if (result?.success) {
            console.log('[SHORTCUT] ✅ Quick send successful');

            // Enregistrer le clip dans Focus Mode
            focusModeService.recordClip();

            // Mettre à jour la bulle
            if (floatingBubble) {
              floatingBubble.notifyClipSent();
              floatingBubble.updateCounter(focusModeService.getState().clipsSentCount);

              // Animation success
              floatingBubble.updateState('success');
              setTimeout(() => {
                if (floatingBubble && floatingBubble.isVisible()) {
                  floatingBubble.updateState('active');
                }
              }, 2000);
            }

            // Notification système de succès
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('notification', {
                type: 'success',
                title: 'Envoyé !',
                message: `Clip envoyé vers "${state.activePageTitle}"`,
                duration: 2000
              });
            }

            // Mettre à jour les stats
            if (newStatsService) {
              await newStatsService.incrementClips();
            }
          } else {
            throw new Error(result?.error || 'Send failed');
          }
        } catch (error) {
          console.error('[SHORTCUT] ❌ Quick send error:', error);

          // Afficher erreur sur la bulle
          if (floatingBubble) {
            floatingBubble.updateState('error');
            setTimeout(() => {
              if (floatingBubble && floatingBubble.isVisible()) {
                floatingBubble.updateState('active');
              }
            }, 2000);
          }

          // Notification d'erreur
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('notification', {
              type: 'error',
              title: 'Erreur d\'envoi',
              message: error instanceof Error ? error.message : 'Échec de l\'envoi',
              duration: 4000
            });
          }
        }
        return; // Sortir ici pour éviter le comportement normal
      }

      // 🎯 PRIORITÉ 2: COMPORTEMENT NORMAL = TOGGLE FENÊTRE
      if (!mainWindow) {
        console.error('[SHORTCUT] Main window not available');
        return;
      }

      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        console.log('[SHORTCUT] Hiding window');
        mainWindow.hide();
      } else {
        console.log('[SHORTCUT] Showing window');
        mainWindow.show();
        mainWindow.focus();

        // Si minimisé, restaurer
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
      }
    });

    if (registered) {
      // Global shortcut registered
    } else {
      console.error('❌ Failed to register global shortcut');
    }
  } catch (error) {
    console.error('❌ Error registering shortcuts:', error);
  }
}

// ============================================
// 🎯 SERVICES INITIALIZATION
// ============================================

async function initializeNewServices() {
  try {
    // 1. CONFIG (core-shared + adapter)
    const configAdapter = new ElectronConfigAdapter();
    newConfigService = new ConfigService(configAdapter);

    // 2. CACHE (core-electron + adapter)
    const cacheAdapter = new ElectronCacheAdapter();
    newCacheService = cacheAdapter;

    // 3. STATS (core-electron + adapter)
    const statsAdapter = new ElectronStatsAdapter();
    newStatsService = new ElectronStatsService(statsAdapter);

    // 4. HISTORY SERVICE
    const historyStorage = new ElectronStorageAdapter();
    newHistoryService = new ElectronHistoryService(historyStorage);

    // 5. NOTION (core-electron + adapter)
    notionAPI = new ElectronNotionAPIAdapter();
    cache = newCacheService;
    const notionToken = await newConfigService.getNotionToken();

    if (notionToken) {
      newNotionService = new ElectronNotionService(notionAPI, cache);
      await newNotionService.setToken(notionToken);

    } else {
      console.log('⚠️ NotionService waiting for token');
    }

    // 6. CLIPBOARD (core-electron + adapter)
    const clipboardAdapter = new ElectronClipboardAdapter();
    newClipboardService = new ElectronClipboardService(clipboardAdapter);

    // 7. POLLING (core-electron, utilise NotionService)
    if (newNotionService) {
      newPollingService = new ElectronPollingService(newNotionService, undefined, 300000); // 5 minutes
    }

    // 8. SUGGESTION SERVICE
    if (newNotionService) {
      newSuggestionService = new ElectronSuggestionService(newNotionService);
      // Injecter le service de suggestions dans le service Notion
      newNotionService.setSuggestionService(newSuggestionService);
    }

    // 9. PARSER SERVICE
    newParserService = new ElectronParserService();

    // 10. FILE SERVICE
    if (notionToken && newNotionService && notionAPI) {
      newFileService = new ElectronFileService(notionAPI, cache, notionToken);
    }

    // 11. QUEUE SERVICE
    if (newNotionService && newHistoryService) {
      const queueStorage = new ElectronStorageAdapter();
      newQueueService = new ElectronQueueService(queueStorage, newNotionService, newHistoryService);
    }

    // 12. OAUTH SERVER
    oauthServer = new LocalOAuthServer();
    await oauthServer.start();

    // 13. FOCUS MODE SERVICE
    focusModeService = new FocusModeService({
      autoEnableThreshold: 3,
      sessionTimeoutMinutes: 30,
      showNotifications: true,
      bubblePosition: { x: -1, y: -1 }
    });

    // Écouter les événements du FocusMode
    focusModeService.on('focus-mode:enabled', (data) => {
      console.log('[FocusMode] Enabled:', data);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('focus-mode:enabled', data);
      }
    });

    focusModeService.on('focus-mode:disabled', (stats) => {
      console.log('[FocusMode] Disabled:', stats);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('focus-mode:disabled', stats);
      }
    });

    focusModeService.on('focus-mode:clip-sent', (data) => {
      console.log('[FocusMode] Clip sent:', data);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('focus-mode:clip-sent', data);
      }
    });

    focusModeService.on('focus-mode:notification', (notification) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('notification', notification);
      }
    });

    // 14. FLOATING BUBBLE WINDOW
    floatingBubble = new FloatingBubbleWindow();

    console.log('🎯 Electron app ready');
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
    // 🚨 EARLY REGISTRATION: Handler open-external en priorité
    ipcMain.handle('open-external', async (event, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error('❌ Error opening external URL:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // 🚨 EARLY REGISTRATION: Handler window-toggle-minimalist en priorité
    ipcMain.handle('window-toggle-minimalist', async (event, enable) => {
      try {
        if (!mainWindow) {
          return { success: false, error: 'Main window not available' };
        }
        return await toggleMinimalistMode(enable);
      } catch (error) {
        console.error('❌ Error toggling minimalist mode:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // 🚨 EARLY REGISTRATION: Autres handlers de fenêtre critiques
    ipcMain.handle('window-save-position', async () => {
      try {
        await saveWindowState();
        return true;
      } catch (error) {
        console.error('❌ Error saving window position:', error);
        return false;
      }
    });

    // 🚨 EARLY REGISTRATION: Handler services-status pour diagnostics
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

    // Handlers existants
    registerNotionIPC();
    registerClipboardIPC();
    registerConfigIPC({ newConfigService });
    registerContentIPC();
    registerPageIPC();
    registerEventsIPC();
    registerWindowIPC();

    // Nouveaux handlers
    setupHistoryIPC();
    setupQueueIPC();
    setupCacheIPC();
    setupSuggestionIPC();
    setupFileIPC();
    setupFocusModeIPC();

    // OAuth handlers integrated in notion.ipc.js

    // 🆕 Multi-workspace internal handlers
    setupMultiWorkspaceInternalHandlers();

    // 📊 Handlers pour les statistiques
    ipcMain.handle('stats:get', async () => {
      try {
        if (!newStatsService) {
          return { success: false, error: 'Stats service not available' };
        }
        const stats = await newStatsService.getAll();
        return { success: true, stats };
      } catch (error: any) {
        console.error('❌ Error getting stats:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('stats:reset', async () => {
      try {
        if (!newStatsService) {
          return { success: false, error: 'Stats service not available' };
        }
        const success = await newStatsService.reset();
        return { success };
      } catch (error: any) {
        console.error('❌ Error resetting stats:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('stats:get-summary', async () => {
      try {
        if (!newStatsService) {
          return { success: false, error: 'Stats service not available' };
        }
        const summary = await newStatsService.getSummary();
        return { success: true, summary };
      } catch (error: any) {
        console.error('❌ Error getting stats summary:', error);
        return { success: false, error: error.message };
      }
    });

    // IPC handlers registered silently
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
      // Clipboard monitoring started

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
      // Polling service started
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
  // Nettoyer le mode focus
  if (focusModeService) {
    focusModeService.destroy();
    focusModeService = null;
  }
  
  if (floatingBubble) {
    floatingBubble.destroy();
    floatingBubble = null;
  }
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================
// 🔄 FONCTION DE RÉINITIALISATION NOTION SERVICE
// ============================================

function reinitializeNotionService(token) {
  try {
    console.log('[MAIN] 🔄 Reinitializing NotionService with new token...');

    if (!token) {
      console.error('[MAIN] ❌ No token provided for reinitialization');
      return false;
    }

    // Créer un nouveau service Notion avec le token
    notionAPI = new ElectronNotionAPIAdapter();
    newNotionService = new ElectronNotionService(notionAPI, cache);

    // Définir le token
    newNotionService.setToken(token);

    console.log('[MAIN] ✅ NotionService reinitialized');

    // Réinitialiser le FileService avec le nouveau token
    if (notionAPI && cache) {
      newFileService = new ElectronFileService(notionAPI, cache, token);
      console.log('[MAIN] ✅ FileService reinitialized');
    }

    console.log('[MAIN] ✅ NotionService reinitialized successfully');
    return true;
  } catch (error) {
    console.error('[MAIN] ❌ Error reinitializing NotionService:', error);
    return false;
  }
}