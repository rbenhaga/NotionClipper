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
            const main = require('../main');

            console.log('[CONFIG] 📌 main object:', Object.keys(main));
            console.log('[CONFIG] 📌 servicesInitialized:', main.servicesInitialized);
            console.log('[CONFIG] 📌 newConfigService exists:', !!main.newConfigService);

            if (!main.newConfigService) {
                console.error('[CONFIG] ❌ newConfigService is null');
                return { success: false, error: 'Config service not available' };
            }

            console.log('[CONFIG] ⏳ Saving entries...');
            let tokenChanged = false;
            
            for (const [key, value] of Object.entries(config)) {
                // Ignorer les valeurs undefined/null
                if (value === undefined || value === null) {
                    console.log(`[CONFIG]   Skipping "${key}" (undefined/null)`);
                    continue;
                }
                
                console.log(`[CONFIG]   Setting "${key}"`);
                await main.newConfigService.set(key, value);
                
                if (key === 'notionToken') {
                    tokenChanged = true;
                }
            }

            // Si le token a changé, réinitialiser le NotionService
            if (tokenChanged && config.notionToken) {
                console.log('[CONFIG] 🔄 Token changed, reinitializing NotionService...');
                const success = main.reinitializeNotionService(config.notionToken);
                if (success) {
                    console.log('[CONFIG] ✅ NotionService reinitialized with new token');
                } else {
                    console.error('[CONFIG] ❌ Failed to reinitialize NotionService');
                }
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
            console.log('[CONFIG] Verifying token with Notion API...');

            // Créer un service temporaire pour la validation
            const { ElectronNotionAPIAdapter } = require('@notion-clipper/adapters-electron');
            const { ElectronNotionService } = require('@notion-clipper/core-electron');
            
            const tempAdapter = new ElectronNotionAPIAdapter(token);
            const tempService = new ElectronNotionService(tempAdapter, null);
            
            // Tester la connexion
            const isValid = await tempService.testConnection();

            if (isValid) {
                console.log('[CONFIG] ✅ Token valid, saving...');
                // ✅ 3. Sauvegarder le token dans la config
                const { newConfigService } = require('../main');
                if (newConfigService) {
                    await newConfigService.setNotionToken(token);
                }
                
                // ✅ 4. Charger les pages immédiatement avec le service temporaire
                console.log('[CONFIG] 🔄 Loading pages after token validation...');
                try {
                    const [pages, databases] = await Promise.all([
                        tempService.getPages(false),
                        tempService.getDatabases(false)
                    ]);
                    
                    const allItems = [...pages, ...databases];
                    console.log(`[CONFIG] ✅ Preloaded ${pages.length} pages and ${databases.length} databases`);
                    
                    return {
                        success: true,
                        message: 'Token valide et sauvegardé',
                        pages: allItems // Retourner les pages préchargées
                    };
                } catch (pagesError) {
                    console.warn('[CONFIG] ⚠️ Token valid but failed to preload pages:', pagesError);
                    return {
                        success: true,
                        message: 'Token valide et sauvegardé',
                        pages: [] // Pages vides si échec du chargement
                    };
                }
            } else {
                console.log('[CONFIG] ❌ Token invalid');
                return {
                    success: false,
                    error: 'Token invalide - vérifiez vos permissions Notion'
                };
            }
        } catch (error) {
            console.error('[ERROR] Error verifying token:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors de la vérification'
            };
        }
    });
    console.log('[OK] Config IPC handlers registered');

}

module.exports = registerConfigIPC;