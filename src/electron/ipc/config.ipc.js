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

  // Validation du token Notion
  ipcMain.handle('config:verify-token', async (event, token) => {
    try {
      // Initialiser temporairement avec le token pour tester
      const result = await notionService.initialize(token);
      if (result.success) {
        // Test de connexion réel
        try {
          await notionService.testConnection();
          return { success: true, valid: true, message: 'Token validé avec succès !' };
        } catch (error) {
          return { success: false, valid: false, message: 'Token invalide ou permissions insuffisantes' };
        }
      } else {
        return { success: false, valid: false, message: result.error || 'Token invalide' };
      }
    } catch (error) {
      return { success: false, valid: false, message: error.message };
    }
  });

  // Création de page preview
  ipcMain.handle('config:create-preview-page', async (event, parentPageId) => {
    try {
      const result = await notionService.createPreviewPage(parentPageId);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Validation d'URL de page Notion
  ipcMain.handle('config:validate-page', async (event, pageUrl) => {
    try {
      // Extraire l'ID depuis l'URL
      const match = pageUrl.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
      if (!match) {
        return { success: false, valid: false, message: 'URL invalide' };
      }
      const pageId = match[1].replace(/-/g, '');
      // Pour l'instant, on accepte toute URL bien formée
      // La validation réelle se fera lors de l'utilisation
      return { 
        success: true, 
        valid: true, 
        pageId: pageId,
        message: 'Page configurée avec succès' 
      };
    } catch (error) {
      return { success: false, valid: false, message: error.message };
    }
  });

  // Marquer l'onboarding comme complété
  ipcMain.handle('config:complete-onboarding', async () => {
    try {
      configService.set('onboardingCompleted', true);
      configService.set('firstRun', false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = registerConfigIPC;