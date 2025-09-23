const { Client } = require('@notionhq/client');
const EventEmitter = require('events');
const configService = require('./config.service');
const cacheService = require('./cache.service');
const parserService = require('./parser.service');
const statsService = require('./stats.service');

class NotionService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.initialized = false;
    this.pollingInterval = null;
  }

  // Initialisation
  async initialize(token = null) {
    try {
      const notionToken = token || configService.getNotionToken();
      
      if (!notionToken) {
        throw new Error('No Notion token configured');
      }

      this.client = new Client({
        auth: notionToken,
        timeoutMs: 60000,
        retry: {
          maxRetries: 3,
          backoffMultiplier: 2
        }
      });

      // Test de connexion
      await this.testConnection();
      
      this.initialized = true;
      this.emit('initialized');
      
      // Démarrer le polling si activé
      if (configService.get('enablePolling')) {
        this.startPolling();
      }

      return { success: true };
    } catch (error) {
      console.error('Notion initialization error:', error);
      this.initialized = false;
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Test de connexion
  async testConnection() {
    if (!this.client) throw new Error('Client not initialized');
    
    // Faire une requête simple pour vérifier le token
    // Ne pas stocker la réponse pour éviter la transmission de propriétés système cachées
    await this.client.search({
      page_size: 1
    });
    
    return true;
  }

  // Récupérer toutes les pages
  async fetchAllPages(useCache = true) {
    if (!this.initialized) {
      throw new Error('Notion service not initialized');
    }

    // Vérifier le cache d'abord
    if (useCache) {
      const cached = cacheService.getPages();
      if (cached && cached.length > 0) {
        statsService.increment('cache_hits');
        return cached;
      }
    }

    statsService.increment('api_calls');
    
    try {
      const pages = [];
      let hasMore = true;
      let startCursor = undefined;

      while (hasMore) {
        const response = await this.client.search({
          filter: {
            property: 'object',
            value: 'page'
          },
          page_size: 100,
          start_cursor: startCursor
        });

        // Déboguer les objets de réponse pour identifier les propriétés système cachées
        if (response.results && response.results.length > 0) {
          this._debugPageObject(response.results[0], 'API response');
        }

        // Formater immédiatement chaque page pour éviter la transmission de propriétés système cachées
        const formattedPages = response.results.map(page => this.formatPage(page));
        pages.push(...formattedPages);
        
        hasMore = response.has_more;
        startCursor = response.next_cursor;
      }

      // Mettre en cache les pages formatées
      cacheService.setPages(pages);
      statsService.increment('pages_fetched', pages.length);

      return pages;
    } catch (error) {
      statsService.increment('errors');
      throw error;
    }
  }

  // Fonction de débogage pour identifier les propriétés système cachées
  _debugPageObject(page, context = 'unknown') {
    if (process.env.NODE_ENV === 'development') {
      const allKeys = Object.keys(page);
      const suspiciousKeys = allKeys.filter(key => 
        key.startsWith('_') || 
        key === 'pvs' || 
        key === 'object' ||
        key === 'type' && typeof page[key] === 'string' && page[key].length === 2
      );
      
      if (suspiciousKeys.length > 0) {
        console.warn(`⚠️ Propriétés suspectes détectées dans ${context}:`, suspiciousKeys);
        console.warn('Page object:', JSON.stringify(page, null, 2));
      }
    }
  }

  // Fonction pour nettoyer un objet de page des propriétés système cachées
  _cleanPageObject(page) {
    // S'assurer que seules les propriétés nécessaires sont conservées
    return {
      id: page.id,
      title: page.title || 'Sans titre',
      icon: page.icon,
      cover: page.cover,
      url: page.url,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      archived: page.archived,
      properties: page.properties || {},
      parent: page.parent
    };
  }

  // Formater une page pour l'UI
  formatPage(page) {
    // Nettoyer d'abord l'objet de page des propriétés système cachées
    const cleanPage = this._cleanPageObject(page);
    const title = this.extractTitle(cleanPage);
    
    return {
      ...cleanPage,
      title: title
    };
  }

  // Extraire le titre d'une page
  extractTitle(page) {
    if (!page.properties) return 'Sans titre';

    // Chercher la propriété titre
    const titleProperty = Object.entries(page.properties).find(([_, prop]) => 
      prop.type === 'title'
    );

    if (titleProperty) {
      const [_, prop] = titleProperty;
      if (prop.title && prop.title.length > 0) {
        return prop.title.map(t => t.plain_text).join('');
      }
    }

    return 'Sans titre';
  }

  // Envoyer du contenu vers Notion
  async sendToNotion(pageId, content, options = {}) {
    if (!this.initialized) {
      throw new Error('Notion service not initialized');
    }

    statsService.increment('api_calls');
    
    try {
      // Parser le contenu en blocs Notion
      const blocks = await parserService.parseContent(content, options);
      
      // Limites de l'API Notion
      const MAX_BLOCKS_PER_REQUEST = 100;
      const chunks = [];
      
      for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
        chunks.push(blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST));
      }

      // Envoyer par chunks
      const results = [];
      for (const chunk of chunks) {
        const response = await this.client.blocks.children.append({
          block_id: pageId,
          children: chunk
        });
        results.push(response);
      }

      statsService.increment('successful_sends');
      statsService.increment('content_processed');
      
      return {
        success: true,
        blocksCreated: blocks.length,
        results
      };
    } catch (error) {
      statsService.increment('failed_sends');
      statsService.recordError(error.message, 'sendToNotion');
      throw error;
    }
  }

  // Créer une page
  async createPage(parentId, title, content = null, properties = {}) {
    if (!this.initialized) {
      throw new Error('Notion service not initialized');
    }

    statsService.increment('api_calls');

    try {
      const pageData = {
        parent: { page_id: parentId },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title
                }
              }
            ]
          },
          ...properties
        }
      };

      // Si du contenu est fourni, l'ajouter
      if (content) {
        pageData.children = await parserService.parseContent(content);
      }

      const response = await this.client.pages.create(pageData);
      
      statsService.increment('pages_created');
      
      return {
        success: true,
        page: this.formatPage(response)
      };
    } catch (error) {
      statsService.recordError(error.message, 'createPage');
      throw error;
    }
  }

  

  async createPreviewPage(parentId = null) {
    try {
      if (!this.client) {
        await this.initialize();
      }
      const response = await this.client.pages.create({
        parent: parentId ? 
          { page_id: parentId.replace(/-/g, '') } : 
          { workspace: true },
        icon: {
          emoji: "📋"
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: "Notion Clipper Preview"
                }
              }
            ]
          }
        },
        children: [
          {
            paragraph: {
              rich_text: [
                {
                  text: {
                    content: "Cette page sera utilisée pour la prévisualisation de vos contenus."
                  }
                }
              ]
            }
          }
        ]
      });
      return {
        success: true,
        pageId: response.id,
        url: response.url
      };
    } catch (error) {
      console.error('Erreur création page preview:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validatePage(url, pageId = null) {
    try {
      const id = pageId || url.split('-').pop()?.replace(/-/g, '');
      if (!id) {
        throw new Error('ID de page invalide');
      }
      const page = await this.client.pages.retrieve({ page_id: id });
      return {
        valid: true,
        pageId: page.id,
        title: page.properties?.title?.title?.[0]?.plain_text || 'Sans titre'
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Page non trouvée ou non accessible'
      };
    }
  }

  // Polling intelligent
  startPolling() {
    if (this.pollingInterval) return;

    const interval = configService.get('pollingInterval') || 30000;
    
    this.pollingInterval = setInterval(async () => {
      try {
        const currentPages = await this.fetchAllPages(false);
        const changes = cacheService.detectChanges(currentPages);
        
        if (changes.hasChanges) {
          this.emit('pages-changed', {
            added: changes.added,
            modified: changes.modified,
            removed: changes.removed
          });
          statsService.increment('changes_detected', changes.total);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, interval);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Recherche
  async searchPages(query) {
    if (!this.initialized) {
      throw new Error('Notion service not initialized');
    }

    statsService.increment('api_calls');

    try {
      const response = await this.client.search({
        query: query,
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: 20
      });

      // Formater immédiatement chaque page pour éviter la transmission de propriétés système cachées
      return response.results.map(page => this.formatPage(page));
    } catch (error) {
      statsService.recordError(error.message, 'searchPages');
      throw error;
    }
  }
}

module.exports = new NotionService();