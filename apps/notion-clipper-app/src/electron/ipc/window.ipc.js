// apps/notion-clipper-app/src/electron/ipc/window.ipc.js
const { ipcMain, BrowserWindow } = require('electron');

/**
 * Handlers IPC pour les contrôles de fenêtre avancés
 * - Pin/Unpin (Always on top)
 * - Mode minimaliste
 * - Contrôle d'opacité
 */

let windowPreferences = {
  isPinned: false,
  isMinimalist: false,
  opacity: 1.0,
  normalSize: { width: 900, height: 700 },
  minimalistSize: { width: 400, height: 600 }
};

function registerWindowIPC() {
  console.log('📡 Registering Window IPC handlers...');

  // Toggle Pin (Always on top)
  ipcMain.handle('window-toggle-pin', async () => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        return { success: false, error: 'No window found' };
      }

      windowPreferences.isPinned = !windowPreferences.isPinned;
      mainWindow.setAlwaysOnTop(windowPreferences.isPinned);

      console.log(`[WINDOW] Pin toggled: ${windowPreferences.isPinned}`);
      
      return { 
        success: true, 
        isPinned: windowPreferences.isPinned 
      };
    } catch (error) {
      console.error('[WINDOW] Error toggling pin:', error);
      return { success: false, error: error.message };
    }
  });

  // Get Pin State
  ipcMain.handle('window-get-pin-state', async () => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        return { success: false, error: 'No window found' };
      }

      const actualPinState = mainWindow.isAlwaysOnTop();
      windowPreferences.isPinned = actualPinState;

      return { 
        success: true, 
        isPinned: windowPreferences.isPinned 
      };
    } catch (error) {
      console.error('[WINDOW] Error getting pin state:', error);
      return { success: false, error: error.message };
    }
  });

  // Set Minimalist Size
  ipcMain.handle('window-set-minimalist-size', async (event, isMinimalist) => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        return { success: false, error: 'No window found' };
      }

      windowPreferences.isMinimalist = isMinimalist;

      if (isMinimalist) {
        // Sauvegarder la taille actuelle
        const currentBounds = mainWindow.getBounds();
        windowPreferences.normalSize = {
          width: currentBounds.width,
          height: currentBounds.height
        };

        // Passer en mode minimaliste
        mainWindow.setSize(
          windowPreferences.minimalistSize.width,
          windowPreferences.minimalistSize.height
        );
        
        // Centrer la fenêtre
        mainWindow.center();
        
        console.log('[WINDOW] Switched to minimalist mode');
      } else {
        // Restaurer la taille normale
        mainWindow.setSize(
          windowPreferences.normalSize.width,
          windowPreferences.normalSize.height
        );
        
        console.log('[WINDOW] Switched to normal mode');
      }

      return { 
        success: true, 
        isMinimalist: windowPreferences.isMinimalist 
      };
    } catch (error) {
      console.error('[WINDOW] Error setting minimalist size:', error);
      return { success: false, error: error.message };
    }
  });

  // Set Opacity
  ipcMain.handle('window-set-opacity', async (event, opacity) => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        return { success: false, error: 'No window found' };
      }

      // Valider l'opacité (0.3 - 1.0)
      const validOpacity = Math.max(0.3, Math.min(1.0, opacity));
      windowPreferences.opacity = validOpacity;

      mainWindow.setOpacity(validOpacity);

      console.log(`[WINDOW] Opacity set to: ${validOpacity}`);
      
      return { 
        success: true, 
        opacity: windowPreferences.opacity 
      };
    } catch (error) {
      console.error('[WINDOW] Error setting opacity:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Window IPC handlers registered');
}

module.exports = registerWindowIPC;