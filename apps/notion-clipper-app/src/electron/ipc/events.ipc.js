const { ipcMain, BrowserWindow } = require('electron');
const notionService = require('../services/notion.service');
const clipboardService = require('../services/clipboard.service');
const pollingService = require('../services/polling.service');

function registerEventsIPC() {
  // Abonnement aux événements
  ipcMain.handle('events:subscribe', async (event, eventType) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    // S'abonner aux différents événements
    switch (eventType) {
      case 'pages-changed':
        notionService.on('pages-changed', (data) => {
          if (!win.isDestroyed()) {
            win.webContents.send('event:pages-changed', data);
          }
        });
        break;
      case 'clipboard-changed':
        clipboardService.on('changed', (data) => {
          if (!win.isDestroyed()) {
            win.webContents.send('event:clipboard-changed', data);
          }
        });
        break;
      case 'sync-status':
        pollingService.on('sync-status', (data) => {
          if (!win.isDestroyed()) {
            win.webContents.send('event:sync-status', data);
          }
        });
        break;
    }
    return { success: true };
  });
  // Désabonnement
  ipcMain.handle('events:unsubscribe', async (event, eventType) => {
    switch (eventType) {
      case 'pages-changed':
        notionService.removeAllListeners('pages-changed');
        break;
      case 'clipboard-changed':
        clipboardService.removeAllListeners('changed');
        break;
      case 'sync-status':
        pollingService.removeAllListeners('sync-status');
        break;
    }
    return { success: true };
  });
}

module.exports = registerEventsIPC; 