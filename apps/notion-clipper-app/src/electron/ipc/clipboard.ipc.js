const { ipcMain } = require('electron');

function registerClipboardIPC() {
  console.log('📋 Registering clipboard IPC handlers...');

  // Obtenir le contenu du clipboard
  ipcMain.handle('clipboard:get', async () => {
    try {
      const { newClipboardService } = require('../main');
      
      // Attendre que le service soit initialisé
      if (!newClipboardService) {
        return {
          success: false,
          error: 'Service initializing, please retry',
          content: { type: 'text', text: '' }
        };
      }

      const content = await newClipboardService.getContent();
      
      return {
        success: true,
        clipboard: content
      };
    } catch (error) {
      console.error('❌ Error getting clipboard:', error);
      return {
        success: false,
        error: error.message,
        content: { type: 'text', text: '' }
      };
    }
  });

  // Définir le contenu du clipboard
  ipcMain.handle('clipboard:set', async (event, data) => {
    try {
      const { newClipboardService } = require('../main');
      
      if (!newClipboardService) {
        return {
          success: false,
          error: 'Service initializing'
        };
      }

      await newClipboardService.setContent(data.content, data.type);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error setting clipboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Effacer le clipboard
  ipcMain.handle('clipboard:clear', async () => {
    try {
      const { newClipboardService } = require('../main');
      
      if (!newClipboardService) {
        return { success: false, error: 'Service initializing' };
      }

      await newClipboardService.clear();
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error clearing clipboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Historique du clipboard
  ipcMain.handle('clipboard:get-history', async () => {
    try {
      const { newClipboardService } = require('../main');
      
      if (!newClipboardService) {
        return { success: true, history: [] };
      }

      return {
        success: true,
        history: []
      };
    } catch (error) {
      console.error('❌ Error getting clipboard history:', error);
      return {
        success: false,
        error: error.message,
        history: []
      };
    }
  });

  console.log('✅ Clipboard IPC handlers registered');
}

module.exports = registerClipboardIPC;