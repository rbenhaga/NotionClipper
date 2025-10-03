const { ipcMain } = require('electron');

function registerNotionIPC() {
  console.log('[CONFIG] Registering Notion IPC handlers...');

  ipcMain.handle('notion:initialize', async (event, token) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }

      await newNotionService.initialize(token);
      
      return {
        success: true,
        message: 'Notion initialized successfully'
      };
    } catch (error) {
      console.error('[ERROR] Error initializing Notion:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('notion:test-connection', async () => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }

      const result = await newNotionService.testConnection();
      return result;
    } catch (error) {
      console.error('[ERROR] Error testing connection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('notion:get-pages', async (event, refresh = false) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: true, pages: [] };
      }

      const pages = await newNotionService.getPages(refresh);
      
      return {
        success: true,
        pages: pages || []
      };
    } catch (error) {
      console.error('[ERROR] Error getting pages:', error);
      return {
        success: false,
        error: error.message,
        pages: []
      };
    }
  });

  ipcMain.handle('notion:send', async (event, data) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }

      const result = await newNotionService.sendContent(
        data.pageId,
        data.content,
        data.type
      );
      
      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('[ERROR] Error sending to Notion:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('notion:create-page', async (event, data) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }

      const page = await newNotionService.createPage(data);
      
      return {
        success: true,
        page
      };
    } catch (error) {
      console.error('[ERROR] Error creating page:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('notion:search', async (event, query) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: true, results: [] };
      }

      const results = await newNotionService.search(query);
      
      return {
        success: true,
        results: results || []
      };
    } catch (error) {
      console.error('[ERROR] Error searching:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  });

  ipcMain.handle('notion:get-page-info', async (event, pageId) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }

      const page = await newNotionService.getPageInfo(pageId);
      
      return {
        success: true,
        page
      };
    } catch (error) {
      console.error('[ERROR] Error getting page info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('notion:get-database-schema', async (event, databaseId) => {
    try {
      const { newNotionService } = require('../main');
      
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }

      const schema = await newNotionService.getDatabaseSchema(databaseId);
      
      return {
        success: true,
        schema
      };
    } catch (error) {
      console.error('[ERROR] Error getting database schema:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[OK] Notion IPC handlers registered');
}

module.exports = registerNotionIPC;