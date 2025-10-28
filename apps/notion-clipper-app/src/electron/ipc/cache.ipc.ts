import { ipcMain, type IpcMainInvokeEvent } from 'electron';

/**
 * Setup Cache IPC handlers
 */
export function setupCacheIPC() {
  console.log('[CACHE] Registering cache IPC handlers...');

  // Clear cache
  ipcMain.handle('cache:clear', async (_event: IpcMainInvokeEvent) => {
    try {
      console.log('[CACHE] Clearing cache...');
      
      // Dynamic require to avoid circular dependencies
      const main = require('../main');
      const { newCacheService } = main;

      if (!newCacheService) {
        console.warn('[CACHE] Cache service not available');
        return { success: true }; // Return success anyway
      }

      // Clear all cache
      await newCacheService.clear();
      console.log('[CACHE] ✅ Cache cleared successfully');

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

  console.log('[CACHE] ✅ Cache IPC handlers registered');
}
