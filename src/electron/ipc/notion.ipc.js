const { ipcMain } = require('electron');
const notionService = require('../services/notion.service');

function registerNotionIPC() {
  // Initialisation (optimisée)
  ipcMain.handle('notion:initialize', async (event, token) => {
    try {
      const cacheService = require('../services/cache.service');
      const pollingService = require('../services/polling.service');

      // Supprimer complètement la base de données si disponible
      if (cacheService.deleteDatabase) {
        cacheService.deleteDatabase();
      } else {
        cacheService.forceCleanCache();
        cacheService.clear();
      }

      // Réinitialiser le service Notion
      notionService.client = null;
      notionService.initialized = false;

      // Initialiser avec le nouveau token (rapide - juste test de connexion)
      const result = await notionService.initialize(token);

      if (result.success) {
        console.log('[NOTION] ✅ Client initialisé, chargement des pages en arrière-plan...');

        // ✅ OPTIMISATION : Charger les pages EN ARRIÈRE-PLAN
        // Ne pas attendre - retourner immédiatement
        setImmediate(async () => {
          try {
            // Charger la première page rapidement (50 pages)
            const firstBatch = await notionService.fetchPagesWithPagination({
              pageSize: 50
            });

            console.log(`[NOTION] 🚀 Premier lot chargé: ${firstBatch.pages.length} pages`);

            // Notifier le frontend
            event.sender.send('notion:pages-updated', {
              pages: firstBatch.pages,
              hasMore: firstBatch.hasMore,
              cursor: firstBatch.nextCursor
            });

            // Charger le reste en arrière-plan si nécessaire
            if (firstBatch.hasMore) {
              let cursor = firstBatch.nextCursor;
              while (cursor) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Délai pour ne pas surcharger
                const nextBatch = await notionService.fetchPagesWithPagination({
                  cursor,
                  pageSize: 50
                });

                console.log(`[NOTION] 📦 Lot suivant chargé: ${nextBatch.pages.length} pages`);

                // Notifier le frontend
                event.sender.send('notion:pages-updated', {
                  pages: nextBatch.pages,
                  hasMore: nextBatch.hasMore,
                  cursor: nextBatch.nextCursor
                });

                cursor = nextBatch.hasMore ? nextBatch.nextCursor : null;
              }

              console.log('[NOTION] ✅ Tous les lots chargés');
            }

            // Démarrer le polling après le chargement initial
            const configService = require('../services/config.service');
            if (configService.get('enablePolling') !== false && !pollingService.running) {
              pollingService.start();
            }
          } catch (error) {
            console.error('[NOTION] ❌ Erreur chargement arrière-plan:', error);
            event.sender.send('notion:error', { error: error.message });
          }
        });

        // Retourner immédiatement - ne pas attendre le chargement complet
        return {
          success: true,
          message: 'Initialisation réussie, chargement des pages en cours...'
        };
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

  // Récupérer les pages (complète - legacy)
  ipcMain.handle('notion:get-pages', async (event, forceRefresh = false) => {
    try {
      const pages = await notionService.fetchAllPages(!forceRefresh);
      return { success: true, pages };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 🆕 Récupérer les pages avec pagination (chargement progressif)
  ipcMain.handle('notion:get-pages-paginated', async (event, options = {}) => {
    try {
      const result = await notionService.fetchPagesWithPagination(options);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notion:get-data-source-schema', async (event, dataSourceId) => {
    try {
      const schema = await notionService.getDataSourceSchema(dataSourceId);
      return { success: true, schema };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Envoyer du contenu (avec support de la queue)
  ipcMain.handle('notion:send', async (event, data) => {
    const queueService = require('../services/queue.service');
    const { net } = require('electron');

    try {
      // Vérifier la connectivité
      const isOnline = net.isOnline();

      if (data.pageIds && Array.isArray(data.pageIds)) {
        const results = [];

        for (const pageId of data.pageIds) {
          if (!isOnline) {
            // Hors ligne : ajouter à la queue
            const queueId = await queueService.add({
              pageId,
              content: data.content,
              options: data.options
            });
            results.push({
              pageId,
              success: true,
              queued: true,
              queueId,
              message: 'Ajouté à la file d\'attente'
            });
          } else {
            // En ligne : envoyer directement
            try {
              const result = await notionService.sendToNotion({
                pageId,
                content: data.content,
                options: data.options
              });
              results.push({ pageId, success: true, queued: false, ...result });
            } catch (error) {
              // Échec : ajouter à la queue pour réessayer
              console.error(`[IPC] Échec envoi vers ${pageId}, ajout à la queue:`, error.message);
              const queueId = await queueService.add({
                pageId,
                content: data.content,
                options: data.options
              });
              results.push({
                pageId,
                success: true,
                queued: true,
                queueId,
                error: error.message,
                message: 'Ajouté à la file d\'attente après échec'
              });
            }
          }
        }

        const successful = results.filter(r => r.success).length;
        return {
          success: successful > 0,
          results,
          message: `Envoyé vers ${successful}/${data.pageIds.length} pages`,
          queued: results.some(r => r.queued)
        };
      } else {
        // Envoi vers une seule page
        if (!isOnline) {
          // Hors ligne : ajouter à la queue
          const queueId = await queueService.add({
            pageId: data.pageId,
            content: data.content,
            options: data.options
          });
          return {
            success: true,
            queued: true,
            queueId,
            message: 'Ajouté à la file d\'attente (hors ligne)'
          };
        } else {
          // En ligne : envoyer directement
          try {
            const result = await notionService.sendToNotion({
              pageId: data.pageId,
              content: data.content,
              options: data.options
            });
            return { ...result, queued: false };
          } catch (error) {
            // Échec : ajouter à la queue pour réessayer
            console.error('[IPC] Échec envoi, ajout à la queue:', error.message);
            const queueId = await queueService.add({
              pageId: data.pageId,
              content: data.content,
              options: data.options
            });
            return {
              success: true,
              queued: true,
              queueId,
              error: error.message,
              message: 'Ajouté à la file d\'attente après échec'
            };
          }
        }
      }
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

  // Récupérer les informations d'une page
  ipcMain.handle('notion:get-page-info', async (event, pageId) => {
    try {
      const pageInfo = await notionService.getPageInfo(pageId);
      return { success: true, pageInfo };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Récupérer le schéma d'une database
  ipcMain.handle('notion:get-database-schema', async (event, databaseId) => {
    try {
      const schema = await notionService.getDatabaseSchema(databaseId);
      return { success: true, schema };
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