const { ipcMain, app } = require('electron');
const configService = require('../services/config.service');
const notionService = require('../services/notion.service');

function registerConfigIPC() {
  // Obtenir toute la config
  ipcMain.handle('config:get', async () => {
    try {
      const config = configService.getAll();
      
      // Ajouter des infos supplémentaires
      return {
        success: true,
        config: {
          ...config,
          version: app.getVersion(),
          platform: process.platform,
          firstRun: configService.isFirstRun()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtenir une valeur spécifique
  ipcMain.handle('config:get-value', async (event, key) => {
    try {
      const value = configService.get(key);
      return { success: true, value };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Sauvegarder la config
  ipcMain.handle('config:save', async (event, config) => {
    try {
      // Sauvegarder
      configService.setMultiple(config);
      
      // Si le token Notion a changé, réinitialiser
      if (config.notionToken) {
        const result = await notionService.initialize(config.notionToken);
        if (!result.success) {
          return { 
            success: false, 
            error: 'Token Notion invalide' 
          };
        }
      }

      // Après configService.save(config);
      if (config.imgbbKey !== undefined) {
        const imageService = require('../services/image.service');
        imageService.setApiKey(config.imgbbKey);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Sauvegarder une valeur spécifique
  ipcMain.handle('config:set-value', async (event, data) => {
    try {
      configService.set(data.key, data.value);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Reset config
  ipcMain.handle('config:reset', async () => {
    try {
      configService.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Exporter la config
  ipcMain.handle('config:export', async () => {
    try {
      const config = configService.getAll();
      // Retirer les données sensibles
      const { notionToken, imgbbKey, ...safeConfig } = config;
      
      return { 
        success: true, 
        config: {
          ...safeConfig,
          exportDate: new Date().toISOString(),
          version: app.getVersion()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Importer la config
  ipcMain.handle('config:import', async (event, config) => {
    try {
      // Valider et importer
      const { notionToken, imgbbKey, ...settings } = config;
      configService.setMultiple(settings);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Vérifier token Notion
  ipcMain.handle('config:verify-token', async (event, token) => {
    try {
      const result = await notionService.initialize(token);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  // Créer page preview
  ipcMain.handle('config:create-preview-page', async (event, parentId) => {
    try {
      const result = await notionService.createPreviewPage(parentId);
      if (result.success) {
        configService.set('previewPageId', result.pageId);
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  // Valider page
  ipcMain.handle('config:validate-page', async (event, url) => {
    try {
      const pageId = url.split('-').pop();
      const result = await notionService.validatePage(url, pageId);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  // Compléter onboarding
  ipcMain.handle('config:complete-onboarding', async () => {
    try {
      configService.set('onboardingCompleted', true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = registerConfigIPC;