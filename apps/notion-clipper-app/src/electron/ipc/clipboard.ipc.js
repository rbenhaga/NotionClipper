const { ipcMain } = require('electron');
const { htmlToMarkdownConverter } = require('@notion-clipper/notion-parser');

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
      
      // Transformer les données au format attendu par le frontend
      if (content) {
        const transformedContent = {
          type: content.type,
          content: content.data, // data -> content
          // ✅ CORRECTION CRITIQUE: Utiliser le nouveau convertisseur HTML robuste
          text: content.type === 'text' ? content.data : 
                content.type === 'html' ? htmlToMarkdownConverter.convert(content.data?.toString() || '') : 
                '', 
          textContent: content.type === 'html' ? (content.metadata?.textContent || '') : content.data,
          html: content.type === 'html' ? content.data?.toString() || '' : '',
          timestamp: content.timestamp,
          metadata: content.metadata,
          hash: content.hash,
          preview: content.preview,
          // Propriétés supplémentaires pour les images
          bufferSize: content.metadata?.bufferSize,
          truncated: content.metadata?.length > 200000
        };
        
        return {
          success: true,
          clipboard: transformedContent
        };
      }
      
      return {
        success: true,
        clipboard: null
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

      await newClipboardService.write(data.content);
      
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