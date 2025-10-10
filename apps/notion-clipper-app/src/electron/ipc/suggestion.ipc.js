// apps/notion-clipper-app/src/electron/ipc/suggestion.ipc.js
const { ipcMain } = require('electron');

function registerSuggestionIPC() {
  console.log('[SUGGESTION] Registering suggestion IPC handlers...');

  /**
   * Get page suggestions based on content
   */
  ipcMain.handle('suggestion:get', async (event, query) => {
    try {
      const { newSuggestionService } = require('../main');

      if (!newSuggestionService) {
        return {
          success: false,
          error: 'Service initializing',
          suggestions: []
        };
      }

      const { content, pages, favorites } = query;

      // Appeler le service avec les bons paramètres
      const suggestions = await newSuggestionService.getSuggestions(
        content,
        pages || [],
        favorites || [],
        { maxSuggestions: 10 }
      );

      return {
        success: true,
        suggestions
      };
    } catch (error) {
      console.error('[ERROR] Error getting suggestions:', error);
      return {
        success: false,
        error: error.message,
        suggestions: []
      };
    }
  });

  /**
   * Get hybrid suggestions (NLP + ML + favorites + recents)
   * ✅ NOUVEAU HANDLER
   */
  ipcMain.handle('suggestion:hybrid', async (event, data) => {
    try {
      const { newSuggestionService, newNotionService, newConfigService } = require('../main');

      if (!newSuggestionService || !newNotionService) {
        return {
          success: false,
          error: 'Services initializing',
          suggestions: []
        };
      }

      const { content, limit = 10 } = data;

      // Get pages
      const pagesResult = await newNotionService.getPages(false);
      const pages = pagesResult.pages || [];

      // Get favorites from config
      let favorites = [];
      if (newConfigService) {
        favorites = await newConfigService.getFavorites();
      }

      // Get suggestions using the service
      const suggestions = await newSuggestionService.getSuggestions({
        content,
        pages,
        favorites,
        limit
      });

      return {
        success: true,
        suggestions
      };
    } catch (error) {
      console.error('[ERROR] Error getting hybrid suggestions:', error);
      return {
        success: false,
        error: error.message,
        suggestions: []
      };
    }
  });

  /**
   * Clear suggestion cache
   */
  ipcMain.handle('suggestion:clear-cache', async () => {
    try {
      const { newSuggestionService } = require('../main');

      if (!newSuggestionService) {
        return { success: false, error: 'Service initializing' };
      }

      // Clear cache if the service has this method
      if (newSuggestionService.clearCache) {
        newSuggestionService.clearCache();
      }

      return { success: true };
    } catch (error) {
      console.error('[ERROR] Error clearing suggestion cache:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[OK] Suggestion IPC handlers registered');
}

module.exports = registerSuggestionIPC;