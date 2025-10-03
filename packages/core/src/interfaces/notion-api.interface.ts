import type { NotionPage, NotionDatabase, NotionBlock } from '../types/notion.types';

/**
 * Notion API abstraction interface
 * Allows different API implementations (Direct API, Proxy, Mock)
 */
export interface INotionAPI {
  /**
   * Set API token
   */
  setToken(token: string): void;
  /**
   * Search for pages and databases
   */
  search(query?: string): Promise<(NotionPage | NotionDatabase)[]>;
  
  /**
   * Get all pages
   */
  getPages(): Promise<NotionPage[]>;
  
  /**
   * Get all databases
   */
  getDatabases(): Promise<NotionDatabase[]>;
  
  /**
   * Get page by ID
   */
  getPage(pageId: string): Promise<NotionPage>;
  
  /**
   * Get database by ID
   */
  getDatabase(databaseId: string): Promise<NotionDatabase>;
  
  /**
   * Create a new page
   */
  createPage(data: {
    parent: { page_id: string } | { database_id: string };
    properties: Record<string, any>;
    children?: NotionBlock[];
  }): Promise<NotionPage>;
  
  /**
   * Update a page
   */
  updatePage(pageId: string, data: {
    properties?: Record<string, any>;
  }): Promise<NotionPage>;
  
  /**
   * Append blocks to a page
   */
  appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void>;
  
  /**
   * Upload file to Notion
   */
  uploadFile(file: Buffer, filename: string): Promise<string>;
  
  /**
   * Test API connection
   */
  testConnection(): Promise<boolean>;
}
