// apps/notion-clipper-app/src/electron/ipc/content.ipc.js
const { ipcMain } = require('electron');

// Import du ParserService
const { ElectronParserService } = require('@notion-clipper/core-electron');

// Instance du service
let parserService = null;

function registerContentIPC() {
  console.log('[CONTENT] Registering content IPC handlers...');

  // Initialiser le parser service
  if (!parserService) {
    parserService = new ElectronParserService();
    console.log('[CONTENT] ParserService initialized');
  }

  /**
   * Send content to Notion
   */
  ipcMain.handle('content:send', async (event, data) => {
    try {
      const { newNotionService, newStatsService } = require('../main');

      if (!newNotionService) {
        throw new Error('NotionService not initialized');
      }

      console.log('[CONTENT] Sending content to Notion...', {
        pageId: data.pageId,
        contentLength: data.content?.length || 0,
        type: data.type
      });

      // Send content using NotionService
      const result = await newNotionService.sendContent(
        data.pageId,
        data.content,
        data.options || {}
      );

      // Update stats on success
      if (result.success && newStatsService) {
        await newStatsService.incrementClips();
      }

      return result;
    } catch (error) {
      console.error('[ERROR] Error sending content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Parse content using ParserService
   */
  ipcMain.handle('content:parse', async (event, data) => {
    try {
      console.log('[CONTENT] Parsing content...', {
        length: data.content?.length || 0,
        requestedType: data.type
      });

      // Parse content
      const result = await parserService.parse(data.content, data.type || 'auto');

      return {
        success: true,
        parsed: {
          type: result.type,
          content: data.content,
          blocks: result.blocks,
          metadata: result.metadata
        }
      };
    } catch (error) {
      console.error('[ERROR] Error parsing content:', error);
      return {
        success: false,
        error: error.message,
        parsed: {
          type: 'text',
          content: data.content,
          blocks: []
        }
      };
    }
  });

  /**
   * Upload image to external service (if needed)
   */
  ipcMain.handle('content:upload-image', async (event, imageData) => {
    try {
      // Pour l'instant, on retourne juste l'image en base64
      // Dans une version future, on pourrait uploader vers un service externe

      console.log('[CONTENT] Image upload requested');

      return {
        success: true,
        url: imageData, // Pour l'instant, retourner tel quel
        message: 'Image ready (base64)'
      };
    } catch (error) {
      console.error('[ERROR] Error uploading image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[OK] Content IPC handlers registered');
}

module.exports = registerContentIPC;