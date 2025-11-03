// apps/notion-clipper-app/src/electron/ipc/config.ipc.ts
import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

interface ConfigService {
  getAll(): Promise<Record<string, any>>;
  getNotionToken(): Promise<string | null>;
  set(key: string, value: any): Promise<void>;
  setNotionToken(token: string): Promise<void>;
  get(key: string): Promise<any>;
}

interface ConfigIPCParams {
  newConfigService: ConfigService;
}

function registerConfigIPC({ newConfigService }: ConfigIPCParams): void {
  console.log('[CONFIG] Registering config IPC handlers...');

  ipcMain.handle('config:get', async (_event: IpcMainInvokeEvent) => {
    try {
      if (!newConfigService) {
        return { success: true, config: {} };
      }

      const config = await newConfigService.getAll();

      // ✅ Ajouter uniquement le token déchiffré - SIMPLE ET RAPIDE
      const decryptedToken = await newConfigService.getNotionToken();
      if (decryptedToken) {
        config.notionToken = decryptedToken;
        // Pas d'appel API getUserInfo - Performance optimale
      }

      return { success: true, config: config || {} };
    } catch (error: any) {
      console.error('[CONFIG] Error getting config:', error);
      return { success: false, error: error.message, config: {} };
    }
  });

  // ✅ Handler config:save - simplifié
  ipcMain.handle('config:save', async (_event: IpcMainInvokeEvent, config: Record<string, any>) => {
    try {
      if (!newConfigService) {
        return { success: false, error: 'Config service not available' };
      }

      for (const [key, value] of Object.entries(config)) {
        // ✅ Filtrage simple - ignorer uniquement le token (géré séparément)
        if (key === 'notionToken') {
          continue;
        }

        if (value !== undefined && value !== null) {
          await newConfigService.set(key, value);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('[CONFIG] Error saving config:', error);
      return { success: false, error: error.message };
    }
  });

  // ✅ Handler config:set - pour définir une clé spécifique
  ipcMain.handle('config:set', async (_event: IpcMainInvokeEvent, key: string, value: any) => {
    try {
      if (!newConfigService) {
        return { success: false, error: 'Config service not available' };
      }

      // Filtrage - ignorer le token (géré séparément)
      if (key === 'notionToken') {
        return { success: false, error: 'Use dedicated token methods' };
      }

      // Pour les booléens, utiliser une approche plus simple
      if (typeof value === 'boolean') {
        const configAdapter = newConfigService as any;
        if (configAdapter.adapter && configAdapter.adapter.store) {
          // Accès direct au store pour éviter les problèmes de nested config
          configAdapter.adapter.store.set(key, value);
          return { success: true };
        }
      }

      await newConfigService.set(key, value);
      return { success: true };
    } catch (error: any) {
      console.error('[CONFIG] Error setting config key:', key, error);
      return { success: false, error: error.message };
    }
  });

  // ✅ Handler config:reset - NETTOYAGE COMPLET
  ipcMain.handle('config:reset', async (_event: IpcMainInvokeEvent) => {
    try {
      console.log('[CONFIG] 🧹 Starting complete reset...');
      
      if (!newConfigService) {
        return { success: false, error: 'Config service not available' };
      }

      // 1. Reset config service
      await newConfigService.setNotionToken('');
      await newConfigService.set('onboardingCompleted', false);
      await newConfigService.set('favoritePages', []);
      await newConfigService.set('theme', 'light');
      await newConfigService.set('recentPages', []);
      await newConfigService.set('workspaceName', '');
      await newConfigService.set('workspaceIcon', '');
      console.log('[CONFIG] ✅ Config service reset');

      // 2. Clear all caches
      const main = require('../main');
      const { newCacheService, newHistoryService, newQueueService } = main;

      if (newCacheService) {
        await newCacheService.clear();
        console.log('[CONFIG] ✅ Cache service cleared');
      }

      // 3. Clear history
      if (newHistoryService) {
        await newHistoryService.clear();
        console.log('[CONFIG] ✅ History service cleared');
      }

      // 4. Clear queue
      if (newQueueService) {
        await newQueueService.clear();
        console.log('[CONFIG] ✅ Queue service cleared');
      }

      console.log('[CONFIG] 🎉 Complete reset finished');
      return { success: true };
    } catch (error: any) {
      console.error('[CONFIG] Error resetting config:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[CONFIG] ✅ Config IPC handlers registered');
}

export default registerConfigIPC;