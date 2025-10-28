import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

function registerEventsIPC(): void {
  console.log('[EVENTS] Registering events IPC handlers...');

  ipcMain.handle('events:subscribe', async (_event: IpcMainInvokeEvent, eventType: string) => {
    return { success: true };
  });

  ipcMain.handle('events:unsubscribe', async (_event: IpcMainInvokeEvent, eventType: string) => {
    return { success: true };
  });

  // Polling status (for connection indicator)
  ipcMain.handle('polling:get-status', async (_event: IpcMainInvokeEvent) => {
    try {
      // Dynamic require to avoid circular dependencies
      const { newPollingService } = require('../main');
      
      if (!newPollingService) {
        return { success: false, error: 'Polling service not available' };
      }

      const status = (newPollingService as any).getStatus();
      const isNetworkPaused = (newPollingService as any).isNetworkPausedStatus ? 
        (newPollingService as any).isNetworkPausedStatus() : false;
      
      return { 
        success: true, 
        status: {
          ...status,
          isNetworkPaused
        }
      };
    } catch (error: any) {
      console.error('[EVENTS] Error getting polling status:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[OK] Events IPC handlers registered');
}

export default registerEventsIPC;