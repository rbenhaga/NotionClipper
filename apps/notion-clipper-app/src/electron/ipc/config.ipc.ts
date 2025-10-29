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

  // ✅ Handler config:reset
  ipcMain.handle('config:reset', async (_event: IpcMainInvokeEvent) => {
    try {
      if (!newConfigService) {
        return { success: false, error: 'Config service not available' };
      }

      await newConfigService.setNotionToken('');
      await newConfigService.set('onboardingCompleted', false);
      await newConfigService.set('favoritePages', []);
      await newConfigService.set('theme', 'light');
      await newConfigService.set('recentPages', []);

      return { success: true };
    } catch (error: any) {
      console.error('[CONFIG] Error resetting config:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[CONFIG] ✅ Config IPC handlers registered');
}

export default registerConfigIPC;