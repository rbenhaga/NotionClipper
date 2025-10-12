const { ipcMain, BrowserWindow } = require('electron');

function registerEventsIPC() {
  console.log('[EVENTS] Registering events IPC handlers...');

  ipcMain.handle('events:subscribe', async (event, eventType) => {
    return { success: true };
  });

  ipcMain.handle('events:unsubscribe', async (event, eventType) => {
    return { success: true };
  });

  // Polling status (for connection indicator)
  ipcMain.handle('polling:get-status', async () => {
    try {
      const { newPollingService } = require('../main');
      if (!newPollingService) {
        return { success: false, error: 'Polling service not available' };
      }

      const status = newPollingService.getStatus();
      const isNetworkPaused = newPollingService.isNetworkPausedStatus ? newPollingService.isNetworkPausedStatus() : false;
      
      return { 
        success: true, 
        status: {
          ...status,
          isNetworkPaused
        }
      };
    } catch (error) {
      console.error('[EVENTS] Error getting polling status:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[OK] Events IPC handlers registered');
}

module.exports = registerEventsIPC;