const { ipcMain } = require('electron');
const notionService = require('../services/notion.service');

function registerNotionIPC() {
  // Initialisation
  ipcMain.handle('notion:initialize', async (event, token) => {
    return await notionService.initialize(token);
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