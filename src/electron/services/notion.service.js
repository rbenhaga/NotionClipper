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
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const response = await this.client.search({
        page_size: 1
      });
      return true;
    } catch (error) {
      if (error.code === 'unauthorized') {
        throw new Error('Token Notion invalide ou expiré');
      }
      if (error.code === 'restricted_resource') {
        throw new Error("Token valide mais aucune page partagée avec l'intégration");
      }
      if (error.message.includes('invalid_request')) {
        throw new Error('Token Notion invalide');
      }
      throw new Error(`Erreur de connexion: ${error.message}`);
    }
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
      const allItems = [];

      // RÉCUPÉRER SEULEMENT LES PAGES
      // L'API 2025-09-03 ne supporte plus filter: "database"
      let hasMore = true;
      let startCursor = undefined;

      while (hasMore) {
        const response = await this.client.search({
          filter: {
            property: 'object',
            value: 'page'  // ← UNIQUEMENT LES PAGES
          },
          page_size: 100,
          start_cursor: startCursor
        });

        const formattedPages = response.results.map(page => this.formatPage(page));
        allItems.push(...formattedPages);

        hasMore = response.has_more;
        startCursor = response.next_cursor;
      }

      // SUPPRIMER COMPLÈTEMENT LA RÉCUPÉRATION DES DATABASES
      // Les databases ne sont plus récupérables via search() dans l'API 2025-09-03
      // Si vous avez besoin des databases, il faut utiliser databases.list() 
      // ou databases.query() avec un data_source_id spécifique

      cacheService.setPages(allItems);
      statsService.increment('pages_fetched', allItems.length);

      return allItems;
    } catch (error) {
      statsService.increment('errors');
      throw error;
    }
  }

  // Fonction de débogage désactivée pour éviter le spam
  _debugPageObject(page, context = 'unknown') {
    // Debug désactivé - les objets sont automatiquement nettoyés par formatPage()
  }

  // Fonction pour nettoyer un objet de page des propriétés système cachées
  _cleanPageObject(page) {
    // S'assurer que seules les propriétés nécessaires sont conservées
    return {
      object: page.object,
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
    // IMPORTANT : Détecter si c'est une database
    const isDatabase = page.object === 'database';

    // Extraire le titre selon le type
    let title = 'Sans titre';

    if (isDatabase) {
      // Les databases ont leur titre directement dans page.title
      if (page.title && page.title.length > 0) {
        title = page.title.map(t => t.plain_text || t.text?.content || '').join('');
      }
    } else {
      // Les pages ont leur titre dans properties
      const titleProperty = Object.entries(page.properties || {}).find(([_, prop]) =>
        prop.type === 'title'
      );

      if (titleProperty) {
        const [_, prop] = titleProperty;
        if (prop.title && prop.title.length > 0) {
          title = prop.title.map(t => t.plain_text || '').join('');
        }
      }
    }

    return {
      id: page.id,
      title: title,
      type: isDatabase ? 'database' : 'page',  // ← AJOUTER LE TYPE
      object: page.object,  // Garder l'objet original aussi
      icon: page.icon,
      cover: page.cover,
      url: page.url,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      archived: page.archived || false,
      parent: page.parent,
      properties: isDatabase ? {} : page.properties  // Pas de properties pour les databases dans la liste
    };
  }

  // Extraire le titre d'une page
  extractTitle(page) {
    // Handle databases: title is at root as an array of rich_text
    if (page.object === 'database') {
      if (Array.isArray(page.title) && page.title.length > 0) {
        return page.title.map(t => t.plain_text || (t.text && t.text.content) || '').join('') || 'Sans titre';
      }
      return 'Sans titre';
    }

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
  async sendToNotion(data) {
    const { pageId, content, options = {} } = data;
    
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('📊 sendToNotion appelé');
      console.log('   Type:', typeof content);
      console.log('   Est Buffer?', Buffer.isBuffer(content));
      
      let blocks = [];
      
      // 🔥 FIX : Détecter les images AVANT tout parsing
      
      // Cas 1 : Buffer (image)
      if (Buffer.isBuffer(content)) {
        console.log('📸 Buffer détecté, upload direct...');
        console.log(`📊 Taille: ${(content.length / 1024).toFixed(2)} KB`);
        
        const imageService = require('./image.service');
        const fileUploadId = await imageService.uploadToNotion(content, 'screenshot.png');
        
        console.log('✅ Image uploadée, ID:', fileUploadId);
        
        blocks = [{
          type: 'image',
          image: {
            type: 'file_upload',
            file_upload: { id: fileUploadId }
          }
        }];
      }
      // Cas 2 : Data URL
      else if (typeof content === 'string' && content.startsWith('data:image')) {
        console.log('📸 Data URL détecté, conversion...');
        
        const base64Data = content.split(',')[1];
        if (!base64Data) {
          throw new Error('Data URL invalide');
        }
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        console.log(`📊 Buffer créé: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
        
        const imageService = require('./image.service');
        const fileUploadId = await imageService.uploadToNotion(imageBuffer, 'screenshot.png');
        
        console.log('✅ Image uploadée, ID:', fileUploadId);
        
        blocks = [{
          type: 'image',
          image: {
            type: 'file_upload',
            file_upload: { id: fileUploadId }
          }
        }];
      }
      // Cas 3 : Autre contenu (texte, markdown, etc.)
      else {
        console.log('📝 Parsing contenu normal...');
        
        const contentType = options.contentType || 'auto';
        blocks = await parserService.parseContent(content, { type: contentType });
      }
      
      if (!blocks || blocks.length === 0) {
        throw new Error('Aucun bloc généré');
      }
      
      console.log(`📦 ${blocks.length} bloc(s) prêt(s)`);
      
      // Envoyer à Notion
      const chunks = [];
      for (let i = 0; i < blocks.length; i += 100) {
        chunks.push(blocks.slice(i, i + 100));
      }
      
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`📤 Envoi chunk ${i + 1}/${chunks.length}`);
        
        const response = await this.client.blocks.children.append({
          block_id: pageId,
          children: chunks[i]
        });
        results.push(response);
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log('✅ Envoi réussi !');
      
      return {
        success: true,
        blocksCreated: blocks.length,
        results
      };
    } catch (error) {
      console.error('❌ Erreur envoi Notion:', error);
      throw error;
    }
  }

  // src/electron/services/notion.service.js
  // CORRECTIF pour l'envoi d'images

  async sendContent(pageId, content, options = {}) {
    if (!this.initialized) {
      throw new Error('Notion service not initialized');
    }

    statsService.increment('api_calls');

    try {
      let blocks = [];
      
      console.log('📊 Envoi contenu, type:', typeof content);
      console.log('📊 Est Buffer?', Buffer.isBuffer(content));
      
      // 🔥 CORRECTION : Détecter les images AVANT tout parsing
      
      // Cas 1 : Buffer direct (meilleur cas)
      if (Buffer.isBuffer(content)) {
        console.log('📸 Buffer détecté, upload direct...');
        console.log(`📊 Taille: ${(content.length / 1024).toFixed(2)} KB`);
        
        const imageService = require('./image.service');
        const fileUploadId = await imageService.uploadToNotion(content, 'image.png');
        
        console.log('✅ Image uploadée, ID:', fileUploadId);
        
        blocks = [{
          type: 'image',
          image: {
            type: 'file_upload',
            file_upload: { id: fileUploadId }
          }
        }];
      }
      // Cas 2 : Data URL (à convertir en Buffer)
      else if (typeof content === 'string' && content.startsWith('data:image')) {
        console.log('📸 Data URL détecté, conversion...');
        
        const base64Data = content.split(',')[1];
        if (!base64Data) {
          throw new Error('Data URL invalide');
        }
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        console.log(`📊 Buffer créé: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
        
        const imageService = require('./image.service');
        const fileUploadId = await imageService.uploadToNotion(imageBuffer, 'screenshot.png');
        
        console.log('✅ Image uploadée, ID:', fileUploadId);
        
        blocks = [{
          type: 'image',
          image: {
            type: 'file_upload',
            file_upload: { id: fileUploadId }
          }
        }];
      }
      // Cas 3 : Autre contenu (texte, markdown, etc.)
      else {
        console.log('📝 Parsing contenu normal...');
        
        const contentDetector = require('./contentDetector');
        const detection = contentDetector.detect(content);
        const contentType = options.type || detection.type;
        
        console.log('📝 Type détecté:', contentType);
        
        try {
          blocks = await notionMarkdownParser.contentToNotionBlocks(content, contentType);
        } catch (parseError) {
          console.warn('⚠️ Erreur parsing, fallback texte:', parseError.message);
          blocks = [{
            type: 'paragraph',
            paragraph: {
              rich_text: [{
                type: 'text',
                text: { content: String(content).substring(0, 2000) }
              }]
            }
          }];
        }
      }
      
      if (!blocks || blocks.length === 0) {
        throw new Error('Aucun bloc généré');
      }
      
      console.log(`📦 ${blocks.length} bloc(s) à envoyer`);
      
      // Diviser en chunks de 100 blocs
      const chunks = [];
      for (let i = 0; i < blocks.length; i += 100) {
        chunks.push(blocks.slice(i, i + 100));
      }
      
      // Envoyer avec délai anti rate-limit
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`📤 Envoi chunk ${i + 1}/${chunks.length}`);
        
        const response = await this.client.blocks.children.append({
          block_id: pageId,
          children: chunks[i]
        });
        results.push(response);
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      statsService.increment('successful_sends');
      console.log(`✅ Envoi réussi`);
      
      return {
        success: true,
        blocksCreated: blocks.length,
        chunks: chunks.length,
        results
      };
    } catch (error) {
      statsService.increment('failed_sends');
      console.error('❌ Erreur envoi:', error);
      
      return {
        success: false,
        error: error.message
      };
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

  // Récupérer le schéma d'une database
  async getDatabaseSchema(databaseId) {
    if (!this.initialized) {
      throw new Error('Notion service not initialized');
    }

    statsService.increment('api_calls');

    try {
      const database = await this.client.databases.retrieve({
        database_id: databaseId
      });

      // Formater les propriétés de la database
      const formattedProperties = {};
      Object.entries(database.properties).forEach(([key, prop]) => {
        formattedProperties[key] = {
          name: prop.name || key,
          type: prop.type,
          options: prop[prop.type]?.options || prop.select?.options || prop.multi_select?.options || null
        };
      });

      return {
        id: database.id,
        title: database.title.map(t => t.plain_text || '').join(''),
        properties: formattedProperties
      };
    } catch (error) {
      statsService.recordError(error.message, 'getDatabaseSchema');
      throw error;
    }
  }

  // Récupérer les informations d'une page (y compris si elle est dans une database)
  async getPageInfo(pageId) {
    if (!this.initialized) {
      throw new Error('Notion service not initialized');
    }

    statsService.increment('api_calls');

    try {
      const page = await this.client.pages.retrieve({
        page_id: pageId
      });

      const formattedPage = this.formatPage(page);

      // Si la page est dans une database, récupérer le schéma
      if (page.parent && page.parent.type === 'database_id') {
        const databaseSchema = await this.getDatabaseSchema(page.parent.database_id);
        return {
          ...formattedPage,
          database: databaseSchema,
          type: 'database_item'
        };
      }

      return {
        ...formattedPage,
        type: 'page'
      };
    } catch (error) {
      statsService.recordError(error.message, 'getPageInfo');
      throw error;
    }
  }
}

module.exports = new NotionService();