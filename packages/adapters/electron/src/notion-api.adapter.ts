// packages/adapters/electron/src/notion-api.adapter.ts
import type { INotionAPI, NotionPage, NotionDatabase, NotionBlock } from '@notion-clipper/core-shared';
import { Client } from '@notionhq/client';

// Declare fetch as global (available in Electron)
declare global {
  function fetch(input: string, init?: any): Promise<any>;
}

/**
 * Electron Notion API Adapter
 * Implements INotionAPI interface using the official Notion SDK
 */
export class ElectronNotionAPIAdapter implements INotionAPI {
  private client: Client | null = null;
  private token: string | null = null;

  constructor(token?: string) {
    if (token) {
      this.setToken(token);
    }
  }

  /**
   * Set Notion API token
   */
  setToken(token: string): void {
    // ✅ Validation du format
    if (!token || token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }
    
    // Validation flexible du token - accepter plusieurs formats
    if (!token.startsWith('ntn_')) {
      console.warn('⚠️ Token format non reconnu - tentative de connexion quand même');
      // Ne pas lancer d'erreur, laisser l'API Notion décider
    }
    
    this.token = token;
    this.client = new Client({
      auth: token,
      notionVersion: '2025-09-03'
    });
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      await this.client.users.me({});
      return true;
    } catch (error) {
      console.error('❌ Notion API connection test failed:', error);
      
      // Vérifier si c'est une erreur d'autorisation
      if ((error as any)?.code === 'unauthorized' || (error as any)?.status === 401) {
        console.error('🔑 Token invalide ou expiré - OAuth requis');
        // Émettre un événement pour déclencher le renouvellement OAuth
        this.emitTokenExpired();
      }
      
      return false;
    }
  }

  /**
   * Émettre un événement quand le token expire
   */
  private emitTokenExpired(): void {
    // Dans un vrai environnement, on utiliserait EventEmitter
    console.log('🔄 Token expiré - renouvellement OAuth nécessaire');
    
    // Pour l'instant, on peut juste logger
    // Dans une version future, on pourrait déclencher automatiquement le renouvellement
  }

  /**
   * Search for pages and databases
   */
  async search(query?: string): Promise<(NotionPage | NotionDatabase)[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.search({
        query,
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      return response.results.map(item => this.formatPageOrDatabase(item));
    } catch (error) {
      console.error('❌ Error searching Notion:', error);
      throw error;
    }
  }

  /**
   * Search only pages with pagination support
   */
  async searchPages(query?: string): Promise<NotionPage[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const allPages: NotionPage[] = [];
      let hasMore = true;
      let startCursor: string | undefined;

      while (hasMore) {
        const response = await this.client.search({
          query,
          filter: {
            property: 'object',
            value: 'page'
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: 100, // Maximum per request
          start_cursor: startCursor
        });

        const pages = response.results
          .filter(item => item.object === 'page')
          .map(item => this.formatPage(item));

        allPages.push(...pages);

        // Émettre un événement de progression via le main window
        try {
          const { BrowserWindow } = require('electron');
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('pages:progress', {
              count: allPages.length,
              batch: pages.length,
              completed: false
            });
          }
        } catch (error) {
          // Ignorer les erreurs d'émission d'événements
        }

        hasMore = response.has_more;
        startCursor = response.next_cursor || undefined;

        // Limite de sécurité pour éviter les boucles infinies
        if (allPages.length > 10000) {
          console.warn('[NOTION] ⚠️ Reached safety limit of 10,000 pages');
          break;
        }
      }

      console.log(`[NOTION] ✅ Retrieved ${allPages.length} pages total`);
      
      // Émettre un événement final de progression
      try {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('pages:progress', {
            count: allPages.length,
            total: allPages.length,
            completed: true
          });
        }
      } catch (error) {
        // Ignorer les erreurs d'émission d'événements
      }
      
      return allPages;
    } catch (error) {
      console.error('❌ Error searching pages:', error);
      throw error;
    }
  }

  /**
   * Search only databases with pagination support
   * Note: Notion API doesn't support filtering by 'database' directly,
   * so we search all and filter results manually
   */
  async searchDatabases(query?: string): Promise<NotionDatabase[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const allDatabases: NotionDatabase[] = [];
      let hasMore = true;
      let startCursor: string | undefined;

      while (hasMore) {
        // Search without filter, then filter manually
        const response = await this.client.search({
          query,
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: 100, // Maximum per request
          start_cursor: startCursor
        });

        // Filter only databases from results
        const databases = response.results
          .filter(item => this.isDatabase(item))
          .map(item => this.formatDatabase(item));

        allDatabases.push(...databases);

        hasMore = response.has_more;
        startCursor = response.next_cursor || undefined;

        // Limite de sécurité pour éviter les boucles infinies
        if (allDatabases.length > 1000) {
          console.warn('[NOTION] ⚠️ Reached safety limit of 1,000 databases');
          break;
        }
      }

      console.log(`[NOTION] ✅ Retrieved ${allDatabases.length} databases total`);
      return allDatabases;
    } catch (error) {
      console.error('❌ Error searching databases:', error);
      throw error;
    }
  }

  /**
   * Get all pages
   */
  async getPages(): Promise<NotionPage[]> {
    // Use searchPages without query to get all pages
    return this.searchPages();
  }

  /**
   * Get all databases
   */
  async getDatabases(): Promise<NotionDatabase[]> {
    // Use searchDatabases without query to get all databases
    return this.searchDatabases();
  }

  /**
   * Get page by ID
   */
  async getPage(pageId: string): Promise<NotionPage> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.pages.retrieve({ page_id: pageId });
      return this.formatPage(response);
    } catch (error) {
      console.error(`❌ Error getting page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Get database by ID with data source support
   */
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // With API version 2025-09-03, we need to get data sources
      const response = await this.client.databases.retrieve({ database_id: databaseId });
      const database = this.formatDatabase(response);
      
      // Add data source information if available (cast to any for new API fields)
      const responseWithDataSources = response as any;
      if (responseWithDataSources.data_sources && responseWithDataSources.data_sources.length > 0) {
        database.data_sources = responseWithDataSources.data_sources;
        // Use the first data source as default for backward compatibility
        database.default_data_source_id = responseWithDataSources.data_sources[0].id;
      }
      
      return database;
    } catch (error) {
      console.error(`❌ Error getting database ${databaseId}:`, error);
      throw error;
    }
  }

  /**
   * Get data source information for a database
   */
  async getDataSource(dataSourceId: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // Use custom request for data source API (not yet in SDK)
      const response = await (this.client as any).request({
        path: `data_sources/${dataSourceId}`,
        method: 'GET'
      });
      
      return response;
    } catch (error) {
      console.error('❌ Error retrieving data source:', error);
      throw error;
    }
  }

  /**
   * Create a new page
   */
  async createPage(data: {
    parent: { page_id: string } | { database_id: string } | { data_source_id: string };
    properties: Record<string, any>;
    children?: NotionBlock[];
  }): Promise<NotionPage> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // Handle data_source_id parent by converting to database_id for SDK compatibility
      let parentForSDK = data.parent;
      if ('data_source_id' in data.parent) {
        // For now, we'll need to get the database_id from the data source
        // This is a temporary workaround until SDK v5 is available
        console.warn('data_source_id parent detected, using as-is with cast');
        parentForSDK = data.parent as any;
      }

      const response = await this.client.pages.create({
        parent: parentForSDK as any,
        properties: data.properties,
        children: (data.children || []) as any
      });

      return this.formatPage(response);
    } catch (error) {
      console.error('❌ Error creating page:', error);
      throw error;
    }
  }

  /**
   * Update a page
   */
  async updatePage(pageId: string, data: {
    properties?: Record<string, any>;
  }): Promise<NotionPage> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.pages.update({
        page_id: pageId,
        properties: data.properties || {}
      });

      return this.formatPage(response);
    } catch (error) {
      console.error(`❌ Error updating page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Append blocks to a page
   */
  async appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const cleanPageId = pageId.replace(/-/g, '');

      // Split blocks into chunks of 100 (Notion API limit)
      const chunks = this.chunkArray(blocks, 100);
      
      for (const chunk of chunks) {
        await this.client.blocks.children.append({
          block_id: cleanPageId,
          children: chunk as any
        });
      }
    } catch (error) {
      console.error(`❌ Error appending blocks to page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU: Append blocks AFTER a specific block
   * Uses Notion API PATCH /blocks/{parent_id}/children with 'after' parameter
   */
  async appendBlocksAfter(blockId: string, blocks: NotionBlock[]): Promise<void> {
    try {
      if (!this.client || !this.token) {
        throw new Error('Notion client not initialized');
      }

      const cleanBlockId = blockId.replace(/-/g, '');
      console.log(`[API] Appending ${blocks.length} blocks after block ${cleanBlockId}`);

      // ✅ ÉTAPE 1: Récupérer le bloc pour obtenir son parent
      const blockResponse = await fetch(`https://api.notion.com/v1/blocks/${cleanBlockId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!blockResponse.ok) {
        const error = await blockResponse.json();
        throw new Error(`Failed to get block: ${error.message || blockResponse.statusText}`);
      }

      const block = await blockResponse.json();
      const parentId = block.parent?.page_id || block.parent?.block_id;

      if (!parentId) {
        throw new Error('Could not determine parent block/page ID');
      }

      console.log(`[API] Parent ID: ${parentId}, inserting after block ${cleanBlockId}`);

      // ✅ ÉTAPE 2: Utiliser PATCH sur le parent avec le paramètre 'after'
      const response = await fetch(`https://api.notion.com/v1/blocks/${parentId}/children`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          children: blocks,
          after: cleanBlockId // ✅ Insère APRÈS ce bloc
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Notion API error: ${error.message || response.statusText}`);
      }

      console.log(`[API] ✅ Successfully appended blocks after ${cleanBlockId}`);
    } catch (error) {
      console.error('❌ Error appending blocks after specific block:', error);
      throw error;
    }
  }

  /**
   * Get page blocks (children)
   */
  async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const blocks: NotionBlock[] = [];
      let cursor: string | undefined;

      do {
        const response = await this.client.blocks.children.list({
          block_id: pageId,
          start_cursor: cursor,
          page_size: 100
        });

        blocks.push(...response.results as NotionBlock[]);
        cursor = response.has_more ? response.next_cursor || undefined : undefined;
      } while (cursor);

      return blocks;
    } catch (error) {
      console.error(`❌ Error getting blocks for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Upload file to Notion
   */
  async uploadFile(file: Buffer, filename: string): Promise<string> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // First, get upload URL
      const uploadResponse = await (this.client as any).request({
        path: 'files',
        method: 'POST',
        body: {
          name: filename,
          type: 'file'
        }
      });

      const { upload_url, id } = uploadResponse as any;

      // Upload file to the URL
      const response = await fetch(upload_url, {
        method: 'PUT',
        body: file
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      return id;
    } catch (error) {
      console.error('❌ Error uploading file to Notion:', error);
      throw error;
    }
  }

  /**
   * Check if item is a database
   */
  private isDatabase(item: any): boolean {
    return item.object === 'database' || item.object === 'data_source';
  }

  /**
   * Format page or database response
   */
  private formatPageOrDatabase(item: any): NotionPage | NotionDatabase {
    // Check object type directly
    if (item.object === 'database' || item.object === 'data_source') {
      return this.formatDatabase(item);
    } else {
      return this.formatPage(item);
    }
  }

  /**
   * Format page response
   */
  private formatPage(page: any): NotionPage {
    return {
      id: page.id,
      title: this.extractTitle(page.properties),
      url: page.url,
      icon: page.icon,
      cover: page.cover,
      parent: page.parent,
      properties: page.properties || {},
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      archived: page.archived || false,
      in_trash: page.in_trash || false,
      type: 'page' // Ajouter le type pour que PageCard puisse différencier
    };
  }

  /**
   * Format database response
   */
  private formatDatabase(database: any): NotionDatabase {
    return {
      id: database.id,
      title: this.extractTitle(database.title),
      description: database.description || '',
      icon: database.icon,
      cover: database.cover,
      properties: database.properties || {},
      parent: database.parent,
      url: database.url,
      created_time: database.created_time,
      last_edited_time: database.last_edited_time,
      archived: database.archived || false,
      in_trash: database.in_trash || false,
      type: 'database' // Ajouter le type pour que PageCard puisse détecter les databases
    };
  }

  /**
   * Extract title from properties or title array
   */
  private extractTitle(properties: any): string {
    if (Array.isArray(properties)) {
      // Database title format
      return properties.map(item => item.plain_text).join('');
    }

    // Page properties format
    for (const [key, value] of Object.entries(properties)) {
      const prop = value as any;
      if (prop.type === 'title' && prop.title) {
        return prop.title.map((item: any) => item.plain_text).join('');
      }
    }

    return 'Untitled';
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}