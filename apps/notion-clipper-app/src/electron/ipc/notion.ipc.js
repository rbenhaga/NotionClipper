const { ipcMain } = require('electron');
const http = require('http');
const url = require('url');

// ✅ ARCHITECTURE CORRIGÉE : Les parsers génèrent directement le bon format
// Plus besoin d'aplatissement - les blocs sont créés conformes à l'API Notion

function registerNotionIPC() {
  console.log('[CONFIG] Registering Notion IPC handlers...');

  // ============================================
  // OAUTH HANDLERS (NOUVEAUX)
  // ============================================

  ipcMain.handle('notion:startOAuth', async (event, email) => {
    console.log('[OAuth] Starting OAuth flow for email:', email);

    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = 'http://localhost:8080/oauth/callback';
    const state = Math.random().toString(36).substring(2, 15);

    const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `owner=user&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    // Démarrer le serveur temporaire pour le callback
    const result = await startOAuthServer();

    return {
      authUrl,
      success: result.success,
      error: result.error
    };
  });

  ipcMain.handle('notion:validateApiKey', async (event, apiKey) => {
    try {
      console.log('[API Key] Validating API key...');

      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!response.ok) {
        console.error('[API Key] Validation failed:', response.status);
        return { valid: false, error: 'Token invalide ou expiré' };
      }

      const userData = await response.json();
      console.log('[API Key] Validation successful for user:', userData.name);

      // Sauvegarder le token
      const { newConfigService } = require('../main');
      if (newConfigService) {
        await newConfigService.setNotionToken(apiKey);
        await newConfigService.set('onboardingCompleted', true);
        await newConfigService.set('workspaceName', userData.name || 'Mon Workspace');
      }

      return {
        valid: true,
        user: userData
      };
    } catch (error) {
      console.error('[API Key] Error during validation:', error);
      return { valid: false, error: 'Erreur lors de la validation' };
    }
  });

  // ============================================
  // HANDLERS NOTION EXISTANTS
  // ============================================

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
          useModernParser: true,  // ✅ FORCER l'utilisation du ModernParser
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
          useModernParser: true,  // ✅ FORCER l'utilisation du ModernParser
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

      // ✅ CORRECTION: Fallback si aucun bloc généré
      if (blocks.length === 0) {
        console.log(`[NOTION] ⚠️ No blocks generated, using fallback`);
        // ✅ Extraire le texte du contenu de manière sûre
        let textContent = '';
        if (typeof data.content === 'string') {
          textContent = data.content;
          console.log(`[NOTION] Content is string: ${textContent.length} chars`);
        } else if (data.content?.text) {
          textContent = data.content.text;
          console.log(`[NOTION] Content from .text: ${textContent.length} chars`);
        } else if (data.content?.data) {
          textContent = data.content.data;
          console.log(`[NOTION] Content from .data: ${textContent.length} chars`);
        } else if (data.content?.content) {
          textContent = data.content.content;
          console.log(`[NOTION] Content from .content: ${textContent.length} chars`);
        } else {
          // Dernier recours: conversion en string
          textContent = String(data.content || '');
          console.log(`[NOTION] Content converted to string: ${textContent.length} chars`);
        }

        console.log(`[NOTION] 📝 Fallback text extracted (${textContent.length} chars): "${textContent.substring(0, 100)}..."`);

        // ✅ Créer un bloc paragraphe simple avec le texte (TOUJOURS une string)
        blocks = [{
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: {
                content: textContent  // ✅ GARANTIT que c'est une string, pas un objet
              }
            }]
          }
        }];
        console.log(`[NOTION] ✅ Fallback block created successfully`);
      }

      // 2. Vérifier si c'est une database child (support data_source_id)
      const selectedPage = data.selectedPage;
      const isDatabaseChild = selectedPage && (selectedPage.parent?.type === 'database_id' ||
        selectedPage.parent?.type === 'data_source_id' ||
        selectedPage.parent?.database_id ||
        selectedPage.parent?.data_source_id);

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

      // 4. Validation des blocs avant envoi
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
          console.log(`[NOTION] 🚨 BLOC ${index} CORROMPU - Type: ${block.type}, Keys:`, Object.keys(block));
          return false;
        }

        // ✅ CORRECTION: Ne PAS gérer les children ici
        // Les children seront aplatis juste avant l'envoi
        return true;
      });

      console.log(`[NOTION] Filtered ${blocks.length} -> ${validBlocks.length} valid blocks`);

      // 5. ✅ ARCHITECTURE CORRIGÉE : Les blocs sont générés au bon format
      console.log('[NOTION] Blocks generated in correct flat format by notion-parser');

      // 6. Envoyer les blocs par chunks de 100 (limite Notion API)
      console.log('[NOTION] Appending blocks to page');
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < validBlocks.length; i += chunkSize) {
        chunks.push(validBlocks.slice(i, i + chunkSize));
      }

      console.log(`[NOTION] Sending ${validBlocks.length} blocks in ${chunks.length} chunk(s)`);
      for (let i = 0; i < chunks.length; i++) {
        console.log(`[NOTION] Sending chunk ${i + 1}/${chunks.length} (${chunks[i].length} blocks)`);
        await newNotionService.appendBlocks(data.pageId, chunks[i]);
        console.log(`[NOTION] ✅ Chunk ${i + 1}/${chunks.length} sent successfully`);
      }

      console.log('[NOTION] ✅ All blocks sent successfully');

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

  // ✅ Handler pour réinitialiser le NotionService après l'onboarding
  ipcMain.handle('notion:reinitialize-service', async () => {
    try {
      console.log('[NOTION] 🔄 Reinitializing NotionService...');
      const main = require('../main');
      const { newConfigService } = main;

      if (!newConfigService) {
        console.error('[NOTION] ❌ Config service not available');
        return { success: false, error: 'Config service not available' };
      }

      // Récupérer le token depuis la config
      console.log('[NOTION] 📥 Getting token from config...');
      const token = await newConfigService.getNotionToken();
      console.log('[NOTION] Token found:', !!token);
      console.log('[NOTION] Token type:', typeof token);
      console.log('[NOTION] Token length:', token ? token.length : 'null');

      if (!token) {
        console.error('[NOTION] ❌ No token available in config');
        // ✅ DEBUG: Afficher toute la config pour comprendre
        const allConfig = await newConfigService.getAll();
        console.log('[NOTION] 🔍 Full config keys:', Object.keys(allConfig));
        console.log('[NOTION] 🔍 notionToken_encrypted exists:', !!allConfig.notionToken_encrypted);
        return { success: false, error: 'No token available' };
      }

      console.log('[NOTION] ✅ Token retrieved successfully');
      console.log('[NOTION] 🔧 Calling reinitializeNotionService...');

      // Réinitialiser le service
      const success = main.reinitializeNotionService(token);
      if (success) {
        console.log('[NOTION] ✅ NotionService successfully reinitialized');
        return { success: true };
      } else {
        console.error('[NOTION] ❌ reinitializeNotionService returned false');
        return { success: false, error: 'Failed to reinitialize service' };
      }
    } catch (error) {
      console.error('[NOTION] ❌ Critical error reinitializing service:', error);
      console.error('[NOTION] ❌ Stack:', error.stack);
      return { success: false, error: error.message };
    }
  });

  console.log('[OK] Notion IPC handlers registered');
}

// ============================================
// OAUTH SERVER FUNCTIONS
// ============================================

function startOAuthServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);

      if (parsedUrl.pathname === '/oauth/callback') {
        const { code, state, error } = parsedUrl.query;

        if (error) {
          // Redirection vers l'app React avec l'erreur
          const errorData = {
            success: false,
            error: error === 'access_denied' ? 'Accès refusé par l\'utilisateur' : error
          };

          res.writeHead(302, {
            'Location': `http://localhost:3000/auth/callback?data=${encodeURIComponent(JSON.stringify(errorData))}`
          });
          res.end();

          resolve({ success: false, error: errorData.error });
          return;
        }

        if (code) {
          try {
            // Échanger le code contre un token
            const tokenResult = await exchangeCodeForToken(code, state);

            // Redirection vers l'app React avec les données de succès
            const successData = {
              success: true,
              workspace: tokenResult.workspace,
              accessToken: tokenResult.access_token
            };

            res.writeHead(302, {
              'Location': `http://localhost:3000/auth/callback?data=${encodeURIComponent(JSON.stringify(successData))}`
            });
            res.end();

            resolve({
              success: true,
              workspace: tokenResult.workspace,
              accessToken: tokenResult.access_token
            });
          } catch (error) {
            console.error('[OAuth] Erreur lors de l\'échange du code:', error);

            // Redirection vers l'app React avec l'erreur
            const errorData = {
              success: false,
              error: error.message || 'Erreur lors de la connexion'
            };

            res.writeHead(302, {
              'Location': `http://localhost:3000/auth/callback?data=${encodeURIComponent(JSON.stringify(errorData))}`
            });
            res.end();

            resolve({ success: false, error: error.message });
          }
        } else {
          // Pas de code d'autorisation
          const errorData = {
            success: false,
            error: 'Code d\'autorisation manquant'
          };

          res.writeHead(302, {
            'Location': `http://localhost:3000/auth/callback?data=${encodeURIComponent(JSON.stringify(errorData))}`
          });
          res.end();

          resolve({ success: false, error: 'No code provided' });
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    });

    server.listen(8080, () => {
      console.log('[OAuth] Serveur temporaire démarré sur le port 8080');
    });

    // Timeout après 5 minutes
    setTimeout(() => {
      server.close();
      resolve({ success: false, error: 'Timeout OAuth' });
    }, 300000);
  });
}

async function exchangeCodeForToken(code, state) {
  try {
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(clientId + ':' + clientSecret).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:8080/oauth/callback'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[OAuth] Token exchange failed:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    console.log('[OAuth] Token exchange successful for workspace:', tokenData.workspace_name);

    // Sauvegarder le token
    const { newConfigService } = require('../main');
    if (newConfigService) {
      await newConfigService.setNotionToken(tokenData.access_token);
      await newConfigService.set('onboardingCompleted', true);
      await newConfigService.set('workspaceName', tokenData.workspace_name);
      await newConfigService.set('workspaceIcon', tokenData.workspace_icon);
    }

    return {
      success: true,
      access_token: tokenData.access_token,
      workspace: {
        id: tokenData.workspace_id,
        name: tokenData.workspace_name,
        icon: tokenData.workspace_icon
      }
    };
  } catch (error) {
    console.error('[OAuth] Error during token exchange:', error);
    throw error;
  }
}

module.exports = registerNotionIPC;