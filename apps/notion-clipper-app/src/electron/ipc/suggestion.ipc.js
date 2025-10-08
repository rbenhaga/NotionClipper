// apps/notion-clipper-app/src/electron/ipc/suggestion.ipc.js
const { ipcMain } = require('electron');

function registerSuggestionIPC() {
  console.log('[SUGGESTION] Registering suggestion IPC handlers...');

  /**
   * Get page suggestions based on content
   */
  ipcMain.handle('suggestion:get', async (event, query) => {
    try {
      // ✅ UTILISER LE SERVICE AU LIEU DE L'OBJET QUERY
      const { newSuggestionService } = require('../main');

      if (!newSuggestionService) {
        return {
          success: false,
          error: 'Service initializing',
          suggestions: []
        };
      }

      const { content, pages, favorites } = query;

      // Appeler le service
      const suggestions = await newSuggestionService.getSuggestions({
        content,
        pages: pages || [],
        favorites: favorites || [],
        limit: 10
      });

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