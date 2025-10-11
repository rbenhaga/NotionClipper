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
      return false;
    }
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
   * Search only pages
   */
  async searchPages(query?: string): Promise<NotionPage[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.search({
        query,
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      return response.results
        .filter(item => item.object === 'page')
        .map(item => this.formatPage(item));
    } catch (error) {
      console.error('❌ Error searching pages:', error);
      throw error;
    }
  }

  /**
   * Search only databases
   * Note: Notion API doesn't support filtering by 'database' directly,
   * so we search all and filter results manually
   */
  async searchDatabases(query?: string): Promise<NotionDatabase[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // Search without filter, then filter manually
      const response = await this.client.search({
        query,
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      // Filter only databases from results
      // Note: TypeScript types are incorrect, databases do exist in results
      return response.results
        .filter(item => this.isDatabase(item))
        .map(item => this.formatDatabase(item));
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

      // Split blocks into chunks of 100 (Notion API limit)
      const chunks = this.chunkArray(blocks, 100);
      
      for (const chunk of chunks) {
        await this.client.blocks.children.append({
          block_id: pageId,
          children: chunk as any
        });
      }
    } catch (error) {
      console.error(`❌ Error appending blocks to page ${pageId}:`, error);
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
    return item.object === 'database';
  }

  /**
   * Format page or database response
   */
  private formatPageOrDatabase(item: any): NotionPage | NotionDatabase {
    // Check object type directly
    if (item.object === 'database') {
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
      in_trash: page.in_trash || false
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
      in_trash: database.in_trash || false
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