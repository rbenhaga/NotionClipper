// apps/notion-clipper-app/src/electron/main.ts
// 🎯 VERSION OPTIMISÉE - Gestion robuste des fenêtres et du mode minimaliste

// ✅ Charger les variables d'environnement en premier
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger .env depuis la racine du projet
// 🔧 FIX: Only load .env if variables are not already set (dev-electron.js may have loaded them)
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  const envPath = path.join(__dirname, '../../.env');
  const envResult = dotenv.config({ path: envPath });

  // 🔍 DEBUG: Verify .env loaded successfully
  if (envResult.error) {
    console.error('❌ [MAIN] Failed to load .env file:', envPath, envResult.error);
  } else {
    console.log('✅ [MAIN] .env file loaded successfully from:', envPath);
  }
}

// Always log the final state of environment variables
console.log('🔍 [MAIN] SUPABASE_URL =', process.env.SUPABASE_URL ? 'present' : 'MISSING');
console.log('🔍 [MAIN] SUPABASE_ANON_KEY =', process.env.SUPABASE_ANON_KEY ? 'present' : 'MISSING');
console.log('🔍 [MAIN] TOKEN_ENCRYPTION_KEY =', process.env.TOKEN_ENCRYPTION_KEY ? 'present' : 'MISSING');

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

// 🔥 CONFIGURATION DE L'APP
app.setName('Notion Clipper Pro');
app.setAppUserModelId('com.notion-clipper.app');

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

// 🔥 PROTECTION ANTI-SPAM pour Quick Send
let isQuickSending = false;
let lastQuickSendTime = 0;
const QUICK_SEND_COOLDOWN_MS = 300; // 300ms cooldown entre chaque envoi

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
import registerAuthIPC from './ipc/auth.ipc';
import registerClipboardIPC from './ipc/clipboard.ipc';
import registerConfigIPC from './ipc/config.ipc';
import registerContentIPC from './ipc/content.ipc';
import registerPageIPC from './ipc/page.ipc';
import registerEventsIPC from './ipc/events.ipc';
import registerWindowIPC from './ipc/window.ipc';
import registerSystemIPC from './ipc/system.ipc';
import { setupHistoryIPC } from './ipc/history.ipc';
import { setupQueueIPC } from './ipc/queue.ipc';
import { setupCacheIPC } from './ipc/cache.ipc';
import { setupSuggestionIPC } from './ipc/suggestion.ipc';
import { setupFileIPC } from './ipc/file.ipc';
import { registerStoreIPC } from './ipc/store.ipc';
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
  lastMode: 'normal',
  compactModeStartTime: null as number | null // 🔥 Track compact mode session time
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

  // 🔧 FIX: Ajuster pour les bordures système Windows
  if (process.platform === 'win32') {
    // Compenser les bordures invisibles de Windows
    const WINDOWS_BORDER_COMPENSATION = 8;
    adjusted.width = Math.max(adjusted.width - WINDOWS_BORDER_COMPENSATION, CONFIG.windowMinWidth);
    adjusted.height = Math.max(adjusted.height - WINDOWS_BORDER_COMPENSATION, CONFIG.windowMinHeight);
  }

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
    screen,
    platform: process.platform
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
        minimalistPosition: (savedState as any)?.minimalistPosition || null,
        compactModeStartTime: null // 🔥 Don't restore session time, always start fresh
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
      windowState.compactModeStartTime = Date.now(); // 🔥 Start tracking time
      console.log('[COMPACT-MODE] ⏱️ Session started');

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

      // 4. Track compact mode minutes before exiting
      if (windowState.compactModeStartTime) {
        const durationMinutes = Math.round((Date.now() - windowState.compactModeStartTime) / 1000 / 60);

        if (durationMinutes > 0) {
          try {
            const userId = await newConfigService?.get('userId');

            if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
              console.log(`[COMPACT-MODE] 🚀 Tracking ${durationMinutes} minutes...`);

              const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/track-usage`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': process.env.SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                  userId: userId,
                  feature: 'compact_mode_minutes',
                  increment: durationMinutes,
                  metadata: {
                    session_duration_seconds: Math.round((Date.now() - windowState.compactModeStartTime) / 1000)
                  }
                })
              });

              if (response.ok) {
                console.log('[COMPACT-MODE] ✅ Compact mode minutes tracked in Supabase');
              } else {
                console.error('[COMPACT-MODE] ⚠️ Failed to track minutes:', await response.text());
              }
            }
          } catch (trackError) {
            console.error('[COMPACT-MODE] ⚠️ Error tracking minutes:', trackError);
          }
        }

        windowState.compactModeStartTime = null; // Reset timer
      }

      // 5. Mettre à jour l'état
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
// ✅ INITIALISATION FOCUS MODE (CORRIGÉE)
// ============================================
async function initializeFocusMode() {
  try {
    console.log('[FOCUS-MODE] Initializing Focus Mode service...');
    
    // 1. Créer le service Focus Mode
    focusModeService = new FocusModeService({
      sessionTimeoutMinutes: 60,
      bubblePosition: { x: 0, y: 0 }, // Position par défaut, sera écrasée
      showNotifications: true,
    });

    // 2. Créer la fenêtre bulle
    floatingBubble = new FloatingBubbleWindow();

    // ✅ NE PAS créer la fenêtre immédiatement
    // Elle sera créée lors de l'activation du Focus Mode

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

    // 🆕 Listen to Focus Mode time tracking
    focusModeService.on('focus-mode:track-usage', (data) => {
      console.log('[FocusMode] Track usage:', data);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('focus-mode:track-usage', data);
      }
    });

    console.log('[FOCUS-MODE] ✅ Focus Mode service initialized (bubble window ready to create)');
    return true;
  } catch (error) {
    console.error('[FOCUS-MODE] ❌ Failed to initialize Focus Mode:', error);
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
  // Utiliser les assets directement depuis le dossier local de l'app
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

  // 🔧 Configuration BrowserWindow avec bords ronds natifs
  mainWindow = new BrowserWindow({
    width: initialBounds.width,
    height: initialBounds.height,
    x: initialBounds.x,
    y: initialBounds.y,
    minWidth: windowState.isMinimalist ? CONFIG.minimalistMinWidth : CONFIG.windowMinWidth,
    minHeight: windowState.isMinimalist ? CONFIG.minimalistMinHeight : CONFIG.windowMinHeight,
    maxWidth: windowState.isMinimalist ? CONFIG.minimalistMaxWidth : undefined,
    
    // ✅ Frame personnalisé pour garder les bords ronds natifs
    frame: false,
    // ✅ WINDOWS FIX: Ne PAS utiliser transparent sur Windows, utiliser backgroundColor
    transparent: process.platform !== 'win32',
    backgroundColor: process.platform === 'win32' ? '#ffffff' : '#00ffffff',
    show: false,
    
    // ✅ Configuration spécifique Windows - Bords ronds Windows 11
    ...(process.platform === 'win32' && {
      autoHideMenuBar: true,
      // ✅ CRITIQUE: Activer les coins arrondis Windows 11
      roundedCorners: true,
    }),
    
    // ✅ Configuration spécifique macOS - Bords ronds natifs
    ...(process.platform === 'darwin' && {
      roundedCorners: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      titleBarStyle: 'hiddenInset',
    }),
    
    // ✅ Configuration spécifique Linux - Bords ronds natifs
    ...(process.platform === 'linux' && {
      roundedCorners: true,
    }),
    
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
      webSecurity: true,
      scrollBounce: false
    },
    
    icon: appIcon,
    autoHideMenuBar: true,
    hasShadow: true,
  });

  // ✅ Windows 11: Masquer les boutons de fenêtre système
  if (process.platform === 'win32') {
    try {
      // @ts-ignore - setWindowButtonVisibility existe sur Windows
      if (mainWindow.setWindowButtonVisibility) {
        mainWindow.setWindowButtonVisibility(false);
      }
      console.log('✅ Windows 11 rounded corners enabled via BrowserWindow config');
    } catch (error) {
      console.warn('⚠️ Could not configure Windows 11 window:', error);
    }
  }

  // ✅ FIX: Après création de la fenêtre, forcer les dimensions exactes
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      // Forcer les dimensions exactes pour éviter les gaps
      const [width, height] = mainWindow.getSize();
      mainWindow.setSize(width, height);
      mainWindow.show();
    }
  });

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
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' http://localhost:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* ws://localhost:* https://api.notion.com https://*.supabase.co; font-src 'self' data: https://fonts.gstatic.com;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.notion.com https://*.supabase.co; font-src 'self' data: https://fonts.gstatic.com;"
        ]
      }
    });
  });

  // Charger l'interface
  if (isDev) {
    console.log('🔧 Dev mode: Loading from dev server');
    mainWindow.loadURL(CONFIG.devServerUrl);
    // mainWindow.webContents.openDevTools(); // ✅ Désactivé - Ouvrir manuellement avec F12 si besoin
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

  // 🔧 FIX #3: Gérer correctement la fermeture dans le tray
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Notification uniquement sur Windows
      if (tray && process.platform === 'win32') {
        try {
          tray.displayBalloon({
            title: 'Notion Clipper Pro',
            content: 'L\'application continue en arrière-plan.\nClic droit sur l\'icône pour quitter.',
            icon: appIcon || undefined
          });
        } catch (error) {
          console.warn('Balloon notification failed:', error);
        }
      }
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

        // 🔥 PROTECTION ANTI-SPAM
        const now = Date.now();
        const timeSinceLastSend = now - lastQuickSendTime;

        // Vérifier si un envoi est déjà en cours
        if (isQuickSending) {
          console.log('[SHORTCUT] ⏳ Quick send already in progress, ignoring...');
          return;
        }

        // Vérifier le cooldown (ignorer si < 300ms depuis le dernier envoi)
        if (timeSinceLastSend < QUICK_SEND_COOLDOWN_MS) {
          console.log(`[SHORTCUT] ⏱️  Cooldown active (${timeSinceLastSend}ms < ${QUICK_SEND_COOLDOWN_MS}ms), ignoring...`);
          return;
        }

        // Marquer comme en cours d'envoi
        isQuickSending = true;
        console.log('[SHORTCUT] 🔒 Quick send locked');

        try {
          // Afficher l'état "sending" sur la bulle
          if (floatingBubble && floatingBubble.isVisible()) {
            floatingBubble.updateState('sending');
            await floatingBubble.expandToProgress();
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
              await floatingBubble.showError();
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

          // Récupérer les pages cibles du Mode Focus
          const state = focusModeService.getState();
          const targetPages = (state as any).targetPages || [];
          
          if (targetPages.length === 0 && !state.activePageId) {
            throw new Error('No target pages in Focus Mode');
          }

          // 🔥 NOUVEAU: Support multi-pages - Envoyer vers toutes les pages cibles
          const pagesToSend = targetPages.length > 0 ? targetPages : [{ id: state.activePageId, title: state.activePageTitle }];
          
          console.log(`[SHORTCUT] Sending content to ${pagesToSend.length} page(s):`, pagesToSend.map(p => p.title || p.id).join(', '));
          
          let successCount = 0;
          let errors: string[] = [];
          
          // Envoyer vers chaque page
          for (const page of pagesToSend) {
            try {
              // 🔥 NOUVEAU: Récupérer le afterBlockId de la section sélectionnée
              let afterBlockId: string | undefined = undefined;

              try {
                const Store = require('electron-store');
                const sectionsStore = new Store();
                const selectedSections = sectionsStore.get('selectedSections', []) as Array<{
                  pageId: string;
                  blockId: string;
                  headingText: string;
                }>;

                const selectedSection = selectedSections.find(s => s.pageId === page.id);

                if (selectedSection) {
                  console.log(`[SHORTCUT] 📍 Section found: ${selectedSection.headingText} (${selectedSection.blockId})`);

                  // Recalculer le dernier block de la section
                  const blocks = await newNotionService.getPageBlocks(page.id);

                  if (blocks && Array.isArray(blocks)) {
                    const headingIndex = blocks.findIndex((b: any) => b.id === selectedSection.blockId);

                    if (headingIndex !== -1) {
                      const headingBlock = blocks[headingIndex];
                      const headingType = headingBlock.type;
                      let headingLevel = 1;

                      if (headingType.startsWith('heading_')) {
                        headingLevel = parseInt(headingType.split('_')[1]);
                      }

                      let lastBlockId = selectedSection.blockId;

                      for (let i = headingIndex + 1; i < blocks.length; i++) {
                        const block = blocks[i];
                        const blockType = block.type;

                        if (blockType.startsWith('heading_')) {
                          const blockLevel = parseInt(blockType.split('_')[1]);
                          if (blockLevel <= headingLevel) {
                            break;
                          }
                        }

                        lastBlockId = block.id;
                      }

                      afterBlockId = lastBlockId;
                      console.log(`[SHORTCUT] ✅ Last block recalculated: ${lastBlockId}`);
                    }
                  }
                }
              } catch (sectionError) {
                console.warn('[SHORTCUT] ⚠️ Error getting section, sending to end:', sectionError);
              }

              // 🔥 Gérer les fichiers différemment
              if (clipboardData.type === 'file' && Array.isArray(clipboardData.data)) {
                console.log('[SHORTCUT] 📎 Files detected in clipboard, uploading...');

                for (const filePath of clipboardData.data) {
                  try {
                    const fs = require('fs').promises;
                    const path = require('path');

                    const buffer = await fs.readFile(filePath);
                    const fileName = path.basename(filePath);
                    const fileExtension = path.extname(fileName).toLowerCase().substring(1);

                    let fileType: 'file' | 'image' | 'video' = 'file';
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension)) {
                      fileType = 'image';
                    } else if (['mp4', 'mov', 'webm'].includes(fileExtension)) {
                      fileType = 'video';
                    }

                    const config = {
                      type: fileType,
                      mode: 'upload' as const,
                      caption: undefined
                    };

                    console.log(`[SHORTCUT] 📤 Uploading file: ${fileName} (${fileType})`);

                    const uploadResult = await newFileService.uploadFile(
                      { fileName, buffer },
                      config
                    );

                    if (uploadResult.success && uploadResult.block) {
                      await newNotionService.appendBlocks(page.id, [uploadResult.block], afterBlockId);
                      console.log(`[SHORTCUT] ✅ File uploaded and added to page`);
                    }
                  } catch (fileError) {
                    console.error('[SHORTCUT] ❌ File upload error:', fileError);
                    errors.push(`File error: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
                  }
                }

                successCount++;
              } else {
                // Envoyer du contenu normal (text, html, image)
                const result = await newNotionService.sendToNotion({
                  pageId: page.id,
                  content: clipboardData,
                  options: {
                    ...(afterBlockId && { afterBlockId })
                  }
                });

                if (result?.success) {
                  successCount++;
                  console.log(`[SHORTCUT] ✅ Sent to page: ${page.title || page.id}`);
                } else {
                  errors.push(`${page.title || page.id}: ${result?.error || 'Unknown error'}`);
                }
              }
            } catch (error) {
              errors.push(`${page.title || page.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          
          const result = {
            success: successCount > 0,
            successCount,
            totalPages: pagesToSend.length,
            errors
          };

          if (result?.success) {
            console.log('[SHORTCUT] ✅ Quick send successful');

            // Enregistrer le clip dans Focus Mode
            focusModeService.recordClip();

            // Mettre à jour la bulle
            if (floatingBubble) {
              // Animation success
              floatingBubble.updateState('success');
              await floatingBubble.showSuccess();
            }

            // Notification système de succès - Support multi-pages
            if (mainWindow && !mainWindow.isDestroyed()) {
              const message = result.totalPages === 1 
                ? `Clip envoyé vers "${pagesToSend[0].title || pagesToSend[0].id}"`
                : result.successCount === result.totalPages
                  ? `Clip envoyé vers ${result.totalPages} pages`
                  : `Clip envoyé vers ${result.successCount}/${result.totalPages} pages`;
                  
              mainWindow.webContents.send('notification', {
                type: result.successCount === result.totalPages ? 'success' : 'warning',
                title: result.successCount === result.totalPages ? 'Envoyé !' : 'Partiellement envoyé',
                message,
                duration: 2000
              });
            }

            // Mettre à jour les stats
            if (newStatsService) {
              await newStatsService.incrementClips();
            }
          } else {
            // Construire un message d'erreur détaillé
            const errorMessage = result.errors.length > 0 
              ? `Échec d'envoi: ${result.errors.join('; ')}`
              : 'Send failed';
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error('[SHORTCUT] ❌ Quick send error:', error);

          // Afficher erreur sur la bulle
          if (floatingBubble) {
            floatingBubble.updateState('error');
            await floatingBubble.showError();
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
        } finally {
          // 🔥 TOUJOURS débloquer, même en cas d'erreur
          isQuickSending = false;
          lastQuickSendTime = Date.now();
          console.log('[SHORTCUT] 🔓 Quick send unlocked');
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

    // 13. FOCUS MODE SERVICE - Supprimé d'ici, sera initialisé après createWindow()

    // 14. FLOATING BUBBLE WINDOW - Supprimé d'ici, sera initialisé après createWindow()

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
    registerAuthIPC();
    registerClipboardIPC();
    registerConfigIPC({ newConfigService, mainWindow });
    registerContentIPC();
    registerPageIPC();
    registerEventsIPC();
    registerWindowIPC();
    registerSystemIPC();

    // Nouveaux handlers
    setupHistoryIPC();
    setupQueueIPC();
    setupCacheIPC();
    setupSuggestionIPC();
    setupFileIPC();
    registerStoreIPC();

    // 🎯 FOCUS MODE IPC sera enregistré après la création de la fenêtre
    console.log('⏳ Focus Mode IPC will be registered after window creation');

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
    // 1️⃣ Initialiser les services de base
    const servicesReady = await initializeNewServices();
    if (!servicesReady) {
      throw new Error('Failed to initialize services');
    }

    // 2️⃣ Enregistrer les IPC handlers de base (SAUF Focus Mode)
    registerAllIPC(); // Ceci enregistre clipboard, notion, files, etc.

    // 3️⃣ Créer la fenêtre principale
    await createWindow();

    // 4️⃣ ✅ MAINTENANT initialiser Focus Mode avec mainWindow disponible
    await initializeFocusMode();

    // 5️⃣ ✅ Enregistrer les IPC Focus Mode (après que mainWindow existe)
    console.log('🔍 [MAIN] Checking Focus Mode dependencies:', {
      focusModeService: !!focusModeService,
      floatingBubble: !!floatingBubble,
      newClipboardService: !!newClipboardService,
      newNotionService: !!newNotionService,
      newFileService: !!newFileService,
      mainWindow: !!mainWindow
    });

    // ✅ FIX: Toujours enregistrer les handlers IPC, même si certaines dépendances manquent
    // Les handlers géreront les cas où les services ne sont pas disponibles
    if (focusModeService && floatingBubble && newClipboardService && newNotionService && newFileService && mainWindow) {
      setupFocusModeIPC(
        focusModeService,
        floatingBubble,
        newClipboardService,
        newNotionService,
        newFileService,
        mainWindow
      );
      console.log('✅ Focus Mode IPC registered with all dependencies');
    } else {
      const missing = [];
      if (!focusModeService) missing.push('focusModeService');
      if (!floatingBubble) missing.push('floatingBubble');
      if (!newClipboardService) missing.push('newClipboardService');
      if (!newNotionService) missing.push('newNotionService');
      if (!newFileService) missing.push('newFileService');
      if (!mainWindow) missing.push('mainWindow');

      console.log('ℹ️ Focus Mode dependencies not yet available:', missing.join(', '));
      console.log('   (This is normal at startup before OAuth login completes)');
      console.log('   Registering handlers with null checks - services will be available after authentication');
      // Enregistrer quand même les handlers avec des null checks
      setupFocusModeIPC(
        focusModeService || null as any,
        floatingBubble || null as any,
        newClipboardService || null as any,
        newNotionService || null as any,
        newFileService || null as any,
        mainWindow || null as any
      );
    }
    
    // 6️⃣ Créer le tray et enregistrer shortcuts
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

// 🔧 FIX #4: macOS - Réafficher lors du clic sur le dock
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else if (BrowserWindow.getAllWindows().length === 0) {
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

    // 🆕 Log that Focus Mode dependencies are now complete
    if (focusModeService && floatingBubble && newClipboardService && newNotionService && newFileService && mainWindow) {
      console.log('[MAIN] ✅ Focus Mode now has all dependencies available (newNotionService, newFileService)');
    }

    console.log('[MAIN] ✅ NotionService reinitialized successfully');
    return true;
  } catch (error) {
    console.error('[MAIN] ❌ Error reinitializing NotionService:', error);
    return false;
  }
}