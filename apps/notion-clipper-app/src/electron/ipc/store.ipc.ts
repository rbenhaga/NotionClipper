// apps/notion-clipper-app/src/electron/ipc/store.ipc.ts
import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import Store from 'electron-store';

// Instance partagée du store
const store = new Store();

/**
 * Register Store IPC handlers for electron-store persistence
 */
export function registerStoreIPC(): void {
  console.log('[STORE] Registering store IPC handlers...');

  // Get value from store
  ipcMain.handle('store:get', async (_event: IpcMainInvokeEvent, key: string, defaultValue?: any) => {
    try {
      const value = store.get(key, defaultValue);
      console.log(`[STORE] Get "${key}":`, value ? 'found' : 'not found');
      return value;
    } catch (error) {
      console.error(`[STORE] ❌ Error getting "${key}":`, error);
      return defaultValue;
    }
  });

  // Set value in store
  ipcMain.handle('store:set', async (_event: IpcMainInvokeEvent, key: string, value: any) => {
    try {
      store.set(key, value);
      console.log(`[STORE] Set "${key}":`, Array.isArray(value) ? `array[${value.length}]` : typeof value);
      return { success: true };
    } catch (error) {
      console.error(`[STORE] ❌ Error setting "${key}":`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Delete value from store
  ipcMain.handle('store:delete', async (_event: IpcMainInvokeEvent, key: string) => {
    try {
      store.delete(key);
      console.log(`[STORE] Deleted "${key}"`);
      return { success: true };
    } catch (error) {
      console.error(`[STORE] ❌ Error deleting "${key}":`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Clear all store data
  ipcMain.handle('store:clear', async (_event: IpcMainInvokeEvent) => {
    try {
      store.clear();
      console.log('[STORE] Cleared all data');
      return { success: true };
    } catch (error) {
      console.error('[STORE] ❌ Error clearing store:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  console.log('[STORE] ✅ Store IPC handlers registered');
}
