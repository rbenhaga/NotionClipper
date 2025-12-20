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

  // Hybrid suggestions (for UI)
  ipcMain.handle('suggestion:hybrid', async (_event: IpcMainInvokeEvent, data: any) => {
    try {
      console.log('[SUGGESTION] Getting hybrid suggestions:', data);
      
      // Dynamic require to avoid circular dependencies
      const main = require('../main');
      const { newSuggestionService, newNotionService } = main;

      // 🔧 FIX: Block suggestions if NotionService is not available (user logged out)
      if (!newNotionService) {
        console.log('[SUGGESTION] NotionService not available (user logged out), returning empty');
        return { success: true, suggestions: [] };
      }

      if (!newSuggestionService) {
        console.warn('[SUGGESTION] Suggestion service not available');
        return { success: true, suggestions: [] };
      }

      const suggestions = await newSuggestionService.getSuggestions({
        text: data.content || '',
        maxSuggestions: 10,
        includeContent: false
      });

      return { 
        success: true, 
        suggestions: suggestions.suggestions.map(s => ({
          id: s.pageId,
          title: s.title,
          score: s.score,
          reasons: s.reasons,
          last_edited_time: s.lastModified,
          isFavorite: s.isFavorite
        }))
      };
    } catch (error) {
      console.error('[SUGGESTION] Error getting hybrid suggestions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      };
    }
  });

  console.log('[SUGGESTION] ✅ Suggestion IPC handlers registered');
}
