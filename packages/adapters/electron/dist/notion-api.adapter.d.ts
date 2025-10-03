import type { INotionAPI, NotionPage, NotionDatabase, NotionBlock } from '@notion-clipper/core';
/**
 * Electron Notion API Adapter
 * Implements INotionAPI interface using the official Notion SDK
 */
export declare class ElectronNotionAPIAdapter implements INotionAPI {
    private client;
    private token;
    constructor(token?: string);
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
        parent: {
            page_id: string;
        } | {
            database_id: string;
        };
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
     * Format page or database response
     */
    private formatPageOrDatabase;
    /**
     * Format page response
     */
    private formatPage;
    /**
     * Format database response
     */
    private formatDatabase;
    /**
     * Extract title from properties or title array
     */
    private extractTitle;
    /**
     * Split array into chunks
     */
    private chunkArray;
}
