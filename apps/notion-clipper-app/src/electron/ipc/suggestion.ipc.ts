import { ipcMain, type IpcMainInvokeEvent } from 'electron';

/**
 * Setup Suggestion IPC handlers
 */
export function setupSuggestionIPC() {
  console.log('[SUGGESTION] Registering suggestion IPC handlers...');

  // Get suggestions
  ipcMain.handle('suggestion:get', async (_event: IpcMainInvokeEvent, query: string) => {
    try {
      console.log('[SUGGESTION] Getting suggestions for query:', query);
      
      // Dynamic require to avoid circular dependencies
      const main = require('../main');
      const { newSuggestionService } = main;

      if (!newSuggestionService) {
        console.warn('[SUGGESTION] Suggestion service not available');
        return { success: true, suggestions: [] };
      }

      const suggestions = await newSuggestionService.getSuggestions(query);
      return { success: true, suggestions };
    } catch (error) {
      console.error('[SUGGESTION] Error getting suggestions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      };
    }
  });

  // Clear suggestion cache
  ipcMain.handle('suggestion:clear-cache', async (_event: IpcMainInvokeEvent) => {
    try {
      console.log('[SUGGESTION] Clearing suggestion cache...');
      
      // Dynamic require to avoid circular dependencies
      const main = require('../main');
      const { newSuggestionService } = main;

      if (!newSuggestionService) {
        console.warn('[SUGGESTION] Suggestion service not available');
        return { success: true }; // Return success anyway
      }

      // Clear the cache
      await newSuggestionService.clearCache();
      console.log('[SUGGESTION] ✅ Suggestion cache cleared successfully');

      return { success: true };
    } catch (error) {
      console.error('[SUGGESTION] ❌ Error clearing suggestion cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  console.log('[SUGGESTION] ✅ Suggestion IPC handlers registered');
}
