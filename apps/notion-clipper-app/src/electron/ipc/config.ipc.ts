import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

interface ConfigService {
  getAll(): Promise<Record<string, any>>;
  getNotionToken(): Promise<string | null>;
  set(key: string, value: any): Promise<void>;
  setNotionToken(token: string): Promise<void>;
  get(key: string): Promise<any>;
  isConfigured(): Promise<boolean>;
  getFavorites(): Promise<string[]>;
  addFavorite(pageId: string): Promise<void>;
  removeFavorite(pageId: string): Promise<void>;
}

interface ConfigIPCParams {
  newConfigService: ConfigService;
}

function registerConfigIPC({ newConfigService }: ConfigIPCParams): void {
    console.log('[CONFIG] Registering config IPC handlers...');

    ipcMain.handle('config:get', async (_event: IpcMainInvokeEvent) => {
        try {
            console.log('[CONFIG] 🔍 Starting config:get...');
            
            if (!newConfigService) {
                console.log('[CONFIG] ❌ newConfigService is null');
                return { success: true, config: {} };
            }

            const config = await newConfigService.getAll();
            
            // ✅ FIX: Ajouter le token déchiffré pour l'affichage dans ConfigPanel
            const decryptedToken = await newConfigService.getNotionToken();
            if (decryptedToken) {
                config.notionToken = decryptedToken;
            }

            return {
                success: true,
                config: config || {}
            };
        } catch (error: any) {
            console.error('[ERROR] Error getting config:', error);
            return {
                success: false,
                error: error.message,
                config: {}
            };
        }
    });

    ipcMain.handle('config:save', async (_event: IpcMainInvokeEvent, config: Record<string, any>) => {
        console.log('[CONFIG] 🔍 Starting config:save...');
        console.log('[CONFIG] 📦 Config keys:', Object.keys(config));
        console.log('[CONFIG] 📦 Has notionToken:', !!config.notionToken);

        try {
            if (!newConfigService) {
                console.error('[CONFIG] ❌ newConfigService is null');
                return { success: false, error: 'Config service not available' };
            }

            console.log('[CONFIG] ⏳ Saving entries...');
            
            for (const [key, value] of Object.entries(config)) {
                // Ignorer les valeurs undefined/null
                if (value === undefined || value === null) {
                    console.log(`[CONFIG]   Skipping "${key}" (undefined/null)`);
                    continue;
                }
                
                console.log(`[CONFIG]   Setting "${key}" = ${key === 'notionToken' ? '***' : value}`);
                
                // ✅ IMPORTANT: Pour le token, utiliser setNotionToken qui gère le chiffrement
                if (key === 'notionToken') {
                    console.log(`[CONFIG] ⚠️ Skipping notionToken save (length: ${value?.length || 'undefined'}, start: ${value?.substring(0, 10) || 'undefined'}...)`);
                    console.log(`[CONFIG] ⚠️ Token should only be saved via OAuth, not config save`);
                    // Ne pas sauvegarder le token via config save pour éviter la corruption
                } else {
                    await newConfigService.set(key, value);
                }
            }

            console.log('[CONFIG] ✅ Saved successfully');
            return { success: true };

        } catch (error: any) {
            console.error('[CONFIG] ❌ Error:', error.message);
            console.error('[CONFIG] ❌ Stack:', error.stack);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('config:get-value', async (_event: IpcMainInvokeEvent, key: string) => {
        try {
            if (!newConfigService) {
                return { success: true, value: null };
            }

            const value = await newConfigService.get(key);

            return {
                success: true,
                value
            };
        } catch (error: any) {
            console.error('[ERROR] Error getting value:', error);
            return {
                success: false,
                error: error.message,
                value: null
            };
        }
    });

    ipcMain.handle('config:set-value', async (_event: IpcMainInvokeEvent, data: { key: string; value: any }) => {
        try {
            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.set(data.key, data.value);

            return {
                success: true
            };
        } catch (error: any) {
            console.error('[ERROR] Error setting value:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:reset', async (_event: IpcMainInvokeEvent) => {
        try {
            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            // ✅ RESET COMPLET : Remettre TOUTES les variables par défaut
            console.log('[CONFIG] 🔄 Resetting ALL config to defaults...');
            
            // 1. Token et onboarding
            await newConfigService.setNotionToken('');
            await newConfigService.set('onboardingCompleted', false);
            
            // 2. Favoris
            await newConfigService.set('favoritePages', []);
            
            // 3. Préférences utilisateur
            await newConfigService.set('autoDetectClipboard', true);
            await newConfigService.set('parseAsMarkdown', true);
            await newConfigService.set('defaultContentType', 'paragraph');
            
            // 4. États UI
            await newConfigService.set('sidebarCollapsed', false);
            await newConfigService.set('isMinimalist', false);
            await newConfigService.set('isPinned', false);
            
            // 5. Autres données
            await newConfigService.set('recentPages', []);
            await newConfigService.set('lastSync', null);
            
            console.log('[CONFIG] ✅ Complete config reset: ALL variables back to defaults');

            return {
                success: true,
                message: 'Configuration complètement réinitialisée'
            };
        } catch (error: any) {
            console.error('[ERROR] Error resetting config:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:complete-onboarding', async (_event: IpcMainInvokeEvent) => {
        try {
            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.set('onboardingCompleted', true);

            return {
                success: true
            };
        } catch (error: any) {
            console.error('[ERROR] Error completing onboarding:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:get-notion-token', async (_event: IpcMainInvokeEvent) => {
        try {
            if (!newConfigService) {
                return { success: true, token: null };
            }

            const token = await newConfigService.getNotionToken();

            return {
                success: true,
                token
            };
        } catch (error: any) {
            console.error('[ERROR] Error getting token:', error);
            return {
                success: false,
                error: error.message,
                token: null
            };
        }
    });

    ipcMain.handle('config:set-notion-token', async (_event: IpcMainInvokeEvent, token: string) => {
        try {
            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.setNotionToken(token);

            return {
                success: true
            };
        } catch (error: any) {
            console.error('[ERROR] Error setting token:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:is-configured', async (_event: IpcMainInvokeEvent) => {
        try {
            if (!newConfigService) {
                return { success: true, configured: false };
            }

            const configured = await newConfigService.isConfigured();

            return {
                success: true,
                configured
            };
        } catch (error: any) {
            console.error('[ERROR] Error checking config:', error);
            return {
                success: true,
                configured: false
            };
        }
    });

    ipcMain.handle('config:get-favorites', async (_event: IpcMainInvokeEvent) => {
        try {
            if (!newConfigService) {
                return { success: true, favorites: [] };
            }

            const favorites = await newConfigService.getFavorites();

            return {
                success: true,
                favorites: favorites || []
            };
        } catch (error: any) {
            console.error('[ERROR] Error getting favorites:', error);
            return {
                success: true,
                favorites: []
            };
        }
    });

    ipcMain.handle('config:add-favorite', async (_event: IpcMainInvokeEvent, pageId: string) => {
        try {
            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.addFavorite(pageId);

            return {
                success: true
            };
        } catch (error: any) {
            console.error('[ERROR] Error adding favorite:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:remove-favorite', async (_event: IpcMainInvokeEvent, pageId: string) => {
        try {
            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.removeFavorite(pageId);

            return {
                success: true
            };
        } catch (error: any) {
            console.error('[ERROR] Error removing favorite:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    console.log('[OK] Config IPC handlers registered');
}

export default registerConfigIPC;