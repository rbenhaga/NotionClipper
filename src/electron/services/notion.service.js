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

    // IMPORTANT : Préserver TOUTES les informations du parent
    let formattedParent = null;
    if (page.parent) {
      formattedParent = {
        type: page.parent.type,
        page_id: page.parent.page_id,
        database_id: page.parent.database_id,
        data_source_id: page.parent.data_source_id,  // AJOUTER
        workspace: page.parent.workspace,
        block_id: page.parent.block_id
      };
    }

    const formatted = {
      id: page.id,
      title: title,
      type: isDatabase ? 'database' : 'page',
      object: page.object,
      icon: page.icon,
      cover: page.cover,
      url: page.url,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      archived: page.archived || false,
      parent: formattedParent,  // IMPORTANT : Conserver le parent formaté
      properties: page.properties || {}
    };

    // Debug pour vérifier
    if (formattedParent?.type === 'database_id' || formattedParent?.type === 'data_source_id') {
      console.log(`📊 Page "${title}" dans database: ${formattedParent.database_id || formattedParent.data_source_id}`);
    }

    return formatted;
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

  // src/electron/services/notion.service.js
  // Fonction sendToNotion complète avec correction du découpage

  /**
   * Envoyer du contenu vers Notion
   * @param {Object} data - Les données d'envoi
   * @param {string} data.pageId - ID de la page Notion
   * @param {string|Buffer} data.content - Le contenu à envoyer
   * @param {Object} data.options - Options d'envoi
   */
  async sendToNotion(data) {
    const { pageId, content, options = {} } = data;

    if (!this.initialized) {
      await this.initialize();
    }

    const statsService = require('./stats.service');
    const notionMarkdownParser = require('./notionMarkdownParser');

    try {
      console.log('📊 sendToNotion appelé');
      console.log('   Contenu:', typeof content === 'string' ? content.substring(0, 50) : 'non-string');
      console.log('   Options:', JSON.stringify(options, null, 2));

      // 🔥 ÉTAPE 1 : Mise à jour des propriétés si fournies
      if (options.properties && Object.keys(options.properties).length > 0) {
        try {
          console.log('📝 Mise à jour des propriétés de la page...');

          // Récupérer les infos complètes de la page (avec schéma DB)
          const pageInfo = await this.getPageInfo(pageId);

          // Vérifier si la page est dans une database
          if (pageInfo.type === 'database_item' && pageInfo.database) {
            console.log('✅ Page dans une database, mise à jour des propriétés...');

            const formattedProperties = {};
            const dbSchema = pageInfo.database.properties;

            for (const [key, value] of Object.entries(options.properties)) {
              // Ignorer les propriétés vides
              if (value === '' || value === null || value === undefined) continue;

              // Récupérer le schéma de cette propriété
              const propSchema = dbSchema[key];
              if (!propSchema) {
                console.warn(`⚠️ Propriété "${key}" non trouvée dans le schéma`);
                continue;
              }

              console.log(`   - ${key} (${propSchema.type}): ${value}`);

              // Formater selon le type
              switch (propSchema.type) {
                case 'title':
                  formattedProperties[key] = {
                    title: [{
                      type: 'text',
                      text: { content: String(value) }
                    }]
                  };
                  break;

                case 'rich_text':
                  formattedProperties[key] = {
                    rich_text: [{
                      type: 'text',
                      text: { content: String(value) }
                    }]
                  };
                  break;

                case 'number':
                  formattedProperties[key] = {
                    number: parseFloat(value) || 0
                  };
                  break;

                case 'select':
                  // Vérifier si la valeur est dans les options disponibles
                  if (propSchema.options) {
                    const validOption = propSchema.options.find(opt =>
                      opt.name.toLowerCase() === String(value).toLowerCase()
                    );
                    if (validOption) {
                      formattedProperties[key] = {
                        select: { name: validOption.name }
                      };
                    } else {
                      // Créer une nouvelle option si autorisé
                      formattedProperties[key] = {
                        select: { name: String(value) }
                      };
                    }
                  } else {
                    formattedProperties[key] = {
                      select: { name: String(value) }
                    };
                  }
                  break;

                case 'multi_select':
                  const values = Array.isArray(value)
                    ? value
                    : String(value).split(',').map(v => v.trim()).filter(v => v);

                  const multiSelectOptions = [];
                  for (const val of values) {
                    if (propSchema.options) {
                      const validOption = propSchema.options.find(opt =>
                        opt.name.toLowerCase() === val.toLowerCase()
                      );
                      multiSelectOptions.push({
                        name: validOption ? validOption.name : val
                      });
                    } else {
                      multiSelectOptions.push({ name: val });
                    }
                  }

                  if (multiSelectOptions.length > 0) {
                    formattedProperties[key] = {
                      multi_select: multiSelectOptions
                    };
                  }
                  break;

                case 'checkbox':
                  formattedProperties[key] = {
                    checkbox: Boolean(value)
                  };
                  break;

                case 'date':
                  formattedProperties[key] = {
                    date: {
                      start: value,
                      end: null
                    }
                  };
                  break;

                case 'url':
                  formattedProperties[key] = {
                    url: String(value)
                  };
                  break;

                case 'email':
                  formattedProperties[key] = {
                    email: String(value)
                  };
                  break;

                case 'phone_number':
                  formattedProperties[key] = {
                    phone_number: String(value)
                  };
                  break;

                case 'status':
                  if (propSchema.options) {
                    const validStatus = propSchema.options.find(opt =>
                      opt.name.toLowerCase() === String(value).toLowerCase()
                    );
                    if (validStatus) {
                      formattedProperties[key] = {
                        status: { name: validStatus.name }
                      };
                    }
                  } else {
                    formattedProperties[key] = {
                      status: { name: String(value) }
                    };
                  }
                  break;

                default:
                  console.warn(`⚠️ Type de propriété non supporté: ${propSchema.type}`);
              }
            }

            // Mettre à jour les propriétés de la page
            if (Object.keys(formattedProperties).length > 0) {
              console.log('📤 Mise à jour des propriétés:', formattedProperties);

              try {
                const updateResponse = await this.client.pages.update({
                  page_id: pageId,
                  properties: formattedProperties
                });

                console.log('✅ Propriétés mises à jour avec succès');
              } catch (updateError) {
                console.error('❌ Erreur mise à jour propriétés:', updateError);
                // Continuer quand même pour ajouter le contenu
              }
            }
          } else {
            console.log('⚠️ La page n\'est pas dans une database');
          }
        } catch (propError) {
          console.error('❌ Erreur traitement propriétés:', propError);
        }
      }

      // ÉTAPE 2 : Ajouter le contenu (le reste du code existant...)
      let blocks = [];

      if (options.contentType === 'image') {
        console.log('📸 Traitement image détecté');

        let imageUrl = null;
        if (typeof content === 'string' && content.startsWith('data:image')) {
          console.log('📸 Data URL détectée, upload vers imgBB...');

          const imgbbService = require('./imgbb.service');
          const base64Data = content.split(',')[1];
          const uploadResult = await imgbbService.uploadImage(base64Data);

          if (uploadResult.success) {
            imageUrl = uploadResult.url;
            console.log('✅ Image uploadée:', imageUrl);
          }
        }

        if (imageUrl) {
          blocks = [{
            type: 'image',
            image: {
              type: 'external',
              external: { url: imageUrl }
            }
          }];
        } else {
          throw new Error('Impossible d\'uploader l\'image');
        }
      } else {
        console.log('📝 Parsing contenu texte...');

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

      // Valider et découper les blocs
      blocks = this.validateAndSplitBlocks(blocks);
      console.log(`📦 ${blocks.length} bloc(s) validé(s) à envoyer`);

      // Diviser en chunks de 100 blocs
      const chunks = [];
      for (let i = 0; i < blocks.length; i += 100) {
        chunks.push(blocks.slice(i, i + 100));
      }

      // Envoyer les blocs
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

  /**
   * 🆕 Valide et découpe les blocs pour respecter les limites de l'API Notion
   * @param {Array} blocks - Les blocs à valider
   * @returns {Array} - Les blocs validés et découpés si nécessaire
   */
  validateAndSplitBlocks(blocks) {
    const MAX_RICH_TEXT_LENGTH = 2000;
    const validatedBlocks = [];

    for (const block of blocks) {
      // Types de blocs supportés avec rich_text
      const blockTypes = [
        'paragraph', 'heading_1', 'heading_2', 'heading_3',
        'bulleted_list_item', 'numbered_list_item', 'to_do',
        'toggle', 'quote', 'callout'
      ];

      const blockType = block.type;

      // Vérifier si le bloc a du rich_text
      if (blockTypes.includes(blockType) && block[blockType]?.rich_text) {
        const richTextArray = block[blockType].rich_text;

        // Parcourir chaque élément rich_text
        let needsSplitting = false;

        for (const richTextItem of richTextArray) {
          if (richTextItem.type === 'text' && richTextItem.text?.content) {
            const content = richTextItem.text.content;

            // Si le contenu dépasse la limite
            if (content.length > MAX_RICH_TEXT_LENGTH) {
              needsSplitting = true;
              console.log(`⚠️ Texte trop long détecté: ${content.length} caractères, découpage...`);

              // Découper le texte en chunks
              const chunks = this.splitTextIntoChunks(content, MAX_RICH_TEXT_LENGTH);

              // Créer un bloc pour chaque chunk
              for (const chunk of chunks) {
                validatedBlocks.push({
                  type: blockType,
                  [blockType]: {
                    ...block[blockType],
                    rich_text: [{
                      type: 'text',
                      text: {
                        content: chunk,
                        link: richTextItem.text.link || null
                      },
                      annotations: richTextItem.annotations || {}
                    }]
                  }
                });
              }
              break; // On sort de la boucle car on a traité ce bloc
            }
          }
        }

        // Si pas besoin de découpage, ajouter le bloc tel quel
        if (!needsSplitting) {
          validatedBlocks.push(block);
        }
      } else {
        // Autres types de blocs (image, code, divider, table, etc.)
        validatedBlocks.push(block);
      }
    }

    return validatedBlocks;
  }

  /**
   * 🆕 Découpe un texte en chunks respectant les limites
   * @param {string} text - Le texte à découper
   * @param {number} maxLength - Longueur maximale par chunk
   * @returns {Array<string>} - Les chunks de texte
   */
  splitTextIntoChunks(text, maxLength) {
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Trouver le meilleur point de coupe
      const cutPoint = this.findBestCutPoint(remaining, maxLength);
      chunks.push(remaining.substring(0, cutPoint));
      remaining = remaining.substring(cutPoint);
    }

    console.log(`   ✂️ Texte découpé en ${chunks.length} bloc(s)`);
    return chunks;
  }

  /**
   * 🆕 Trouve le meilleur point de coupe pour découper le texte proprement
   * @param {string} text - Le texte à analyser
   * @param {number} maxLength - Longueur maximale
   * @returns {number} - L'index du point de coupe
   */
  findBestCutPoint(text, maxLength) {
    if (text.length <= maxLength) return text.length;

    // Zone de recherche : derniers 10% avant la limite (min 200 caractères)
    const searchRange = Math.min(200, Math.floor(maxLength / 10));
    const searchStart = Math.max(0, maxLength - searchRange);
    const searchText = text.substring(searchStart, maxLength);

    // 1. Chercher un double saut de ligne (nouveau paragraphe)
    const doubleNewline = searchText.lastIndexOf('\n\n');
    if (doubleNewline !== -1) {
      return searchStart + doubleNewline + 2;
    }

    // 2. Chercher un simple saut de ligne
    const newline = searchText.lastIndexOf('\n');
    if (newline !== -1) {
      return searchStart + newline + 1;
    }

    // 3. Chercher la fin d'une phrase
    const sentenceEnds = ['. ', '! ', '? ', '。', '！', '？'];
    let bestSentenceEnd = -1;
    for (const end of sentenceEnds) {
      const index = searchText.lastIndexOf(end);
      if (index > bestSentenceEnd) {
        bestSentenceEnd = index;
      }
    }
    if (bestSentenceEnd !== -1) {
      return searchStart + bestSentenceEnd + 2; // +2 pour inclure le caractère de fin et l'espace
    }

    // 4. Chercher un espace
    const space = searchText.lastIndexOf(' ');
    if (space !== -1) {
      return searchStart + space + 1;
    }

    // 5. En dernier recours, couper à la limite exacte
    return maxLength;
  }

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
      console.log('🔍 Getting database schema for ID:', databaseId);

      const database = await this.client.databases.retrieve({
        database_id: databaseId
      });

      console.log('📊 Database retrieved:', database ? 'Yes' : 'No');
      console.log('📊 Has properties?', database?.properties ? 'Yes' : 'No');

      // Vérifier que les propriétés existent
      if (!database || !database.properties) {
        console.error('❌ Database sans propriétés:', database);
        throw new Error('Database n\'a pas de propriétés définies');
      }

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
        title: database.title?.map(t => t.plain_text || '').join('') || 'Sans titre',
        properties: formattedProperties
      };
    } catch (error) {
      console.error('❌ getDatabaseSchema error:', error);
      statsService.recordError(error.message, 'getDatabaseSchema');
      throw error;
    }
  }

  // Récupérer les informations d'une page (y compris si elle est dans une database)
  async getPageInfo(pageId) {
    if (!this.initialized) {
      throw new Error('Notion service not initialized');
    }

    const statsService = require('./stats.service');
    statsService.increment('api_calls');

    try {
      const page = await this.client.pages.retrieve({
        page_id: pageId
      });

      console.log('🔍 Retrieved page with properties:', Object.keys(page.properties || {}));

      const formattedPage = this.formatPage(page);

      // Si la page est dans une database
      if (page.parent && (page.parent.type === 'database_id' || page.parent.type === 'data_source_id')) {
        const databaseId = page.parent.database_id || page.parent.data_source_id;

        // 🔥 NOUVEAU : Récupérer le schéma COMPLET de la database avec les options
        let databaseSchema = null;
        try {
          console.log('📊 Récupération du schéma de la database:', databaseId);
          const database = await this.client.databases.retrieve({
            database_id: databaseId
          });

          // Extraire le schéma avec TOUTES les options
          databaseSchema = {};
          if (database.properties) {
            Object.entries(database.properties).forEach(([key, prop]) => {
              databaseSchema[key] = {
                id: prop.id || key,
                name: prop.name || key,
                type: prop.type,
                options: null
              };

              // Récupérer les options selon le type
              if (prop.type === 'select' && prop.select?.options) {
                databaseSchema[key].options = prop.select.options;
              } else if (prop.type === 'multi_select' && prop.multi_select?.options) {
                databaseSchema[key].options = prop.multi_select.options;
              } else if (prop.type === 'status' && prop.status?.options) {
                databaseSchema[key].options = prop.status.options;
              }
            });
          }

          console.log('✅ Schéma de database récupéré avec options');
        } catch (dbError) {
          console.warn('⚠️ Impossible de récupérer le schéma de la database:', dbError.message);
          // Fallback : créer un schéma depuis les propriétés de la page
          databaseSchema = {};
          if (page.properties) {
            Object.entries(page.properties).forEach(([key, prop]) => {
              databaseSchema[key] = {
                id: prop.id || key,
                name: key,
                type: prop.type,
                options: null
              };
            });
          }
        }

        console.log('📊 Schema final:', databaseSchema);

        return {
          ...formattedPage,
          database: {
            id: databaseId,
            title: 'Database',
            properties: databaseSchema
          },
          type: 'database_item',
          properties: page.properties
        };
      }

      return {
        ...formattedPage,
        type: 'page',
        properties: page.properties
      };
    } catch (error) {
      console.error('❌ getPageInfo error:', error);
      statsService.recordError(error.message, 'getPageInfo');
      throw error;
    }
  }
}

module.exports = new NotionService();