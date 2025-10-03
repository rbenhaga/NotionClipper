const { ipcMain } = require('electron');

function registerSuggestionIPC() {
  console.log('[SUGGESTION] Registering suggestion IPC handlers...');

  ipcMain.handle('suggestion:hybrid', async (event, data) => {
    try {
      return {
        success: true,
        suggestions: [],
        message: 'Suggestions not yet implemented'
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

  ipcMain.handle('suggestion:get', async (event, query) => {
    try {
      return {
        success: true,
        suggestions: [],
        message: 'Suggestions not yet implemented'
      };
    } catch (error) {
      return {
        success: false,
        suggestions: []
      };
    }
  });

  console.log('[OK] Suggestion IPC handlers registered');
}

module.exports = registerSuggestionIPC;