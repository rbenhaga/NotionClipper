import { ipcMain, type IpcMainInvokeEvent, Notification, BrowserWindow } from 'electron';
import type { FocusModeService } from '@notion-clipper/core-electron';
import type { FloatingBubbleWindow } from '../windows/FloatingBubble';
import type { ElectronClipboardService, ElectronNotionService, ElectronFileService } from '@notion-clipper/core-electron';

/**
 * Configuration des handlers IPC pour le Mode Focus
 * @param services - Services injectés pour éviter require() dynamique
 */
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
  ipcMain.handle('focus-mode:get-state', async (_event: IpcMainInvokeEvent) => {
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
  ipcMain.handle('focus-mode:enable', async (_event: IpcMainInvokeEvent, page: any) => {
    try {
      // Activer le service
      focusModeService.enable(page);

      // Afficher la bulle
      floatingBubble.show();
      floatingBubble.updateState('active');

      // Notification système
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Mode Focus activé',
          body: `Clips envoyés directement vers "${page.title || 'Page'}"`,
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
      const state = focusModeService.getState();
      focusModeService.disable();

      // Masquer la bulle
      floatingBubble.hide();

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
      const isEnabled = focusModeService.isEnabled();
      if (isEnabled) {
        // Désactiver le mode Focus
        const state = focusModeService.getState();
        focusModeService.disable();
        floatingBubble.hide();
        
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: 'Mode Focus désactivé',
            body: `${state.clipsSentCount} clip(s) envoyé(s)`,
            silent: true
          });
          notification.show();
        }
        
        return { success: true };
      } else if (page) {
        // Activer le mode Focus
        focusModeService.enable(page);
        floatingBubble.show();
        floatingBubble.updateState('active');
        
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: 'Mode Focus activé',
            body: `Clips envoyés directement vers "${page.title || 'Page'}"`,
            silent: true
          });
          notification.show();
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
  // QUICK SEND (NOUVEAU)
  // ============================================
  ipcMain.handle('focus-mode:quick-send', async (_event: IpcMainInvokeEvent) => {
    try {
      const state = focusModeService.getState();
      if (!state.enabled || !state.activePageId) {
        throw new Error('Focus mode not enabled or no active page');
      }

      // Récupérer le contenu du presse-papiers
      const clipboardData = await clipboardService.getContent();
      if (!clipboardData || !clipboardData.data) {
        throw new Error('No content in clipboard');
      }

      // Afficher l'état "sending" sur la bulle
      floatingBubble.updateState('sending');

      // Utiliser la méthode sendContent existante du service Notion
      const result = await notionService.sendContent(
        state.activePageId,
        clipboardData.data,
        { 
          type: clipboardData.type,
          asChild: false
        }
      );

      if (result.success) {
        // Mettre à jour les stats
        focusModeService.recordClip();

        // Afficher succès sur la bulle
        floatingBubble.updateState('success');
        floatingBubble.notifyClipSent();
        floatingBubble.updateCounter(state.clipsSentCount + 1);

        // Retour à l'état actif après 2 secondes
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

      // Afficher erreur sur la bulle
      floatingBubble.updateState('error');
      setTimeout(() => {
        floatingBubble.updateState('active');
      }, 2000);

      // Notification système d'erreur
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
  // UPLOAD FILES (NOUVEAU)
  // ============================================
  ipcMain.handle('focus-mode:upload-files', async (_event: IpcMainInvokeEvent, files: any[]) => {
    try {
      const state = focusModeService.getState();
      if (!state.enabled || !state.activePageId) {
        throw new Error('Focus mode not enabled or no active page');
      }

      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      // Afficher l'état "sending" sur la bulle
      floatingBubble.updateState('sending');

      // Uploader les fichiers
      const results = await Promise.all(
        files.map(file => fileService.uploadFile(state.activePageId!, file))
      );

      const allSuccessful = results.every(r => r.success);

      if (allSuccessful) {
        // Mettre à jour les stats
        focusModeService.recordClip();

        // Afficher succès sur la bulle
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

      // Afficher erreur sur la bulle
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
  ipcMain.handle('focus-mode:update-config', async (_event: IpcMainInvokeEvent, config: any) => {
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

  // ============================================
  // GESTION DE L'INTRO
  // ============================================
  ipcMain.handle('focus-mode:reset-intro', async (_event: IpcMainInvokeEvent) => {
    try {
      await focusModeService.resetIntroState();
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error resetting intro state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('focus-mode:update-bubble-position', async (_event: IpcMainInvokeEvent, position: { x: number; y: number }) => {
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
  // BUBBLE DRAG HANDLERS
  // ============================================
  ipcMain.handle('bubble:drag-start', async (_event: IpcMainInvokeEvent, position: { x: number; y: number }) => {
    try {
      floatingBubble.onDragStart(position);
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error on drag start:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:drag-move', async (_event: IpcMainInvokeEvent, position: { x: number; y: number }) => {
    try {
      // Validation des paramètres
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        console.error('[BUBBLE] Invalid drag position received:', position);
        return { success: false, error: 'Invalid position parameters' };
      }
      
      floatingBubble.onDragMove(position);
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error on drag move:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bubble:drag-end', async (_event: IpcMainInvokeEvent) => {
    try {
      floatingBubble.onDragEnd();
      
      // Sauvegarder la position
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

  ipcMain.handle('bubble:set-mouse-events', async (_event: IpcMainInvokeEvent, enabled: boolean) => {
    try {
      floatingBubble.setMouseEvents(enabled);
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error setting mouse events:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // ============================================
  // WINDOW ACTIONS
  // ============================================
  ipcMain.handle('window:show-main', async (_event: IpcMainInvokeEvent) => {
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

  ipcMain.handle('window:open-config', async (_event: IpcMainInvokeEvent) => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Envoyer un événement pour ouvrir le panneau de config
        mainWindow.webContents.send('open-config-panel');
      }
      return { success: true };
    } catch (error) {
      console.error('[WINDOW] Error opening config:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  console.log('[FOCUS-MODE] ✅ All handlers registered successfully');
}