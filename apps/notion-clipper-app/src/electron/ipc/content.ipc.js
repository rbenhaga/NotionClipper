const { ipcMain } = require('electron');

function registerContentIPC() {
  console.log('[CONTENT] Registering content IPC handlers...');

  ipcMain.handle('content:send', async (event, data) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        throw new Error('NotionService not initialized');
      }

      // TODO: Implémenter sendContent dans NotionService
      // const result = await newNotionService.sendContent(data.pageId, data.content, data.type);
      
      return {
        success: true,
        message: 'Content send not yet implemented in new service'
      };
    } catch (error) {
      console.error('[ERROR] Error sending content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('content:parse', async (event, data) => {
    try {
      // TODO: Parser service à migrer
      return {
        success: true,
        parsed: data.content,
        message: 'Parser not yet migrated'
      };
    } catch (error) {
      console.error('[ERROR] Error parsing content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[OK] Content IPC handlers registered');
}

module.exports = registerContentIPC;