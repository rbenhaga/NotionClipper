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

  // ✅ AJOUTER CE HANDLER
  ipcMain.handle('page:get-favorites', async () => {
    try {
      const { newConfigService } = require('../main');

      if (!newConfigService) {
        return { success: true, pages: [] };
      }

      const favorites = await newConfigService.getFavorites();
      return {
        success: true,
        pages: favorites || []
      };
    } catch (error) {
      console.error('[ERROR] Error getting favorites:', error);
      return {
        success: true,
        pages: []
      };
    }
  });

  ipcMain.handle('page:get-recent', async (event, limit = 10) => {
    try {
      const { newNotionService } = require('../main');

      if (!newNotionService) {
        return { success: true, pages: [] };
      }

      // Récupérer toutes les pages et trier par date
      const allPages = await newNotionService.getPages();
      const recentPages = allPages
        .sort((a, b) => new Date(b.last_edited_time) - new Date(a.last_edited_time))
        .slice(0, limit);

      return {
        success: true,
        pages: recentPages
      };
    } catch (error) {
      console.error('[ERROR] Error getting recent pages:', error);
      return {
        success: true,
        pages: []
      };
    }
  });

  console.log('[OK] Page IPC handlers registered');
}

module.exports = registerPageIPC;