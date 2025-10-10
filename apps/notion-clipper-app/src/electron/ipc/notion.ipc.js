const { ipcMain } = require('electron');

function registerNotionIPC() {
  console.log('[CONFIG] Registering Notion IPC handlers...');

  ipcMain.handle('notion:initialize', async (event, token) => {
    try {
      const { newNotionService } = require('../main');

      if (!newNotionService) {
        return { success: false, error: 'Service not ready' };
      }

      await newNotionService.setToken(token);

      return { success: true };
    } catch (error) {
      console.error('❌ Error initializing Notion:', error);
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
  
      const isConnected = await newNotionService.testConnection();
      
      return {
        success: isConnected,
        error: isConnected ? undefined : 'Connection failed'
      };
    } catch (error) {
      console.error('[ERROR] Error testing connection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('notion:get-pages', async (event, forceRefresh = false) => {
    try {
      const { newNotionService } = require('../main');
      
      console.log('[NOTION] getPages called, service available:', !!newNotionService);
      
      if (!newNotionService) {
        console.log('[NOTION] No NotionService available, returning empty pages');
        return { success: true, pages: [] };
      }
  
      console.log('[NOTION] Calling getPages and getDatabases...');
      const [pages, databases] = await Promise.all([
        newNotionService.getPages(forceRefresh),
        newNotionService.getDatabases(forceRefresh)
      ]);
      console.log('[NOTION] API calls completed');
  
      const allItems = [...pages, ...databases];
  
      console.log(`[NOTION] Retrieved ${pages.length} pages and ${databases.length} databases`);
  
      return {
        success: true,
        pages: allItems  // Contient pages + databases
      };
    } catch (error) {
      console.error('[ERROR] Error getting pages:', error);
      return {
        success: true,
        pages: []
      };
    }
  });

  ipcMain.handle('notion:send', async (event, data) => {
    try {
      const { newNotionService } = require('../main');

      if (!newNotionService) {
        return { success: false, error: 'Service not ready' };
      }

      console.log('[NOTION] Sending content:', {
        pageId: data.pageId,
        pageIds: data.pageIds,
        contentLength: data.content?.length
      });

      // ✅ CORRECTION : Passer les bons paramètres
      const result = await newNotionService.sendToNotion({
        pageId: data.pageId,           // ✅ ID simple
        pageIds: data.pageIds,         // ✅ Tableau d'IDs
        content: data.content,
        options: data.options || {}
      });

      return result;
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
      console.log(`[NOTION] Getting page info: ${pageId}`);
      const { newNotionService } = require('../main');
  
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }
  
      const pageInfo = await newNotionService.getPage(pageId);
  
      if (!pageInfo) {
        return { success: false, error: 'Page not found' };
      }
  
      // ✅ Si la page appartient à une database, récupérer le schéma
      let databaseSchema = null;
      if (pageInfo.parent?.type === 'database_id' && pageInfo.parent?.database_id) {
        console.log(`[NOTION] Page has database parent: ${pageInfo.parent.database_id}`);
        try {
          databaseSchema = await newNotionService.getDatabase(pageInfo.parent.database_id);
          console.log(`[NOTION] Database schema retrieved with ${Object.keys(databaseSchema?.properties || {}).length} properties`);
        } catch (error) {
          console.error('[NOTION] Error getting database schema:', error);
        }
      }
  
      return { 
        success: true, 
        pageInfo,
        databaseSchema  // ✅ Clé correcte attendue par le frontend
      };
    } catch (error) {
      console.error('[NOTION] Error getting page info:', error);
      return { success: false, error: error.message };
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

  ipcMain.handle('notion:getDatabase', async (event, databaseId) => {
    try {
      console.log(`[NOTION] Getting database: ${databaseId}`);
      const { newNotionService } = require('../main');  // ✅ Utiliser newNotionService
      
      if (!newNotionService) {
        return { success: false, error: 'Service initializing' };
      }
  
      const database = await newNotionService.getDatabase(databaseId);
      
      if (!database) {
        return { success: false, error: 'Database not found' };
      }
  
      return database;  // ✅ Retourner directement la database
    } catch (error) {
      console.error('[NOTION] Error getting database:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[OK] Notion IPC handlers registered');
}

module.exports = registerNotionIPC;