const { ipcMain } = require('electron');

function registerConfigIPC() {
    console.log('[CONFIG] Registering config IPC handlers...');

    ipcMain.handle('config:get', async () => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: true, config: {} };
            }

            const config = await newConfigService.getAll();

            return {
                success: true,
                config: config || {}
            };
        } catch (error) {
            console.error('[ERROR] Error getting config:', error);
            return {
                success: false,
                error: error.message,
                config: {}
            };
        }
    });

    ipcMain.handle('config:save', async (event, config) => {
        console.log('[CONFIG] 🔍 Starting config:save...');
        console.log('[CONFIG] 📦 Config:', JSON.stringify(config, null, 2));

        try {
            // Force un nouveau require pour être sûr d'avoir la dernière valeur
            delete require.cache[require.resolve('../main')];
            const main = require('../main');

            console.log('[CONFIG] 📌 main object:', Object.keys(main));
            console.log('[CONFIG] 📌 servicesInitialized:', main.servicesInitialized);
            console.log('[CONFIG] 📌 newConfigService exists:', !!main.newConfigService);

            if (!main.newConfigService) {
                console.error('[CONFIG] ❌ newConfigService is null');
                return { success: false, error: 'Config service not available' };
            }

            console.log('[CONFIG] ⏳ Saving entries...');
            for (const [key, value] of Object.entries(config)) {
                console.log(`[CONFIG]   Setting "${key}"`);
                await main.newConfigService.set(key, value);
            }

            console.log('[CONFIG] ✅ Saved successfully');
            return { success: true };

        } catch (error) {
            console.error('[CONFIG] ❌ Error:', error.message);
            console.error('[CONFIG] ❌ Stack:', error.stack);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('config:get-value', async (event, key) => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: true, value: null };
            }

            const value = await newConfigService.get(key);

            return {
                success: true,
                value
            };
        } catch (error) {
            console.error('[ERROR] Error getting value:', error);
            return {
                success: false,
                error: error.message,
                value: null
            };
        }
    });

    ipcMain.handle('config:set-value', async (event, data) => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.set(data.key, data.value);

            return {
                success: true
            };
        } catch (error) {
            console.error('[ERROR] Error setting value:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:reset', async () => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.reset();

            return {
                success: true
            };
        } catch (error) {
            console.error('[ERROR] Error resetting config:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:complete-onboarding', async () => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.set('onboardingCompleted', true);

            return {
                success: true
            };
        } catch (error) {
            console.error('[ERROR] Error completing onboarding:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:get-notion-token', async () => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: true, token: null };
            }

            const token = await newConfigService.getNotionToken();

            return {
                success: true,
                token
            };
        } catch (error) {
            console.error('[ERROR] Error getting token:', error);
            return {
                success: false,
                error: error.message,
                token: null
            };
        }
    });

    ipcMain.handle('config:set-notion-token', async (event, token) => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.setNotionToken(token);

            return {
                success: true
            };
        } catch (error) {
            console.error('[ERROR] Error setting token:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:is-configured', async () => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: true, configured: false };
            }

            const configured = await newConfigService.isConfigured();

            return {
                success: true,
                configured
            };
        } catch (error) {
            console.error('[ERROR] Error checking config:', error);
            return {
                success: true,
                configured: false
            };
        }
    });

    ipcMain.handle('config:get-favorites', async () => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: true, favorites: [] };
            }

            const favorites = await newConfigService.getFavorites();

            return {
                success: true,
                favorites: favorites || []
            };
        } catch (error) {
            console.error('[ERROR] Error getting favorites:', error);
            return {
                success: true,
                favorites: []
            };
        }
    });

    ipcMain.handle('config:add-favorite', async (event, pageId) => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.addFavorite(pageId);

            return {
                success: true
            };
        } catch (error) {
            console.error('[ERROR] Error adding favorite:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('config:remove-favorite', async (event, pageId) => {
        try {
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                return { success: false, error: 'Service initializing' };
            }

            await newConfigService.removeFavorite(pageId);

            return {
                success: true
            };
        } catch (error) {
            console.error('[ERROR] Error removing favorite:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Handler pour vérifier le token Notion
    ipcMain.handle('config:verify-token', async (event, token) => {
        try {
            const { newNotionService, newConfigService } = require('../main');

            if (!newNotionService || !newConfigService) {
                return { success: false, error: 'Services initializing' };
            }

            // Initialiser temporairement avec le token
            await newNotionService.initialize(token);

            // Tester la connexion
            const testResult = await newNotionService.testConnection();

            if (testResult.success) {
                // Si le token est valide, le sauvegarder
                await newConfigService.setNotionToken(token);
                return {
                    success: true,
                    message: 'Token valide et sauvegardé'
                };
            } else {
                return {
                    success: false,
                    error: testResult.error || 'Token invalide'
                };
            }
        } catch (error) {
            console.error('[ERROR] Error verifying token:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors de la vérification du token'
            };
        }
    });

    console.log('[OK] Config IPC handlers registered');

}

module.exports = registerConfigIPC;