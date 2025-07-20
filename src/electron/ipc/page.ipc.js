const { ipcMain } = require('electron');
const notionService = require('../services/notion.service');
const cacheService = require('../services/cache.service');
const configService = require('../services/config.service');
const pollingService = require('../services/polling.service');

function registerPageIPC() {
  // Créer page preview
  ipcMain.handle('page:create-preview', async (event, parentPageId) => {
    try {
      const result = await notionService.createPreviewPage(parentPageId);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Valider page Notion
  ipcMain.handle('page:validate', async (event, data) => {
    try {
      const { pageUrl, pageId } = data;
      const result = await notionService.validatePage(pageUrl, pageId);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtenir pages récentes
  ipcMain.handle('page:get-recent', async (event, limit = 10) => {
    try {
      const pages = await cacheService.getRecentPages(limit);
      return { success: true, pages };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtenir pages favorites
  ipcMain.handle('page:get-favorites', async () => {
    try {
      const favorites = configService.get('favorites') || [];
      const allPages = cacheService.getPages();
      const favPages = allPages.filter(p => favorites.includes(p.id));
      return { success: true, pages: favPages };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Toggle favori
  ipcMain.handle('page:toggle-favorite', async (event, pageId) => {
    try {
      const favorites = configService.get('favorites') || [];
      const index = favorites.indexOf(pageId);
      if (index > -1) {
        favorites.splice(index, 1);
      } else {
        favorites.push(pageId);
      }
      configService.set('favorites', favorites);
      return { success: true, isFavorite: index === -1 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Vider le cache
  ipcMain.handle('page:clear-cache', async () => {
    try {
      cacheService.clear();
      pollingService.forceSync && pollingService.forceSync();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = registerPageIPC; 