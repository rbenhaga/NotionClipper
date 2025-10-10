// apps/notion-clipper-app/src/electron/ipc/page.ipc.js
const { ipcMain } = require('electron');

function registerPageIPC() {
  console.log('[PAGE] Registering page IPC handlers...');

  // Get recent pages
  ipcMain.handle('page:get-recent', async (event, limit = 10) => {
    try {
      const { newCacheService } = require('../main');
      
      if (!newCacheService) {
        return { success: false, error: 'Cache service not initialized' };
      }

      const recentPages = await newCacheService.get('recentPages') || [];
      
      return {
        success: true,
        pages: recentPages.slice(0, limit)
      };
    } catch (error) {
      console.error('[ERROR] Error getting recent pages:', error);
      return {
        success: false,
      };
    }
  });

  // Get favorite pages
  ipcMain.handle('page:get-favorites', async () => {
    try {
      const { newConfigService } = require('../main');
      
      if (!newConfigService) {
        return { success: false, error: 'Config service not initialized' };
      }

      const favorites = await newConfigService.get('favoritePages') || [];
      
      return {
        success: true,
        favorites: favorites
      };
    } catch (error) {
      console.error('[ERROR] Error getting favorites:', error);
      return {
        success: false,
        error: error.message,
        favorites: []
      };
    }
  });

  // ✅ HANDLER POUR TOGGLE FAVORITE
  ipcMain.handle('page:toggle-favorite', async (event, data) => {
    try {
      console.log('[PAGE] Toggling favorite for page:', data?.pageId);
      
      const { newConfigService } = require('../main');
      
      if (!newConfigService) {
        return { success: false, error: 'Config service not initialized' };
      }

      if (!data?.pageId) {
        return { success: false, error: 'Page ID is required' };
      }

      // Récupérer la liste actuelle des favoris
      const favorites = await newConfigService.get('favoritePages') || [];
      
      // Toggle le favori
      let isFavorite = false;
      let updatedFavorites = [];
      
      if (favorites.includes(data.pageId)) {
        // Retirer des favoris
        updatedFavorites = favorites.filter(id => id !== data.pageId);
        isFavorite = false;
        console.log('[PAGE] Removed from favorites:', data.pageId);
      } else {
        // Ajouter aux favoris
        updatedFavorites = [...favorites, data.pageId];
        isFavorite = true;
        console.log('[PAGE] Added to favorites:', data.pageId);
      }
      
      // Sauvegarder la liste mise à jour
      await newConfigService.set('favoritePages', updatedFavorites);
      
      return {
        success: true,
        isFavorite: isFavorite,
        favorites: updatedFavorites
      };
    } catch (error) {
      console.error('[ERROR] Error toggling favorite:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Validate page URL/ID
  ipcMain.handle('page:validate', async (event, data) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: false, error: 'Notion service not initialized' };
      }

      const { pageId } = data;
      
      if (!pageId) {
        return { success: false, error: 'Page ID is required' };
      }

      // Essayer de récupérer les infos de la page
      const page = await newNotionService.getPageInfo(pageId);
      
      return {
        success: true,
        valid: !!page,
        page: page
      };
    } catch (error) {
      console.error('[ERROR] Error validating page:', error);
      return {
        success: false,
        valid: false,
        error: error.message
      };
    }
  });

  // Add page to recent
  ipcMain.handle('page:add-recent', async (event, data) => {
    try {
      const { newCacheService } = require('../main');
      
      if (!newCacheService) {
        return { success: false, error: 'Cache service not initialized' };
      }

      const { pageId, pageTitle } = data;
      
      if (!pageId) {
        return { success: false, error: 'Page ID is required' };
      }

      // Récupérer les pages récentes
      let recentPages = await newCacheService.get('recentPages') || [];
      
      // Retirer la page si elle existe déjà
      recentPages = recentPages.filter(p => p.id !== pageId);
      
      // Ajouter en début de liste
      recentPages.unshift({
        id: pageId,
        title: pageTitle || 'Sans titre',
        timestamp: Date.now()
      });
      
      // Garder seulement les 20 dernières
      recentPages = recentPages.slice(0, 20);
      
      // Sauvegarder
      await newCacheService.set('recentPages', recentPages);
      
      return {
        success: true,
        recentPages: recentPages
      };
    } catch (error) {
      console.error('[ERROR] Error adding to recent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[OK] Page IPC handlers registered');
}

module.exports = registerPageIPC;