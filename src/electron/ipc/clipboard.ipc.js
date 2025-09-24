const { ipcMain, BrowserWindow } = require('electron');
const clipboardService = require('../services/clipboard.service');

function registerClipboardIPC() {
  console.log('📋 Registering clipboard IPC handlers...');

  ipcMain.handle('clipboard:get', async () => {
    try {
      const content = await clipboardService.getContent();
      if (content) {
        const mapped = {
          content: content.data || content.text || '',
          type: content.type || 'text',
          subtype: content.subtype,
          length: content.length,
          timestamp: content.timestamp,
          hash: content.hash,
          metadata: content.metadata
        };
        return { success: true, clipboard: mapped, stats: clipboardService.getStats() };
      }
      return { success: true, clipboard: null, stats: clipboardService.getStats() };
    } catch (error) {
      console.error('IPC clipboard:get error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clipboard:get-history', async () => {
    try {
      const history = clipboardService.getHistory();
      return { success: true, history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clipboard:set', async (event, { content, type }) => {
    try {
      const success = clipboardService.setContent(content, type);
      return { success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clipboard:clear', async () => {
    try {
      clipboardService.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clipboard:start-watching', async () => {
    try {
      clipboardService.startWatching();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clipboard:stop-watching', async () => {
    try {
      clipboardService.stopWatching();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  clipboardService.on('content-changed', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('clipboard:changed', data);
      }
    });
  });

  clipboardService.on('cleared', () => {
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('clipboard:cleared');
      }
    });
  });

  clipboardService.on('error', (error) => {
    console.error('Clipboard service error:', error);
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('clipboard:error', error.message);
      }
    });
  });

  console.log('✅ Clipboard IPC handlers registered');
}

module.exports = registerClipboardIPC;