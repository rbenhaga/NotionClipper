const { ipcMain } = require('electron');

function registerClipboardIPC() {
  console.log('📋 Registering clipboard IPC handlers...');

  // Obtenir le contenu du clipboard
  ipcMain.handle('clipboard:get', async () => {
    try {
      const { newClipboardService } = require('../main');
      
      if (!newClipboardService) {
        throw new Error('ClipboardService not initialized');
      }

      // Pour l'instant, utilisons l'adapter directement
      const text = await newClipboardService.readText();
      const image = await newClipboardService.readImage();
      const html = await newClipboardService.readHTML();
      
      const content = {
        type: image ? 'image' : (html ? 'html' : 'text'),
        data: image ? image.buffer : (html || text),
        text: text,
        html: html,
        image: image
      };
      
      return {
        success: true,
        content
      };
    } catch (error) {
      console.error('❌ Error getting clipboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Définir le contenu du clipboard
  ipcMain.handle('clipboard:set', async (event, data) => {
    try {
      const { newClipboardService } = require('../main');
      
      if (!newClipboardService) {
        throw new Error('ClipboardService not initialized');
      }

      // Utiliser l'adapter directement selon le type
      if (data.type === 'text') {
        await newClipboardService.writeText(data.content);
      } else if (data.type === 'html') {
        await newClipboardService.writeHTML(data.content);
      } else if (data.type === 'image') {
        await newClipboardService.writeImage(data.content);
      }
      
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
        throw new Error('ClipboardService not initialized');
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

      // Pour l'instant, retourner un tableau vide
      // À implémenter si nécessaire
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