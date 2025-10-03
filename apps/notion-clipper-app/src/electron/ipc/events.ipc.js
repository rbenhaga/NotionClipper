const { ipcMain, BrowserWindow } = require('electron');

function registerEventsIPC() {
  console.log('[EVENTS] Registering events IPC handlers...');

  ipcMain.handle('events:subscribe', async (event, eventType) => {
    return { success: true };
  });

  ipcMain.handle('events:unsubscribe', async (event, eventType) => {
    return { success: true };
  });

  console.log('[OK] Events IPC handlers registered');
}

module.exports = registerEventsIPC;