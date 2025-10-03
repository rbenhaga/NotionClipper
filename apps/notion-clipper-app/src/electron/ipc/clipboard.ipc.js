const { ipcMain, BrowserWindow } = require('electron');
const clipboardService = require('../services/clipboard.service');

function registerClipboardIPC() {
  console.log('📋 Registering clipboard IPC handlers...');

  ipcMain.handle('clipboard:get', async () => {
    try {
      const content = clipboardService.getContent();
      if (content) {
        return { 
          success: true, 
          clipboard: {
            ...content,
            content: content.content || content.data || content.text // S'assurer que content existe
          }
        };
      }
      return { success: true, clipboard: null };
    } catch (error) {
      console.error('IPC clipboard:get error:', error);
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

  console.log('✅ Clipboard IPC handlers registered');
}

module.exports = registerClipboardIPC;