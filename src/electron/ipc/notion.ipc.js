const { ipcMain } = require('electron');
const notionService = require('../services/notion.service');

function registerNotionIPC() {
  // Initialisation
  ipcMain.handle('notion:initialize', async (event, token) => {
    try {
      const cacheService = require('../services/cache.service');
      // Vider complètement le cache
      cacheService.forceCleanCache();
      cacheService.clear();
      // Réinitialiser le service Notion
      notionService.client = null;
      notionService.initialized = false;
      // Initialiser avec le nouveau token
      const result = await notionService.initialize(token);
      if (result.success) {
        // Forcer le rechargement des pages sans cache
        await notionService.fetchAllPages(false);
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Test de connexion
  ipcMain.handle('notion:test-connection', async () => {
    try {
      await notionService.testConnection();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Récupérer les pages
  ipcMain.handle('notion:get-pages', async (event, forceRefresh = false) => {
    try {
      const pages = await notionService.fetchAllPages(!forceRefresh);
      return { success: true, pages };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Envoyer du contenu
  ipcMain.handle('notion:send', async (event, data) => {
    try {
      const result = await notionService.sendToNotion(
        data.pageId,
        data.content,
        data.options
      );
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Créer une page
  ipcMain.handle('notion:create-page', async (event, data) => {
    try {
      const result = await notionService.createPage(
        data.parentId,
        data.title,
        data.content,
        data.properties
      );
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Recherche
  ipcMain.handle('notion:search', async (event, query) => {
    try {
      const results = await notionService.searchPages(query);
      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Événements
  notionService.on('pages-changed', (changes) => {
    event.sender.send('notion:pages-changed', changes);
  });
}

module.exports = registerNotionIPC;