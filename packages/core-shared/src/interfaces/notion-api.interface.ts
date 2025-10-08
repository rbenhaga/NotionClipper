// packages/core-shared/src/interfaces/notion-api.interface.ts
import type { NotionPage, NotionDatabase, NotionBlock } from '../types';

/**
 * Notion API abstraction interface
 */
export interface INotionAPI {
    /**
     * Set Notion API token
     */
    setToken(token: string): void;

    /**
     * Test API connection
     */
    testConnection(): Promise<boolean>;

    /**
     * Search for pages and databases
     */
    search(query?: string): Promise<(NotionPage | NotionDatabase)[]>;

    /**
     * Search only pages
     */
    searchPages(query?: string): Promise<NotionPage[]>;

    /**
     * Search only databases
     */
    searchDatabases(query?: string): Promise<NotionDatabase[]>;

    /**
     * Get all pages
     */
    getPages(): Promise<NotionPage[]>;

    /**
     * Get all databases
     */
    getDatabases(): Promise<NotionDatabase[]>;

    /**
     * Get a specific page
     */
    getPage(pageId: string): Promise<NotionPage>;

    /**
     * Get a specific database
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
     * Upload a file (optional, may not be supported in all environments)
     */
    uploadFile?(file: Buffer, filename: string): Promise<string>;
}