// apps/notion-clipper-app/src/electron/ipc/suggestion.ipc.js
const { ipcMain } = require('electron');

// Import du service de suggestions
const { ElectronSuggestionService } = require('@notion-clipper/core-electron');

// Instance du service
let suggestionService = null;

function registerSuggestionIPC() {
  console.log('[SUGGESTION] Registering suggestion IPC handlers...');

  // Initialiser le service
  if (!suggestionService) {
    suggestionService = new ElectronSuggestionService();
    console.log('[SUGGESTION] Service initialized');
  }

  /**
   * Get hybrid suggestions (NLP + usage + favorites)
   */
  ipcMain.handle('suggestion:hybrid', async (event, data) => {
    try {
      const { newNotionService, newConfigService } = require('../main');

      if (!newNotionService || !newConfigService) {
        console.warn('[SUGGESTION] Services not initialized');
        return {
          success: true,
          suggestions: []
        };
      }

      console.log('[SUGGESTION] Getting hybrid suggestions...', {
        contentLength: data.content?.length || 0,
        pagesCount: data.pages?.length || 0
      });

      // Get favorites
      const favorites = await newConfigService.getFavorites();

      // Get usage history if available
      const usageHistory = (await newConfigService.get('usageHistory')) || {};

      // Get suggestions
      const suggestions = await suggestionService.getHybridSuggestions(
        data.content || '',
        data.pages || [],
        favorites,
        usageHistory
      );

      console.log(`[SUGGESTION] Returning ${suggestions.length} suggestions`);

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
   * Get suggestions with detailed scoring
   */
  ipcMain.handle('suggestion:get', async (event, data) => {
    try {
      const { newNotionService, newConfigService } = require('../main');

      if (!newNotionService || !newConfigService) {
        return {
          success: true,
          suggestions: []
        };
      }

      console.log('[SUGGESTION] Getting detailed suggestions...');

      // Get favorites
      const favorites = await newConfigService.getFavorites();

      // Get usage history
      const usageHistory = (await newConfigService.get('usageHistory')) || {};

      // Get suggestions with scoring details
      const suggestions = await suggestionService.getSuggestions(
        data.content || '',
        data.pages || [],
        favorites,
        {
          maxSuggestions: data.maxSuggestions || 5,
          includeRecent: data.includeRecent !== false,
          includeFavorites: data.includeFavorites !== false,
          usageHistory
        }
      );

      console.log(`[SUGGESTION] Returning ${suggestions.length} detailed suggestions`);

      return {
        success: true,
        suggestions: suggestions.map(s => ({
          page: s.page,
          score: s.score,
          reasons: s.reasons
        }))
      };
    } catch (error) {
      console.error('[ERROR] Error getting suggestions:', error);
      return {
        success: true,
        suggestions: []
      };
    }
  });

  /**
   * Clear suggestion cache (if needed in the future)
   */
  ipcMain.handle('suggestion:clear-cache', async () => {
    try {
      console.log('[SUGGESTION] Cache cleared');
      return {
        success: true
      };
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