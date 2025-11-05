// apps/notion-clipper-app/src/electron/ipc/focus-mode.ipc.ts
import { ipcMain, type IpcMainInvokeEvent, Notification, BrowserWindow } from 'electron';
import Store from 'electron-store';
import type { FocusModeService } from '@notion-clipper/core-electron';
import type { FloatingBubbleWindow } from '../windows/FloatingBubble';
import type { ElectronClipboardService, ElectronNotionService, ElectronFileService } from '@notion-clipper/core-electron';

const focusModeStore = new Store({
  name: 'focus-mode-state',
  defaults: {
    hasShownIntro: false
  }
});

export function setupFocusModeIPC(
  focusModeService: FocusModeService,
  floatingBubble: FloatingBubbleWindow,
  clipboardService: ElectronClipboardService,
  notionService: ElectronNotionService,
  fileService: ElectronFileService,
  mainWindow: BrowserWindow
) {
  console.log('[FOCUS-MODE] Registering Focus Mode IPC handlers...');

  // ============================================
  // ÉTAT DU MODE FOCUS
  // ============================================
  
  ipcMain.handle('focus-mode:get-state', async () => {
    try {
      const state = focusModeService.getState();
      return { success: true, state };
    } catch (error) {
      console.error('[FOCUS-MODE] Error getting state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // ACTIVER / DÉSACTIVER
  // ============================================
  
  ipcMain.handle('focus-mode:enable', async (_event, page: any) => {
    try {
      focusModeService.enable(page);
      
      // Vérifier si l'intro a été montrée
      const hasShownIntro = focusModeStore.get('hasShownIntro', false) as boolean;
      
      if (hasShownIntro) {
        // Si l'intro a été montrée, afficher la bulle directement
        floatingBubble.show();
        floatingBubble.updateState('active');
        
        if (Notification.isSupported()) {
          new Notification({
            title: 'Mode Focus activé',
            body: `Clips envoyés vers "${page.title || 'Page'}"`,
            silent: true
          }).show();
        }
      } else {
        // Si l'intro n'a pas été montrée, ne pas afficher la bulle
        // Elle sera affichée après completion de l'intro
        console.log('[FOCUS-MODE] Intro not shown yet, bubble will appear after intro completion');
      }

      console.log('[FOCUS-MODE] ✅ Enabled for page:', page.title);
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error enabling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('focus-mode:disable', async () => {
    try {
      const state = focusModeService.getState();
      focusModeService.disable();
      floatingBubble.hide();

      if (Notification.isSupported()) {
        new Notification({
          title: 'Mode Focus désactivé',
          body: `${state.clipsSentCount} clip(s) envoyé(s)`,
          silent: true
        }).show();
      }

      console.log('[FOCUS-MODE] ❌ Disabled');
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error disabling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('focus-mode:toggle', async (_event, page?: any) => {
    try {
      const isEnabled = focusModeService.isEnabled();
      
      if (isEnabled) {
        const state = focusModeService.getState();
        focusModeService.disable();
        floatingBubble.hide();
        
        if (Notification.isSupported()) {
          new Notification({
            title: 'Mode Focus désactivé',
            body: `${state.clipsSentCount} clip(s) envoyé(s)`,
            silent: true
          }).show();
        }
        
        return { success: true };
      } else if (page) {
        focusModeService.enable(page);
        floatingBubble.show();
        floatingBubble.updateState('active');
        
        if (Notification.isSupported()) {
          new Notification({
            title: 'Mode Focus activé',
            body: `Clips envoyés vers "${page.title || 'Page'}"`,
            silent: true
          }).show();
        }
        
        return { success: true };
      } else {
        throw new Error('Page required to enable focus mode');
      }
    } catch (error) {
      console.error('[FOCUS-MODE] Error toggling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // QUICK SEND
  // ============================================
  
  ipcMain.handle('focus-mode:quick-send', async () => {
    try {
      const state = focusModeService.getState();
      if (!state.enabled || !state.activePageId) {
        throw new Error('Focus mode not enabled or no active page');
      }

      const clipboardData = await clipboardService.getContent();
      if (!clipboardData || !clipboardData.data) {
        throw new Error('No content in clipboard');
      }

      floatingBubble.updateState('sending');

      const result = await notionService.sendContent(
        state.activePageId,
        clipboardData.data,
        { 
          type: clipboardData.type,
          asChild: false
        }
      );

      if (result.success) {
        focusModeService.recordClip();
        floatingBubble.updateState('success');
        floatingBubble.notifyClipSent();
        floatingBubble.updateCounter(state.clipsSentCount + 1);

        setTimeout(() => {
          floatingBubble.updateState('active');
        }, 2000);

        console.log('[FOCUS-MODE] ✅ Quick send successful');
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to send content');
      }
    } catch (error) {
      console.error('[FOCUS-MODE] Error in quick send:', error);

      floatingBubble.updateState('error');
      setTimeout(() => {
        floatingBubble.updateState('active');
      }, 2000);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('notification:show', {
          type: 'error',
          title: 'Erreur d\'envoi',
          message: error instanceof Error ? error.message : 'Échec de l\'envoi',
          duration: 4000
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // UPLOAD FILES
  // ============================================
  
  ipcMain.handle('focus-mode:upload-files', async (_event, files: any[]) => {
    try {
      const state = focusModeService.getState();
      if (!state.enabled || !state.activePageId) {
        throw new Error('Focus mode not enabled or no active page');
      }

      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      floatingBubble.updateState('sending');

      const results = await Promise.all(
        files.map(file => fileService.uploadFile(state.activePageId!, file))
      );

      const allSuccessful = results.every(r => r.success);

      if (allSuccessful) {
        focusModeService.recordClip();
        floatingBubble.updateState('success');
        floatingBubble.notifyClipSent();
        floatingBubble.updateCounter(state.clipsSentCount + 1);

        setTimeout(() => {
          floatingBubble.updateState('active');
        }, 2000);

        console.log('[FOCUS-MODE] ✅ Files uploaded successfully');
        return { success: true };
      } else {
        throw new Error('Some files failed to upload');
      }
    } catch (error) {
      console.error('[FOCUS-MODE] Error uploading files:', error);

      floatingBubble.updateState('error');
      setTimeout(() => {
        floatingBubble.updateState('active');
      }, 2000);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // CONFIGURATION
  // ============================================
  
  ipcMain.handle('focus-mode:update-config', async (_event, config: any) => {
    try {
      focusModeService.updateConfig(config);
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error updating config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('focus-mode:update-bubble-position', async (_event, position: { x: number; y: number }) => {
    try {
      focusModeService.updateBubblePosition(position.x, position.y);
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error updating bubble position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // 🆕 MENU CONTEXTUEL
  // ============================================
  
  ipcMain.handle('bubble:toggle-menu', async () => {
    try {
      floatingBubble.toggleMenu();
      return { success: true, isOpen: floatingBubble.isMenuOpenState() };
    } catch (error) {
      console.error('[BUBBLE] Error toggling menu:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:open-menu', async () => {
    try {
      console.log('[BUBBLE] IPC: Opening menu...');
      floatingBubble.openMenu();
      console.log('[BUBBLE] IPC: Menu opened successfully');
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error opening menu:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:close-menu', async () => {
    try {
      console.log('[BUBBLE] IPC: Closing menu...');
      floatingBubble.closeMenu();
      console.log('[BUBBLE] IPC: Menu closed successfully');
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error closing menu:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // ============================================
  // DRAG HANDLERS
  // ============================================
  
  ipcMain.handle('bubble:drag-start', async (_event, position: { x: number; y: number }) => {
    try {
      floatingBubble.onDragStart(position);
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error on drag start:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:drag-move', async (_event, position: { x: number; y: number }) => {
    try {
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        console.error('[BUBBLE] Invalid drag position:', position);
        return { success: false, error: 'Invalid position parameters' };
      }
      
      floatingBubble.onDragMove(position);
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error on drag move:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:drag-end', async () => {
    try {
      floatingBubble.onDragEnd();
      
      const position = floatingBubble.getPosition();
      if (position) {
        focusModeService.updateBubblePosition(position.x, position.y);
      }
      
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error on drag end:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:set-mouse-events', async (_event, enabled: boolean) => {
    try {
      floatingBubble.setMouseEvents(enabled);
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error setting mouse events:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // ============================================
  // GESTION DE L'INTRO
  // ============================================
  
  ipcMain.handle('focus-mode:get-intro-state', async () => {
    try {
      const hasShown = focusModeStore.get('hasShownIntro', false) as boolean;
      return { success: true, hasShown };
    } catch (error: any) {
      console.error('[FocusMode] Error getting intro state:', error);
      return { success: false, hasShown: false, error: error.message };
    }
  });

  ipcMain.handle('focus-mode:save-intro-state', async (_event, hasShown: boolean) => {
    try {
      focusModeStore.set('hasShownIntro', hasShown);
      console.log('[FocusMode] Intro state saved:', hasShown);
      return { success: true };
    } catch (error: any) {
      console.error('[FocusMode] Error saving intro state:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('focus-mode:show-bubble-after-intro', async () => {
    try {
      // Afficher la bulle après completion de l'intro
      const state = focusModeService.getState();
      if (state.enabled) {
        floatingBubble.show();
        floatingBubble.updateState('active');
        
        if (Notification.isSupported()) {
          new Notification({
            title: 'Mode Focus activé',
            body: `Clips envoyés vers "${state.activePageTitle || 'Page'}"`,
            silent: true
          }).show();
        }
        
        console.log('[FOCUS-MODE] ✅ Bubble shown after intro completion');
      }
      return { success: true };
    } catch (error: any) {
      console.error('[FocusMode] Error showing bubble after intro:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('focus-mode:reset-intro', async () => {
    try {
      focusModeStore.set('hasShownIntro', false);
      console.log('[FocusMode] Intro state reset');
      return { success: true };
    } catch (error: any) {
      console.error('[FocusMode] Error resetting intro:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // WINDOW ACTIONS
  // ============================================
  
  ipcMain.handle('window:show-main', async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
      }
      return { success: true };
    } catch (error) {
      console.error('[WINDOW] Error showing main window:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  console.log('[FOCUS-MODE] ✅ All IPC handlers registered');
}