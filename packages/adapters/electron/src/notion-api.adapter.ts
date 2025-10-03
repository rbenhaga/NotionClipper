import type { INotionAPI, NotionPage, NotionDatabase, NotionBlock } from '@notion-clipper/core';
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
    this.token = token;
    this.client = new Client({
      auth: token,
      notionVersion: '2022-06-28' // Stable version from memory
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

      // Try to get current user
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
        filter: {
          property: 'object',
          value: 'page'
        },
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
   * Get all pages
   */
  async getPages(): Promise<NotionPage[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.search({
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
      console.error('❌ Error getting pages:', error);
      throw error;
    }
  }

  /**
   * Get all databases
   */
  async getDatabases(): Promise<NotionDatabase[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.search({
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      return response.results
        .filter(item => (item as any).object === 'database')
        .map(item => this.formatDatabase(item));
    } catch (error) {
      console.error('❌ Error getting databases:', error);
      throw error;
    }
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
   * Get database by ID
   */
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.databases.retrieve({ database_id: databaseId });
      return this.formatDatabase(response);
    } catch (error) {
      console.error(`❌ Error getting database ${databaseId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new page
   */
  async createPage(data: {
    parent: { page_id: string } | { database_id: string };
    properties: Record<string, any>;
    children?: NotionBlock[];
  }): Promise<NotionPage> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.pages.create({
        parent: data.parent,
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

      // Upload file to the URL (without conflicting headers from memory)
      const response = await fetch(upload_url, {
        method: 'PUT',
        body: file // Just the buffer, fetch handles headers automatically
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
   * Format page or database response
   */
  private formatPageOrDatabase(item: any): NotionPage | NotionDatabase {
    // Check if it's a database by looking for database-specific properties
    if ((item as any).object === 'database' || (item.title && Array.isArray(item.title) && item.properties && !item.parent?.page_id)) {
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
