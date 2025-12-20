import { ipcMain, type IpcMainInvokeEvent } from 'electron';

/**
 * Setup Cache IPC handlers
 */
export function setupCacheIPC() {
  console.log('[CACHE] Registering cache IPC handlers...');

  // Clear cache - NETTOYAGE COMPLET
  ipcMain.handle('cache:clear', async (_event: IpcMainInvokeEvent) => {
    try {
      console.log('[CACHE] 🧹 Starting complete cache clear...');
      
      // Dynamic require to avoid circular dependencies
      const main = require('../main');
      const { newCacheService, newHistoryService, newQueueService } = main;

      // 1. Clear cache service
      if (newCacheService) {
        await newCacheService.clear();
        console.log('[CACHE] ✅ Cache service cleared');
      }

      // 2. Clear history service
      if (newHistoryService) {
        await newHistoryService.clear();
        console.log('[CACHE] ✅ History service cleared');
      }

      // 3. Clear queue service
      if (newQueueService) {
        await newQueueService.clear();
        console.log('[CACHE] ✅ Queue service cleared');
      }

      // 4. Send message to renderer to clear localStorage
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.executeJavaScript(`
          // Clear all localStorage
          localStorage.clear();
          console.log('[CACHE] ✅ localStorage cleared');
          
          // Clear specific keys if localStorage.clear() doesn't work
          const keysToRemove = [
            'offline-queue',
            'offline-history', 
            'windowPreferences',
            'notion-clipper-config',
            'notion-clipper-cache'
          ];
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
          });
          
          console.log('[CACHE] ✅ Specific localStorage keys cleared');
        `);
        console.log('[CACHE] ✅ localStorage clear command sent to renderer');
      }

      console.log('[CACHE] 🎉 Complete cache clear finished');
      return { success: true };
    } catch (error) {
      console.error('[CACHE] ❌ Error clearing cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get cache value
  ipcMain.handle('cache:get', async (_event: IpcMainInvokeEvent, key: string) => {
    try {
      const main = require('../main');
      const { newCacheService } = main;

      if (!newCacheService) {
        return { success: false, error: 'Cache service not available' };
      }

      const value = await newCacheService.get(key);
      return { success: true, value };
    } catch (error) {
      console.error('[CACHE] Error getting cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Set cache value
  ipcMain.handle('cache:set', async (_event: IpcMainInvokeEvent, data: { key: string; value: any; ttl?: number }) => {
    try {
      const main = require('../main');
      const { newCacheService } = main;

      if (!newCacheService) {
        return { success: false, error: 'Cache service not available' };
      }

      await newCacheService.set(data.key, data.value, data.ttl);
      return { success: true };
    } catch (error) {
      console.error('[CACHE] Error setting cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Delete cache value
  ipcMain.handle('cache:delete', async (_event: IpcMainInvokeEvent, key: string) => {
    try {
      const main = require('../main');
      const { newCacheService } = main;

      if (!newCacheService) {
        return { success: false, error: 'Cache service not available' };
      }

      await newCacheService.delete(key);
      return { success: true };
    } catch (error) {
      console.error('[CACHE] Error deleting cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================
  // 🔧 SCOPED CACHE HANDLERS (for user/workspace isolation)
  // ============================================

  /**
   * Clear cache for a specific scope (user/workspace)
   * Called when user logs out or switches workspace
   */
  ipcMain.handle('cache:clearScope', async (_event: IpcMainInvokeEvent, scopeKey: string) => {
    try {
      console.log(`[CACHE] 🧹 Clearing cache for scope: ${scopeKey}`);
      
      const main = require('../main');
      const { newCacheService } = main;

      if (!newCacheService) {
        return { success: false, error: 'Cache service not available' };
      }

      // Use the new clearScope method if available
      if (typeof newCacheService.clearScope === 'function') {
        const cleared = await newCacheService.clearScope(scopeKey);
        console.log(`[CACHE] ✅ Cleared ${cleared} entries for scope: ${scopeKey}`);
        return { success: true, cleared };
      }

      // Fallback: clear all cache (less efficient but safe)
      console.log('[CACHE] ⚠️ clearScope not available, clearing all cache');
      await newCacheService.clear();
      return { success: true, cleared: -1 };
    } catch (error) {
      console.error('[CACHE] Error clearing scope:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Clear all Notion-related cache (pages, databases, etc.)
   * Called when user switches workspace or logs out
   */
  ipcMain.handle('cache:clearNotionCache', async (_event: IpcMainInvokeEvent) => {
    try {
      console.log('[CACHE] 🧹 Clearing all Notion cache...');
      
      const main = require('../main');
      const { newCacheService } = main;

      if (!newCacheService) {
        return { success: false, error: 'Cache service not available' };
      }

      // Get all keys and delete Notion-related ones
      const keys = await newCacheService.keys();
      const notionKeys = keys.filter((key: string) => 
        key.includes('notion:') || 
        key.includes('page:') || 
        key.includes('database:')
      );

      for (const key of notionKeys) {
        await newCacheService.delete(key);
      }

      console.log(`[CACHE] ✅ Cleared ${notionKeys.length} Notion cache entries`);
      return { success: true, cleared: notionKeys.length };
    } catch (error) {
      console.error('[CACHE] Error clearing Notion cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  console.log('[CACHE] ✅ Cache IPC handlers registered');
}
