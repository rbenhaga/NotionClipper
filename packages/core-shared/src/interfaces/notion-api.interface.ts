import type { NotionPage, NotionDatabase, NotionBlock } from '../types';

/**
 * Notion API abstraction interface
 */
export interface INotionAPI {
    setToken(token: string): void;
    search(query?: string): Promise<(NotionPage | NotionDatabase)[]>;
    getPages(): Promise<NotionPage[]>;
    getDatabases(): Promise<NotionDatabase[]>;
    getPage(pageId: string): Promise<NotionPage>;
    getDatabase(databaseId: string): Promise<NotionDatabase>;
    createPage(data: {
        parent: { page_id: string } | { database_id: string };
        properties: Record<string, any>;
        children?: NotionBlock[];
    }): Promise<NotionPage>;
    updatePage(pageId: string, data: {
        properties?: Record<string, any>;
    }): Promise<NotionPage>;
    appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void>;
    uploadFile(file: Buffer, filename: string): Promise<string>;
    testConnection(): Promise<boolean>;
}