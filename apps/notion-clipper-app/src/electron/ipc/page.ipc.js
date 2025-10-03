const { ipcMain } = require('electron');

function registerPageIPC() {
  console.log('[PAGE] Registering page IPC handlers...');

  ipcMain.handle('page:get-info', async (event, pageId) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }

      return {
        success: true,
        page: null,
        message: 'Page info not yet implemented'
      };
    } catch (error) {
      console.error('[ERROR] Error getting page info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('page:get-favorites', async () => {
    try {
      const { newConfigService } = require('../main');
      
      if (!newConfigService) {
        return { success: true, favorites: [] };
      }

      const favorites = await newConfigService.getFavorites();
      return {
        success: true,
        favorites: favorites || []
      };
    } catch (error) {
      console.error('[ERROR] Error getting favorites:', error);
      return {
        success: true,
        favorites: []
      };
    }
  });

  console.log('[OK] Page IPC handlers registered');
}

module.exports = registerPageIPC;