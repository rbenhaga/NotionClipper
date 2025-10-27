// apps/notion-clipper-app/src/electron/ipc/window.ipc.js
const { ipcMain, BrowserWindow, shell } = require('electron');

function registerWindowIPC() {
  console.log('[WINDOW] Registering window control IPC handlers...');

  // Toggle Always On Top (Pin)
  ipcMain.handle('window-toggle-pin', (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found' };
      }

      const currentState = window.isAlwaysOnTop();
      const newState = !currentState;
      
      window.setAlwaysOnTop(newState);
      
      console.log(`[WINDOW] Always on top: ${newState}`);
      
      return {
        success: true,
        isPinned: newState
      };
    } catch (error) {
      console.error('[ERROR] Error toggling pin:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get current pin state
  ipcMain.handle('window-get-pin-state', (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found', isPinned: false };
      }

      const isPinned = window.isAlwaysOnTop();
      
      return {
        success: true,
        isPinned
      };
    } catch (error) {
      console.error('[ERROR] Error getting pin state:', error);
      return {
        success: false,
        error: error.message,
        isPinned: false
      };
    }
  });

  // Set window size for minimalist mode - Style Apple/Notion
  ipcMain.handle('window-set-minimalist-size', (event, isMinimalist) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found' };
      }

      const [currentX, currentY] = window.getPosition();

      if (isMinimalist) {
        // MODE COMPACT - Style Apple/Spotlight
        // Taille optimale : 340x480 (compact et élégant)
        // Min size : 300x420 (permet un petit redimensionnement)
        window.setMinimumSize(300, 420);
        window.setSize(340, 480, true);
        window.setPosition(currentX, currentY, true);
        
        console.log('[WINDOW] ✨ Compact mode: 340x480 (min: 300x420)');
      } else {
        // MODE NORMAL
        // Taille : 900x700
        // Min size : 600x400
        window.setMinimumSize(600, 400);
        window.setSize(900, 700, true);
        window.setPosition(currentX, currentY, true);
        
        console.log('[WINDOW] 📐 Normal mode: 900x700 (min: 600x400)');
      }

      return {
        success: true,
        isMinimalist
      };
    } catch (error) {
      console.error('[ERROR] Error setting window size:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Set window opacity (pour effets visuels optionnels)
  ipcMain.handle('window-set-opacity', (event, opacity) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found' };
      }

      // Clamp opacity between 0.3 and 1.0
      const clampedOpacity = Math.max(0.3, Math.min(1.0, opacity));
      window.setOpacity(clampedOpacity);
      
      return {
        success: true,
        opacity: clampedOpacity
      };
    } catch (error) {
      console.error('[ERROR] Error setting opacity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Minimize window
  ipcMain.handle('window-minimize', (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found' };
      }

      window.minimize();
      console.log('[WINDOW] Window minimized');
      
      return { success: true };
    } catch (error) {
      console.error('[ERROR] Error minimizing window:', error);
      return { success: false, error: error.message };
    }
  });

  // Maximize/Restore window
  ipcMain.handle('window-maximize', (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found' };
      }

      if (window.isMaximized()) {
        window.restore();
        console.log('[WINDOW] Window restored');
      } else {
        window.maximize();
        console.log('[WINDOW] Window maximized');
      }
      
      return { 
        success: true, 
        isMaximized: window.isMaximized() 
      };
    } catch (error) {
      console.error('[ERROR] Error maximizing/restoring window:', error);
      return { success: false, error: error.message };
    }
  });

  // Close window (hide to tray)
  ipcMain.handle('window-close', (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found' };
      }

      // Sur macOS, masquer la fenêtre. Sur Windows/Linux, minimiser vers le tray
      if (process.platform === 'darwin') {
        window.hide();
        console.log('[WINDOW] Window hidden (macOS)');
      } else {
        window.hide();
        console.log('[WINDOW] Window hidden to tray');
      }
      
      return { success: true };
    } catch (error) {
      console.error('[ERROR] Error closing window:', error);
      return { success: false, error: error.message };
    }
  });

  // Note: open-external handler is already defined in main.js

  console.log('[OK] Window control IPC handlers registered');
}

module.exports = registerWindowIPC;