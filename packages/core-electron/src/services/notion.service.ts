// packages/core-electron/src/services/notion.service.ts
import type { INotionAPI, NotionPage, NotionDatabase, NotionBlock, ICacheAdapter } from '@notion-clipper/core-shared';

/**
 * Electron Notion Service
 * Node.js implementation with caching support
 */
export class ElectronNotionService {
  constructor(
    private api: INotionAPI,
    private cache?: ICacheAdapter
  ) {}
  
  /**
   * Set Notion API token
   */
  async setToken(token: string): Promise<void> {
    this.api.setToken(token);
    // Clear cache when token changes
    if (this.cache) {
      await this.cache.clear();
    }
  }
  
  /**
   * Test connection to Notion API
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.api.testConnection();
    } catch (error) {
      console.error('[NOTION] Connection test failed:', error);
      return false;
    }
  }
  
  /**
   * Get all pages
   */
  async getPages(forceRefresh = false): Promise<NotionPage[]> {
    const cacheKey = 'notion:pages';
    
    if (!forceRefresh && this.cache) {
      const cached = await this.cache.get<NotionPage[]>(cacheKey);
      if (cached) {
        console.log('[NOTION] Returning cached pages');
        return cached;
      }
    }
    
    console.log('[NOTION] Fetching pages from API...');
    const pages = await this.api.searchPages();
    
    if (this.cache) {
      await this.cache.set(cacheKey, pages, 300000); // 5 minutes
    }
    
    return pages;
  }
  
  /**
   * Get all databases
   */
  async getDatabases(forceRefresh = false): Promise<NotionDatabase[]> {
    const cacheKey = 'notion:databases';
    
    if (!forceRefresh && this.cache) {
      const cached = await this.cache.get<NotionDatabase[]>(cacheKey);
      if (cached) {
        console.log('[NOTION] Returning cached databases');
        return cached;
      }
    }
    
    console.log('[NOTION] Fetching databases from API...');
    const databases = await this.api.searchDatabases();
    
    if (this.cache) {
      await this.cache.set(cacheKey, databases, 300000);
    }
    
    return databases;
  }
  
  /**
   * Search pages by query
   */
  async searchPages(query: string): Promise<NotionPage[]> {
    try {
      return await this.api.searchPages(query);
    } catch (error) {
      console.error('[NOTION] Search pages failed:', error);
      return [];
    }
  }
  
  /**
   * Search databases by query
   */
  async searchDatabases(query: string): Promise<NotionDatabase[]> {
    try {
      return await this.api.searchDatabases(query);
    } catch (error) {
      console.error('[NOTION] Search databases failed:', error);
      return [];
    }
  }
  
  /**
   * Get a specific page
   */
  async getPage(pageId: string): Promise<NotionPage> {
    const cacheKey = `page:${pageId}`;
    
    if (this.cache) {
      const cached = await this.cache.get<NotionPage>(cacheKey);
      if (cached) return cached;
    }
    
    const cleanPageId = pageId.replace(/-/g, '');
    const page = await this.api.getPage(cleanPageId);
    
    if (this.cache) {
      await this.cache.set(cacheKey, page, 300000);
    }
    
    return page;
  }
  
  /**
   * Get a specific database
   */
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    const cacheKey = `database:${databaseId}`;
    
    if (this.cache) {
      const cached = await this.cache.get<NotionDatabase>(cacheKey);
      if (cached) return cached;
    }
    
    const cleanDbId = databaseId.replace(/-/g, '');
    const database = await this.api.getDatabase(cleanDbId);
    
    if (this.cache) {
      await this.cache.set(cacheKey, database, 300000);
    }
    
    return database;
  }
  
  /**
   * Get database schema (properties)
   */
  async getDatabaseSchema(databaseId: string): Promise<any> {
    try {
      const database = await this.getDatabase(databaseId);
      return database.properties || {};
    } catch (error) {
      console.error('[NOTION] Error getting database schema:', error);
      return {};
    }
  }
  
  /**
   * Send content to a Notion page
   */
  async sendContent(
    pageId: string,
    content: any,
    options?: { type?: string; asChild?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanPageId = pageId.replace(/-/g, '');
      
      console.log(`[NOTION] Sending content to page ${pageId}...`);
      
      // Convert content to Notion blocks
      const blocks = this.contentToBlocks(content, options?.type);
      
      if (blocks.length === 0) {
        return {
          success: false,
          error: 'No valid content to send'
        };
      }
      
      // Append blocks to page
      await this.api.appendBlocks(cleanPageId, blocks);
      
      console.log(`[NOTION] ✅ Content sent successfully (${blocks.length} blocks)`);
      
      return { success: true };
    } catch (error: any) {
      console.error('[NOTION] ❌ Send content failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send content'
      };
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
      return await this.api.createPage(data);
    } catch (error) {
      console.error('[NOTION] Error creating page:', error);
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
      const cleanPageId = pageId.replace(/-/g, '');
      return await this.api.updatePage(cleanPageId, data);
    } catch (error) {
      console.error('[NOTION] Error updating page:', error);
      throw error;
    }
  }
  
  /**
   * Append blocks to a page
   */
  async appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void> {
    try {
      const cleanPageId = pageId.replace(/-/g, '');
      await this.api.appendBlocks(cleanPageId, blocks);
    } catch (error) {
      console.error('[NOTION] Error appending blocks:', error);
      throw error;
    }
  }
  
  /**
   * Helper: Convert content to Notion blocks
   */
  private contentToBlocks(content: any, type?: string): NotionBlock[] {
    // Si c'est déjà un tableau de blocs
    if (Array.isArray(content)) {
      return content;
    }

    // Si c'est du texte simple
    if (typeof content === 'string') {
      // Séparer par lignes pour créer plusieurs paragraphes
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines.map(line => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: line }
          }]
        }
      } as NotionBlock));
    }

    // Si c'est un objet avec text
    if (content.text) {
      return [{
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: content.text }
          }]
        }
      } as NotionBlock];
    }

    // Si c'est un objet ClipboardContent
    if (content.data || content.content) {
      const textContent = content.data || content.content;
      if (typeof textContent === 'string') {
        const lines = textContent.split('\n').filter(line => line.trim());
        return lines.map(line => ({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: line }
            }]
          }
        } as NotionBlock));
      }
    }

    // Fallback: retourner un paragraphe vide
    console.warn('[NOTION] Could not parse content, returning empty block');
    return [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: '' }
        }]
      }
    } as NotionBlock];
  }
}