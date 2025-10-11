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
      const { newNotionService, newCacheService } = require('../main');

      if (!newNotionService) {
        return { success: false, error: 'Service not initialized' };
      }

      console.log('[NOTION] Sending content with options:', {
        pageId: data.pageId,
        contentType: data.contentType,
        hasIcon: !!data.icon,
        hasCover: !!data.cover,
        hasDatabaseProps: !!data.databaseProperties
      });

      // 1. Parser le contenu selon les options avec le nouveau parser
      const { parseContent } = require('@notion-clipper/core-shared');

      let blocks;
      if (data.parseAsMarkdown) {
        const result = parseContent(data.content, {
          contentType: 'markdown',
          maxBlocks: 100,
          conversion: {
            preserveFormatting: true,
            convertLinks: true,
            convertImages: true,
            convertTables: true,
            convertCode: true
          },
          formatting: {
            removeEmptyBlocks: true,
            normalizeWhitespace: true
          }
        });
        blocks = result.success ? result.blocks : [];
        console.log(`[NOTION] 📊 Markdown parsing result: success=${result.success}, blocks=${blocks.length}`);
      } else {
        // Parsing automatique - détecter le type et adapter les options
        const contentType = data.contentType || 'auto';
        console.log(`[NOTION] 📊 Auto parsing with contentType: ${contentType}`);
        const result = parseContent(data.content, {
          contentType: contentType,
          maxBlocks: 100,
          conversion: {
            preserveFormatting: true,  // ✅ TOUJOURS activer le formatage pour auto-détection
            convertLinks: true,
            convertImages: true,
            convertTables: true,
            convertCode: true
          },
          formatting: {
            removeEmptyBlocks: true,
            normalizeWhitespace: true
          }
        });
        blocks = result.success ? result.blocks : [];
        console.log(`[NOTION] 📊 Auto parsing result: success=${result.success}, blocks=${blocks.length}, detectedType=${result.metadata?.detectedType}`);
      }

      console.log(`[NOTION] Parsed ${blocks.length} blocks from content`);

      // Debug: afficher le premier bloc parsé
      if (blocks.length > 0) {
        console.log(`[NOTION] 🔍 First parsed block:`, JSON.stringify(blocks[0], null, 2));
      }

      // Debug: vérifier le bloc 46 problématique
      if (blocks.length > 46) {
        console.log(`[NOTION] 🔍 Problematic block 46:`, JSON.stringify(blocks[46], null, 2));
      }

      // Fallback si aucun bloc généré
      if (blocks.length === 0) {
        console.log(`[NOTION] ⚠️ No blocks generated, using fallback`);
        blocks = [{
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: data.content || '' }
            }]
          }
        }];
      }

      // 2. Vérifier si c'est une database child (support data_source_id)
      const selectedPage = data.selectedPage;
      const isDatabaseChild = selectedPage && (
        selectedPage.parent?.type === 'database_id' ||
        selectedPage.parent?.type === 'data_source_id' ||
        selectedPage.parent?.database_id ||
        selectedPage.parent?.data_source_id
      );

      // 3. Si database child ET qu'on a des propriétés
      if (isDatabaseChild && data.databaseProperties && Object.keys(data.databaseProperties).length > 0) {
        console.log('[NOTION] Creating database page with properties');

        // Préférer data_source_id si disponible, sinon utiliser database_id
        let parentConfig = {};
        if (selectedPage.parent?.data_source_id) {
          parentConfig = { data_source_id: selectedPage.parent.data_source_id };
        } else if (selectedPage.parent?.database_id) {
          parentConfig = { database_id: selectedPage.parent.database_id };
        } else {
          parentConfig = { page_id: selectedPage.parent.page_id };
        }

        const pageData = {
          parent: parentConfig,
          properties: data.databaseProperties,
          children: blocks
        };

        // Ajouter icon si présent
        if (data.icon) {
          pageData.icon = {
            type: 'emoji',
            emoji: data.icon
          };
        }

        // Ajouter cover si présent
        if (data.cover) {
          pageData.cover = {
            type: 'external',
            external: { url: data.cover }
          };
        }

        const newPage = await newNotionService.notion.pages.create(pageData);

        return {
          success: true,
          pageCreated: true,
          pageId: newPage.id
        };
      }

      // 4. Validation et nettoyage des blocs avant envoi
      console.log('[NOTION] Validating blocks before sending...');
      
      const validBlocks = blocks.filter((block, index) => {
        // Vérifier que le bloc a un type valide
        if (!block.type) {
          console.warn(`[NOTION] ⚠️ Block ${index} has no type, skipping`);
          return false;
        }
        
        // Vérifier que le bloc a la propriété correspondant à son type
        if (!block[block.type]) {
          console.warn(`[NOTION] ⚠️ Block ${index} (${block.type}) missing type property, skipping`);
          return false;
        }
        
        // Supprimer la propriété children si elle existe (cause des erreurs)
        if (block.children) {
          console.warn(`[NOTION] ⚠️ Block ${index} (${block.type}) has children property, removing`);
          delete block.children;
        }
        
        return true;
      });
      
      console.log(`[NOTION] Filtered ${blocks.length} -> ${validBlocks.length} valid blocks`);

      // 5. Envoyer les blocs par chunks de 100 (limite Notion API)
      console.log('[NOTION] Appending blocks to page');
      
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < validBlocks.length; i += chunkSize) {
        chunks.push(validBlocks.slice(i, i + chunkSize));
      }
      
      console.log(`[NOTION] Sending ${validBlocks.length} blocks in ${chunks.length} chunks`);
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`[NOTION] Sending chunk ${i + 1}/${chunks.length} (${chunks[i].length} blocks)`);
        await newNotionService.appendBlocks(data.pageId, chunks[i]);
      }
      
      const result = { success: true };

      // 5. Si icon ou cover fournis, update la page
      if (data.icon || data.cover) {
        const updateData = {};

        if (data.icon) {
          updateData.icon = {
            type: 'emoji',
            emoji: data.icon
          };
        }

        if (data.cover) {
          updateData.cover = {
            type: 'external',
            external: { url: data.cover }
          };
        }

        try {
          await newNotionService.notion.pages.update({
            page_id: data.pageId,
            ...updateData
          });
          console.log('[NOTION] Page appearance updated');
        } catch (err) {
          console.warn('[NOTION] Could not update page appearance:', err.message);
        }
      }

      // 6. Ajouter aux pages récentes
      if (newCacheService && data.pageId) {
        try {
          let recentPages = await newCacheService.get('recentPages') || [];
          recentPages = recentPages.filter(p => p.id !== data.pageId);

          recentPages.unshift({
            id: data.pageId,
            title: selectedPage?.title || 'Page',
            icon: selectedPage?.icon,
            timestamp: Date.now()
          });

          recentPages = recentPages.slice(0, 20);
          await newCacheService.set('recentPages', recentPages);
        } catch (err) {
          console.warn('[NOTION] Could not update recent pages:', err);
        }
      }

      return {
        success: true,
        blocksAdded: blocks.length
      };

    } catch (error) {
      console.error('[NOTION] Send failed:', error);
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
  
      // ✅ Si la page appartient à une database, récupérer le schéma (support data_source_id)
      let databaseSchema = null;
      const parentId = pageInfo.parent?.database_id || pageInfo.parent?.data_source_id;
      const parentType = pageInfo.parent?.type;
      
      if ((parentType === 'database_id' || parentType === 'data_source_id') && parentId) {
        console.log(`[NOTION] Page has ${parentType} parent: ${parentId}`);
        try {
          if (parentType === 'data_source_id') {
            // For data sources, we need to get the parent database first
            const dataSource = await newNotionService.api.getDataSource(parentId);
            if (dataSource?.parent?.database_id) {
              databaseSchema = await newNotionService.getDatabase(dataSource.parent.database_id);
            }
          } else {
            databaseSchema = await newNotionService.getDatabase(parentId);
          }
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