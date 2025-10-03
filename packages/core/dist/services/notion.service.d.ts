import { INotionAPI, IStorage } from '../interfaces/index';
import { NotionPage, NotionDatabase } from '../types/index';
/**
 * Core Notion Service with platform-agnostic business logic
 * Uses dependency injection for platform-specific implementations
 */
export declare class NotionService {
    private notionAPI;
    private storage;
    private cache;
    private readonly CACHE_TTL;
    constructor(notionAPI: INotionAPI, storage: IStorage);
    /**
     * Set Notion API token
     */
    setToken(token: string): Promise<void>;
    /**
     * Test Notion API connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Get all pages with caching
     */
    getPages(forceRefresh?: boolean): Promise<NotionPage[]>;
    /**
     * Get all databases with caching
     */
    getDatabases(forceRefresh?: boolean): Promise<NotionDatabase[]>;
    /**
     * Search pages and databases
     */
    search(query: string): Promise<(NotionPage | NotionDatabase)[]>;
    /**
     * Get page by ID with caching
     */
    getPage(pageId: string, forceRefresh?: boolean): Promise<NotionPage | null>;
    /**
     * Get database by ID with caching
     */
    getDatabase(databaseId: string, forceRefresh?: boolean): Promise<NotionDatabase | null>;
    /**
     * Send content to Notion with enhanced detection and parsing
     */
    sendToNotion(data: {
        pageId?: string;
        pageIds?: string[];
        content: string | Buffer;
        options?: {
            contentType?: string;
            metadata?: Record<string, any>;
        };
    }): Promise<{
        success: boolean;
        results?: any[];
        error?: string;
    }>;
    /**
     * Convert content to Notion blocks with enhanced detection
     */
    private contentToBlocks;
    /**
     * Get cached data with TTL check
     */
    private getCachedData;
    /**
     * Set cached data with timestamp
     */
    private setCachedData;
    /**
     * Clear all cache
     */
    clearCache(): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): Promise<{
        entries: number;
        totalSize: number;
        oldestEntry: number | null;
    }>;
}
//# sourceMappingURL=notion.service.d.ts.map