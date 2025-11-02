// apps/notion-clipper-app/src/electron/ipc/focus-mode.ipc.ts
import { ipcMain, type IpcMainInvokeEvent, Notification } from 'electron';

/**
 * Setup Focus Mode IPC handlers
 */
export function setupFocusModeIPC() {
  console.log('[FOCUS-MODE] Registering Focus Mode IPC handlers...');

  // ============================================
  // ÉTAT DU MODE FOCUS
  // ============================================

  ipcMain.handle('focus-mode:get-state', async (_event: IpcMainInvokeEvent) => {
    try {
      const main = require('../main');
      const { focusModeService } = main;

      if (!focusModeService) {
        return { success: false, error: 'Focus mode service not available' };
      }

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

  ipcMain.handle('focus-mode:enable', async (_event: IpcMainInvokeEvent, page: any) => {
    try {
      const main = require('../main');
      const { focusModeService, floatingBubble } = main;

      if (!focusModeService) {
        throw new Error('Focus mode service not available');
      }

      // Activer le service
      focusModeService.enable(page);

      // Afficher la bulle
      if (floatingBubble) {
        floatingBubble.show();
        floatingBubble.updateState('active');
      }

      // Notification système
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Mode Focus activé',
          body: `Clips envoyés directement vers "${page.title || 'Page'}"`,
          icon: undefined, // Utiliser l'icône par défaut
          silent: true
        });
        notification.show();
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

  ipcMain.handle('focus-mode:disable', async (_event: IpcMainInvokeEvent) => {
    try {
      const main = require('../main');
      const { focusModeService, floatingBubble } = main;

      if (!focusModeService) {
        throw new Error('Focus mode service not available');
      }

      const state = focusModeService.getState();
      focusModeService.disable();

      // Masquer la bulle
      if (floatingBubble) {
        floatingBubble.hide();
      }

      // Notification système
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Mode Focus désactivé',
          body: `${state.clipsSentCount} clip(s) envoyé(s)`,
          silent: true
        });
        notification.show();
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

  ipcMain.handle('focus-mode:toggle', async (_event: IpcMainInvokeEvent, page?: any) => {
    try {
      const main = require('../main');
      const { focusModeService } = main;

      if (!focusModeService) {
        throw new Error('Focus mode service not available');
      }

      const isEnabled = focusModeService.isEnabled();
      
      if (isEnabled) {
        return await ipcMain.emit('focus-mode:disable');
      } else if (page) {
        return await ipcMain.emit('focus-mode:enable', page);
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
  // ENVOI RAPIDE (Quick Send)
  // ============================================

  ipcMain.handle('focus-mode:quick-send', async (_event: IpcMainInvokeEvent) => {
    try {
      const main = require('../main');
      const {
        focusModeService,
        newClipboardService,
        newNotionService,
        floatingBubble
      } = main;

      if (!focusModeService || !newClipboardService || !newNotionService) {
        throw new Error('Required services not available');
      }

      const state = focusModeService.getState();
      
      if (!state.enabled || !state.activePageId) {
        throw new Error('Focus mode not active');
      }

      // Récupérer le contenu du presse-papiers
      const clipboardData = await newClipboardService.getClipboardData();
      
      if (!clipboardData || !clipboardData.text) {
        throw new Error('No content in clipboard');
      }

      console.log('[FOCUS-MODE] 🚀 Quick sending to:', state.activePageTitle);

      // Animation de la bulle
      if (floatingBubble) {
        floatingBubble.updateState('sending');
      }

      // Envoyer vers Notion
      const result = await newNotionService.sendToNotion({
        pageId: state.activePageId,
        content: clipboardData.text,
        imageUrl: clipboardData.imageUrl,
        metadata: {
          source: 'focus-mode',
          timestamp: Date.now()
        }
      });

      if (result.success) {
        // Enregistrer le clip
        focusModeService.recordClip();

        // Animation de succès
        if (floatingBubble) {
          floatingBubble.notifyClipSent();
          floatingBubble.updateCounter(state.clipsSentCount + 1);
        }

        console.log('[FOCUS-MODE] ✅ Quick send successful');
        
        return {
          success: true,
          blockId: result.blockId,
          clipCount: state.clipsSentCount + 1
        };
      } else {
        throw new Error(result.error || 'Failed to send to Notion');
      }
    } catch (error) {
      console.error('[FOCUS-MODE] ❌ Quick send failed:', error);
      
      // Retour à l'état normal
      const main = require('../main');
      const { floatingBubble } = main;
      if (floatingBubble) {
        floatingBubble.updateState('active');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // UPLOAD DE FICHIERS (Drag & Drop)
  // ============================================

  ipcMain.handle('focus-mode:upload-files', async (_event: IpcMainInvokeEvent, files: any[]) => {
    try {
      const main = require('../main');
      const {
        focusModeService,
        newFileService,
        floatingBubble
      } = main;

      if (!focusModeService || !newFileService) {
        throw new Error('Required services not available');
      }

      const state = focusModeService.getState();
      
      if (!state.enabled || !state.activePageId) {
        throw new Error('Focus mode not active');
      }

      console.log('[FOCUS-MODE] 📁 Uploading files:', files.length);

      // Animation
      if (floatingBubble) {
        floatingBubble.updateState('sending');
      }

      // Upload des fichiers
      const results = await Promise.all(
        files.map(file => newFileService.uploadFile(file, {
          pageId: state.activePageId,
          caption: file.name
        }))
      );

      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        focusModeService.recordClip();

        if (floatingBubble) {
          floatingBubble.notifyClipSent();
          floatingBubble.updateCounter(state.clipsSentCount + 1);
        }

        console.log('[FOCUS-MODE] ✅ Files uploaded:', successCount);
        
        return {
          success: true,
          uploadedCount: successCount,
          clipCount: state.clipsSentCount + 1
        };
      } else {
        throw new Error('No files uploaded successfully');
      }
    } catch (error) {
      console.error('[FOCUS-MODE] ❌ File upload failed:', error);
      
      const main = require('../main');
      const { floatingBubble } = main;
      if (floatingBubble) {
        floatingBubble.updateState('active');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // AFFICHAGE DE LA FENÊTRE PRINCIPALE
  // ============================================

  ipcMain.handle('window:show-main', async (_event: IpcMainInvokeEvent) => {
    try {
      const main = require('../main');
      const { mainWindow } = main;

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        return { success: true };
      }

      return { success: false, error: 'Main window not available' };
    } catch (error) {
      console.error('[FOCUS-MODE] Error showing main window:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // CONFIGURATION
  // ============================================

  ipcMain.handle('focus-mode:update-config', async (_event: IpcMainInvokeEvent, config: any) => {
    try {
      const main = require('../main');
      const { focusModeService } = main;

      if (!focusModeService) {
        throw new Error('Focus mode service not available');
      }

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

  ipcMain.handle('focus-mode:update-bubble-position', async (_event: IpcMainInvokeEvent, position: { x: number; y: number }) => {
    try {
      const main = require('../main');
      const { focusModeService } = main;

      if (!focusModeService) {
        throw new Error('Focus mode service not available');
      }

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
  // BUBBLE DRAG HANDLERS
  // ============================================

  ipcMain.handle('bubble:drag-start', async (_event: IpcMainInvokeEvent, position: { x: number; y: number }) => {
    try {
      const main = require('../main');
      const { floatingBubble } = main;

      if (floatingBubble) {
        floatingBubble.onDragStart(position);
      }

      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error on drag start:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:drag-move', async (_event: IpcMainInvokeEvent, position: { x: number; y: number }) => {
    try {
      const main = require('../main');
      const { floatingBubble } = main;

      if (floatingBubble) {
        floatingBubble.onDragMove(position);
      }

      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error on drag move:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:drag-end', async (_event: IpcMainInvokeEvent) => {
    try {
      const main = require('../main');
      const { floatingBubble } = main;

      if (floatingBubble) {
        floatingBubble.onDragEnd();
      }

      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error on drag end:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:set-mouse-events', async (_event: IpcMainInvokeEvent, enabled: boolean) => {
    try {
      const main = require('../main');
      const { floatingBubble } = main;

      if (floatingBubble) {
        floatingBubble.setMouseEvents(enabled);
      }

      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error setting mouse events:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  console.log('[FOCUS-MODE] ✅ Focus Mode IPC handlers registered');
}