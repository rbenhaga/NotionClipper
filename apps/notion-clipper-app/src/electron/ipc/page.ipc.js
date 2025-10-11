// apps/notion-clipper-app/src/electron/ipc/page.ipc.js
const { ipcMain } = require('electron');

function registerPageIPC() {
  console.log('[PAGE] Registering page IPC handlers...');

  // Get recent pages basées sur last_edited_time de Notion
  ipcMain.handle('page:get-recent', async (event, limit = 10) => {
    try {
      const { newNotionService } = require('../main');

      if (!newNotionService) {
        return { success: false, error: 'Service not initialized' };
      }

      // Récupérer TOUTES les pages
      const allPages = await newNotionService.getPages(false);

      // Trier par last_edited_time (de Notion)
      const recentPages = allPages
        .filter(p => p.last_edited_time)
        .sort((a, b) => {
          const dateA = new Date(a.last_edited_time).getTime();
          const dateB = new Date(b.last_edited_time).getTime();
          return dateB - dateA; // Plus récent en premier
        })
        .slice(0, limit)
        .map(page => ({
          id: page.id,
          title: page.title,
          icon: page.icon,
          last_edited_time: page.last_edited_time,
          parent: page.parent
        }));

      return {
        success: true,
        pages: recentPages
      };
    } catch (error) {
      console.error('[ERROR] Error getting recent pages:', error);
      return { success: false, pages: [] };
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

  // SUPPRIMÉ: 'page:add-recent' - plus nécessaire car basé sur last_edited_time

  console.log('[OK] Page IPC handlers registered');
}

module.exports = registerPageIPC;