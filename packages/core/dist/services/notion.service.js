import { notionMarkdownParser, contentDetector } from '../parsers/index';
/**
 * Core Notion Service with platform-agnostic business logic
 * Uses dependency injection for platform-specific implementations
 */
export class NotionService {
    notionAPI;
    storage;
    cache = new Map();
    CACHE_TTL = 3600000; // 1 hour
    constructor(notionAPI, storage) {
        this.notionAPI = notionAPI;
        this.storage = storage;
    }
    /**
     * Set Notion API token
     */
    async setToken(token) {
        this.notionAPI.setToken(token);
        await this.storage.set('notion.token', token);
        // Clear cache when token changes
        this.clearCache();
    }
    /**
     * Test Notion API connection
     */
    async testConnection() {
        try {
            return await this.notionAPI.testConnection();
        }
        catch (error) {
            console.error('❌ Error testing Notion connection:', error);
            return false;
        }
    }
    /**
     * Get all pages with caching
     */
    async getPages(forceRefresh = false) {
        const cacheKey = 'pages';
        if (!forceRefresh) {
            const cached = await this.getCachedData(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            const pages = await this.notionAPI.getPages();
            await this.setCachedData(cacheKey, pages);
            return pages;
        }
        catch (error) {
            console.error('❌ Error getting pages:', error);
            // Return cached data if available, even if expired
            const cached = await this.storage.get(`cache.${cacheKey}`);
            return cached || [];
        }
    }
    /**
     * Get all databases with caching
     */
    async getDatabases(forceRefresh = false) {
        const cacheKey = 'databases';
        if (!forceRefresh) {
            const cached = await this.getCachedData(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            const databases = await this.notionAPI.getDatabases();
            await this.setCachedData(cacheKey, databases);
            return databases;
        }
        catch (error) {
            console.error('❌ Error getting databases:', error);
            // Return cached data if available, even if expired
            const cached = await this.storage.get(`cache.${cacheKey}`);
            return cached || [];
        }
    }
    /**
     * Search pages and databases
     */
    async search(query) {
        try {
            return await this.notionAPI.search(query);
        }
        catch (error) {
            console.error('❌ Error searching Notion:', error);
            return [];
        }
    }
    /**
     * Get page by ID with caching
     */
    async getPage(pageId, forceRefresh = false) {
        const cacheKey = `page.${pageId}`;
        if (!forceRefresh) {
            const cached = await this.getCachedData(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            const page = await this.notionAPI.getPage(pageId);
            await this.setCachedData(cacheKey, page);
            return page;
        }
        catch (error) {
            console.error(`❌ Error getting page ${pageId}:`, error);
            return null;
        }
    }
    /**
     * Get database by ID with caching
     */
    async getDatabase(databaseId, forceRefresh = false) {
        const cacheKey = `database.${databaseId}`;
        if (!forceRefresh) {
            const cached = await this.getCachedData(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            const database = await this.notionAPI.getDatabase(databaseId);
            await this.setCachedData(cacheKey, database);
            return database;
        }
        catch (error) {
            console.error(`❌ Error getting database ${databaseId}:`, error);
            return null;
        }
    }
    /**
     * Send content to Notion with enhanced detection and parsing
     */
    async sendToNotion(data) {
        try {
            const { pageId, pageIds, content, options = {} } = data;
            const targetPages = pageIds || (pageId ? [pageId] : []);
            if (targetPages.length === 0) {
                throw new Error('No target pages specified');
            }
            // Detect content type and convert to blocks
            const blocks = await this.contentToBlocks(content, options);
            if (blocks.length === 0) {
                throw new Error('No content blocks generated');
            }
            // Send to all target pages
            const results = [];
            for (const targetPageId of targetPages) {
                try {
                    await this.notionAPI.appendBlocks(targetPageId, blocks);
                    results.push({ pageId: targetPageId, success: true });
                }
                catch (error) {
                    console.error(`❌ Error sending to page ${targetPageId}:`, error);
                    results.push({ pageId: targetPageId, success: false, error: error?.message || 'Unknown error' });
                }
            }
            const successCount = results.filter(r => r.success).length;
            console.log(`✅ Content sent to ${successCount}/${targetPages.length} pages`);
            return {
                success: successCount > 0,
                results
            };
        }
        catch (error) {
            console.error('❌ Error in sendToNotion:', error);
            return {
                success: false,
                error: error?.message || 'Unknown error'
            };
        }
    }
    /**
     * Convert content to Notion blocks with enhanced detection
     */
    async contentToBlocks(content, options = {}) {
        try {
            // Handle different content types with priority from memory
            // Case 1: Buffer (image) - local usage only
            if (Buffer.isBuffer(content)) {
                console.log('📊 Buffer detected, direct upload...');
                const fileUploadId = await this.notionAPI.uploadFile(content, 'screenshot.png');
                return [{
                        type: 'image',
                        image: {
                            type: 'file_upload',
                            file_upload: { id: fileUploadId }
                        }
                    }];
            }
            // Case 2: Data URL (from IPC) - MAIN case from memory
            if (typeof content === 'string' && content.startsWith('data:image')) {
                console.log('📸 Data URL detected, conversion...');
                const imageBuffer = Buffer.from(content.split(',')[1], 'base64');
                console.log(`📊 Buffer created: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
                const fileUploadId = await this.notionAPI.uploadFile(imageBuffer, 'screenshot.png');
                return [{
                        type: 'image',
                        image: {
                            type: 'file_upload',
                            file_upload: { id: fileUploadId }
                        }
                    }];
            }
            // Case 3: Text/Markdown content
            if (typeof content === 'string') {
                // Detect content type
                const detection = contentDetector.detect(content);
                // Parse content to Notion blocks
                const blocks = notionMarkdownParser.parseContent(content, detection, {
                    contentType: options.contentType,
                    metadata: options.metadata,
                    maxBlocksPerRequest: 100,
                    maxRichTextLength: 2000
                });
                console.log(`📦 ${blocks.length} block(s) ready`);
                return blocks;
            }
            throw new Error('Unsupported content type');
        }
        catch (error) {
            console.error('❌ Error converting content to blocks:', error);
            // Fallback: create simple text block
            const fallbackContent = typeof content === 'string' ? content : '[Content]';
            return [{
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{
                                type: 'text',
                                text: { content: fallbackContent },
                                plain_text: fallbackContent
                            }],
                        color: 'default'
                    }
                }];
        }
    }
    /**
     * Get cached data with TTL check
     */
    async getCachedData(key) {
        try {
            const cached = await this.storage.get(`cache.${key}`);
            if (!cached)
                return null;
            // Check if cache is still valid
            const now = Date.now();
            if (now - cached.timestamp > this.CACHE_TTL) {
                // Cache expired, remove it
                await this.storage.remove(`cache.${key}`);
                return null;
            }
            return cached.data;
        }
        catch (error) {
            console.error(`❌ Error getting cached data for ${key}:`, error);
            return null;
        }
    }
    /**
     * Set cached data with timestamp
     */
    async setCachedData(key, data) {
        try {
            await this.storage.set(`cache.${key}`, {
                data,
                timestamp: Date.now()
            });
        }
        catch (error) {
            console.error(`❌ Error setting cached data for ${key}:`, error);
        }
    }
    /**
     * Clear all cache
     */
    async clearCache() {
        try {
            // Get all cache keys
            const keys = await this.storage.keys();
            const cacheKeys = keys.filter(key => key.startsWith('cache.'));
            // Remove all cache entries
            for (const key of cacheKeys) {
                await this.storage.remove(key);
            }
            console.log(`🗑️ Cleared ${cacheKeys.length} cache entries`);
        }
        catch (error) {
            console.error('❌ Error clearing cache:', error);
        }
    }
    /**
     * Get cache statistics
     */
    async getCacheStats() {
        try {
            const keys = await this.storage.keys();
            const cacheKeys = keys.filter(key => key.startsWith('cache.'));
            let totalSize = 0;
            let oldestTimestamp = null;
            for (const key of cacheKeys) {
                const cached = await this.storage.get(key);
                if (cached) {
                    const size = JSON.stringify(cached.data).length;
                    totalSize += size;
                    if (!oldestTimestamp || cached.timestamp < oldestTimestamp) {
                        oldestTimestamp = cached.timestamp;
                    }
                }
            }
            return {
                entries: cacheKeys.length,
                totalSize,
                oldestEntry: oldestTimestamp
            };
        }
        catch (error) {
            console.error('❌ Error getting cache stats:', error);
            return { entries: 0, totalSize: 0, oldestEntry: null };
        }
    }
}
//# sourceMappingURL=notion.service.js.map