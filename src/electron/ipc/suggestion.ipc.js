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
}

module.exports = registerSuggestionIPC; 