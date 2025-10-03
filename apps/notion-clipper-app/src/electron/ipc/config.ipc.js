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
    try {
      const { newConfigService } = require('../main');
      
      if (!newConfigService) {
        return { success: false, error: 'Service initializing' };
      }

      for (const [key, value] of Object.entries(config)) {
        await newConfigService.set(key, value);
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error('[ERROR] Error saving config:', error);
      return {
        success: false,
        error: error.message
      };
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

  console.log('[OK] Config IPC handlers registered');
}

module.exports = registerConfigIPC;