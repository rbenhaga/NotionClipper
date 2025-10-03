// apps/notion-clipper-app/src/electron/adapters/notion-api.adapter.js
const { Client } = require('@notionhq/client');

class ElectronNotionAPIAdapter {
  constructor() {
    this.client = null;
    this.token = null;
  }

  // Initialiser avec un token
  initialize(token) {
    if (!token) {
      throw new Error('Notion token is required');
    }
    
    this.token = token;
    this.client = new Client({ auth: token });
    console.log('[OK] Notion API client initialized');
  }

  // Vérifier si initialisé
  isInitialized() {
    return this.client !== null;
  }

  // Tester la connexion
  async testConnection() {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      const response = await this.client.users.me();
      return {
        success: true,
        user: response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Rechercher toutes les pages accessibles
  async searchPages(query = '') {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      const response = await this.client.search({
        query,
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' }
      });

      return response.results;
    } catch (error) {
      console.error('Error searching pages:', error);
      throw error;
    }
  }

  // Obtenir les informations d'une page
  async getPage(pageId) {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      return await this.client.pages.retrieve({ page_id: pageId });
    } catch (error) {
      console.error('Error getting page:', error);
      throw error;
    }
  }

  // Créer une page
  async createPage(data) {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      return await this.client.pages.create(data);
    } catch (error) {
      console.error('Error creating page:', error);
      throw error;
    }
  }

  // Ajouter du contenu à une page
  async appendBlockChildren(blockId, children) {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      return await this.client.blocks.children.append({
        block_id: blockId,
        children
      });
    } catch (error) {
      console.error('Error appending blocks:', error);
      throw error;
    }
  }

  // Obtenir les blocks d'une page
  async getBlockChildren(blockId) {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      return await this.client.blocks.children.list({ block_id: blockId });
    } catch (error) {
      console.error('Error getting block children:', error);
      throw error;
    }
  }

  // Obtenir une database
  async getDatabase(databaseId) {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      return await this.client.databases.retrieve({ database_id: databaseId });
    } catch (error) {
      console.error('Error getting database:', error);
      throw error;
    }
  }

  // Query database
  async queryDatabase(databaseId, filter = {}) {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      return await this.client.databases.query({
        database_id: databaseId,
        ...filter
      });
    } catch (error) {
      console.error('Error querying database:', error);
      throw error;
    }
  }

  // Uploader une image (via Notion)
  async uploadImage(pageId, imageUrl) {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      // Notion accepte des URLs externes
      return await this.appendBlockChildren(pageId, [{
        type: 'image',
        image: {
          type: 'external',
          external: { url: imageUrl }
        }
      }]);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
}

module.exports = ElectronNotionAPIAdapter;
