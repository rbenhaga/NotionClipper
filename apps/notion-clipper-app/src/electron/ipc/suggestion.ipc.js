const { ipcMain } = require('electron');
const suggestionService = require('../services/suggestion.service');
const cacheService = require('../services/cache.service');

function registerSuggestionIPC() {
  ipcMain.handle('suggestion:get', async (event, query) => {
    try {
      const pages = cacheService.getPages();
      const suggestions = suggestionService.getSuggestions(query, pages);
      return { success: true, suggestions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('suggestion:clear-cache', async () => {
    try {
      suggestionService.clearCache();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('suggestion:hybrid', async (event, data) => {
    try {
      const { clipboardContent, favorites = [], useSemantic = true, semanticThreshold = 20 } = data;
      const pages = cacheService.getPages();
      if (!clipboardContent || pages.length === 0) {
        return { success: true, suggestions: [], method: 'none' };
      }
      // Pour l'instant, utiliser uniquement lexical (sémantique à implémenter)
      const suggestions = suggestionService.getSuggestions(clipboardContent, pages);
      return {
        success: true,
        suggestions: suggestions.slice(0, 10),
        method: 'lexical' // Changera en 'hybrid' quand sémantique implémenté
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = registerSuggestionIPC; 