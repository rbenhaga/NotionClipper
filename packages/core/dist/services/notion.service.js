import { contentDetector, notionMarkdownParser } from '../index';
/**
 * Core Notion Service with platform-agnostic business logic
 * Uses dependency injection for platform-specific implementations
 */
export class NotionService {
    constructor(notionAPI, storage) {
        this.cache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        this.notionAPI = notionAPI;
        this.storage = storage;
    }
    /**
     * Set Notion API token
     */
    async setToken(token) {
        this.notionAPI.setToken(token);
        await this.storage.set('notion_token', token);
        this.cache.clear();
    }
    /**
     * Test Notion API connection
     */
    async testConnection() {
        try {
            return await this.notionAPI.testConnection();
        }
        catch (error) {
            console.error('❌ Connection test failed:', error);
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
            console.error('❌ Error fetching pages:', error);
            return [];
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
            console.error('❌ Error fetching databases:', error);
            return [];
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
     * SUPPORT: Database properties + content blocks
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
            // ✅ NOUVEAU: Récupérer les propriétés de database à mettre à jour
            const databaseProperties = options.properties || options.databaseProperties || {};
            const hasDatabaseProperties = Object.keys(databaseProperties).length > 0;
            // Send to all target pages
            const results = [];
            for (const targetPageId of targetPages) {
                try {
                    // ✅ NOUVEAU: Si des propriétés de database sont fournies
                    if (hasDatabaseProperties) {
                        console.log(`📊 Mise à jour des propriétés pour ${targetPageId}`);
                        // Récupérer les infos de la page pour vérifier si c'est une page de database
                        const pageInfo = await this.notionAPI.getPage(targetPageId);
                        // Si la page a un parent database_id, on peut mettre à jour les propriétés
                        if (pageInfo.parent.type === 'database_id') {
                            console.log('✅ Page de database détectée, mise à jour des propriétés...');
                            // Récupérer le schéma de la database
                            const databaseId = pageInfo.parent.database_id;
                            const databaseInfo = await this.notionAPI.getDatabase(databaseId);
                            // Formater les propriétés selon le schéma
                            const formattedProperties = this.formatDatabaseProperties(databaseProperties, databaseInfo.properties);
                            if (Object.keys(formattedProperties).length > 0) {
                                // Mettre à jour les propriétés
                                await this.notionAPI.updatePage(targetPageId, {
                                    properties: formattedProperties
                                });
                                console.log(`✅ ${Object.keys(formattedProperties).length} propriété(s) mise(s) à jour`);
                            }
                        }
                        else {
                            console.warn('⚠️ Page non liée à une database, propriétés ignorées');
                        }
                    }
                    // Ajouter les blocs de contenu (comme avant)
                    await this.notionAPI.appendBlocks(targetPageId, blocks);
                    results.push({ pageId: targetPageId, success: true });
                }
                catch (error) {
                    console.error(`❌ Error sending to page ${targetPageId}:`, error);
                    results.push({
                        pageId: targetPageId,
                        success: false,
                        error: error?.message || 'Unknown error'
                    });
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
     * ✅ NOUVELLE MÉTHODE: Format database properties according to schema
     */
    formatDatabaseProperties(properties, databaseSchema) {
        const formatted = {};
        for (const [key, value] of Object.entries(properties)) {
            // Ignorer les propriétés vides ou titre
            if (value === null || value === undefined || value === '' || key === 'title') {
                continue;
            }
            const propSchema = databaseSchema[key];
            if (!propSchema) {
                console.warn(`⚠️ Propriété "${key}" non trouvée dans le schéma`);
                continue;
            }
            try {
                switch (propSchema.type) {
                    case 'rich_text':
                        formatted[key] = {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: { content: String(value) }
                                }
                            ]
                        };
                        break;
                    case 'number':
                        const num = Number(value);
                        formatted[key] = {
                            number: isNaN(num) ? null : num
                        };
                        break;
                    case 'select':
                        // Valider que l'option existe
                        if (propSchema.select?.options) {
                            const validOption = propSchema.select.options.find((opt) => opt.name.toLowerCase() === String(value).toLowerCase());
                            if (validOption) {
                                formatted[key] = {
                                    select: { name: validOption.name }
                                };
                            }
                            else {
                                console.warn(`⚠️ Option "${value}" non trouvée pour ${key}`);
                            }
                        }
                        else {
                            formatted[key] = {
                                select: { name: String(value) }
                            };
                        }
                        break;
                    case 'multi_select':
                        const values = Array.isArray(value)
                            ? value
                            : String(value).split(',').map(v => v.trim()).filter(v => v);
                        const multiSelectOptions = [];
                        for (const val of values) {
                            if (propSchema.multi_select?.options) {
                                const validOption = propSchema.multi_select.options.find((opt) => opt.name.toLowerCase() === val.toLowerCase());
                                multiSelectOptions.push({
                                    name: validOption ? validOption.name : val
                                });
                            }
                            else {
                                multiSelectOptions.push({ name: val });
                            }
                        }
                        formatted[key] = {
                            multi_select: multiSelectOptions
                        };
                        break;
                    case 'checkbox':
                        formatted[key] = {
                            checkbox: Boolean(value)
                        };
                        break;
                    case 'date':
                        if (value === '' || value === null) {
                            formatted[key] = { date: null };
                        }
                        else {
                            formatted[key] = {
                                date: {
                                    start: String(value),
                                    end: null
                                }
                            };
                        }
                        break;
                    case 'url':
                        formatted[key] = {
                            url: value === '' || value === null ? null : String(value)
                        };
                        break;
                    case 'email':
                        formatted[key] = {
                            email: value === '' || value === null ? null : String(value)
                        };
                        break;
                    case 'phone_number':
                        formatted[key] = {
                            phone_number: value === '' || value === null ? null : String(value)
                        };
                        break;
                    case 'status':
                        // Valider que le status existe
                        if (propSchema.status?.options) {
                            const validStatus = propSchema.status.options.find((opt) => opt.name.toLowerCase() === String(value).toLowerCase());
                            if (validStatus) {
                                formatted[key] = {
                                    status: { name: validStatus.name }
                                };
                            }
                            else {
                                console.warn(`⚠️ Status "${value}" non trouvé pour ${key}`);
                            }
                        }
                        else {
                            formatted[key] = {
                                status: { name: String(value) }
                            };
                        }
                        break;
                    default:
                        console.warn(`⚠️ Type de propriété non supporté: ${propSchema.type}`);
                }
            }
            catch (error) {
                console.error(`❌ Erreur formatage propriété ${key}:`, error);
            }
        }
        return formatted;
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
            const fallbackContent = typeof content === 'string'
                ? content.substring(0, 2000)
                : '[Unsupported content]';
            return [{
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{
                                type: 'text',
                                text: { content: fallbackContent }
                            }]
                    }
                }];
        }
    }
    /**
     * Get cached data with TTL check
     */
    async getCachedData(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        const now = Date.now();
        if (now - cached.timestamp > this.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }
    /**
     * Set cached data with timestamp
     */
    async setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    /**
     * Clear all cache
     */
    async clearCache() {
        this.cache.clear();
        console.log('✅ Cache cleared');
    }
    /**
     * Get cache statistics
     */
    async getCacheStats() {
        const entries = this.cache.size;
        let totalSize = 0;
        let oldestEntry = null;
        for (const [, value] of this.cache.entries()) {
            totalSize += JSON.stringify(value.data).length;
            if (!oldestEntry || value.timestamp < oldestEntry) {
                oldestEntry = value.timestamp;
            }
        }
        return {
            entries,
            totalSize,
            oldestEntry
        };
    }
}
