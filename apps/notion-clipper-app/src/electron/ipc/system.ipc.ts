// apps/notion-clipper-app/src/electron/ipc/system.ipc.ts
import { ipcMain, app } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

/**
 * System IPC handlers
 * Provides system-level information to the renderer process
 */
function registerSystemIPC(): void {
  console.log('[SYSTEM] Registering system IPC handlers...');

  /**
   * Get system locale
   * Returns the user's system language (e.g., "en", "fr", "es")
   */
  ipcMain.handle('system:getLocale', async (_event: IpcMainInvokeEvent) => {
    try {
      // Get system locale from Electron
      const systemLocale = app.getLocale();
      console.log('[SYSTEM] System locale detected:', systemLocale);

      return {
        success: true,
        locale: systemLocale,
      };
    } catch (error: any) {
      console.error('[SYSTEM] Error getting system locale:', error);
      return {
        success: false,
        error: error.message,
        locale: 'en', // Fallback to English
      };
    }
  });

  console.log('[SYSTEM] ✅ System IPC handlers registered');
}

export default registerSystemIPC;
