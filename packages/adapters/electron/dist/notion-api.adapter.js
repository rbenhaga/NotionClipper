import { Client } from '@notionhq/client';
/**
 * Electron Notion API Adapter
 * Implements INotionAPI interface using the official Notion SDK
 */
export class ElectronNotionAPIAdapter {
    client = null;
    token = null;
    constructor(token) {
        if (token) {
            this.setToken(token);
        }
    }
    /**
     * Set Notion API token
     */
    setToken(token) {
        this.token = token;
        this.client = new Client({
            auth: token,
            notionVersion: '2022-06-28' // Stable version from memory
        });
    }
    /**
     * Test API connection
     */
    async testConnection() {
        try {
            if (!this.client) {
                throw new Error('Notion client not initialized');
            }
            // Try to get current user
            await this.client.users.me({});
            return true;
        }
        catch (error) {
            console.error('❌ Notion API connection test failed:', error);
            return false;
        }
    }
    /**
     * Search for pages and databases
     */
    async search(query) {
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
        }
        catch (error) {
            console.error('❌ Error searching Notion:', error);
            throw error;
        }
    }
    /**
     * Get all pages
     */
    async getPages() {
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
        }
        catch (error) {
            console.error('❌ Error getting pages:', error);
            throw error;
        }
    }
    /**
     * Get all databases
     */
    async getDatabases() {
        try {
            if (!this.client) {
                throw new Error('Notion client not initialized');
            }
            const response = await this.client.search({
                filter: {
                    property: 'object',
                    value: 'database'
                },
                sort: {
                    direction: 'descending',
                    timestamp: 'last_edited_time'
                }
            });
            return response.results
                .filter(item => item.object === 'database')
                .map(item => this.formatDatabase(item));
        }
        catch (error) {
            console.error('❌ Error getting databases:', error);
            throw error;
        }
    }
    /**
     * Get page by ID
     */
    async getPage(pageId) {
        try {
            if (!this.client) {
                throw new Error('Notion client not initialized');
            }
            const response = await this.client.pages.retrieve({ page_id: pageId });
            return this.formatPage(response);
        }
        catch (error) {
            console.error(`❌ Error getting page ${pageId}:`, error);
            throw error;
        }
    }
    /**
     * Get database by ID
     */
    async getDatabase(databaseId) {
        try {
            if (!this.client) {
                throw new Error('Notion client not initialized');
            }
            const response = await this.client.databases.retrieve({ database_id: databaseId });
            return this.formatDatabase(response);
        }
        catch (error) {
            console.error(`❌ Error getting database ${databaseId}:`, error);
            throw error;
        }
    }
    /**
     * Create a new page
     */
    async createPage(data) {
        try {
            if (!this.client) {
                throw new Error('Notion client not initialized');
            }
            const response = await this.client.pages.create({
                parent: data.parent,
                properties: data.properties,
                children: data.children || []
            });
            return this.formatPage(response);
        }
        catch (error) {
            console.error('❌ Error creating page:', error);
            throw error;
        }
    }
    /**
     * Update a page
     */
    async updatePage(pageId, data) {
        try {
            if (!this.client) {
                throw new Error('Notion client not initialized');
            }
            const response = await this.client.pages.update({
                page_id: pageId,
                properties: data.properties || {}
            });
            return this.formatPage(response);
        }
        catch (error) {
            console.error(`❌ Error updating page ${pageId}:`, error);
            throw error;
        }
    }
    /**
     * Append blocks to a page
     */
    async appendBlocks(pageId, blocks) {
        try {
            if (!this.client) {
                throw new Error('Notion client not initialized');
            }
            // Split blocks into chunks of 100 (Notion API limit)
            const chunks = this.chunkArray(blocks, 100);
            for (const chunk of chunks) {
                await this.client.blocks.children.append({
                    block_id: pageId,
                    children: chunk
                });
            }
        }
        catch (error) {
            console.error(`❌ Error appending blocks to page ${pageId}:`, error);
            throw error;
        }
    }
    /**
     * Upload file to Notion
     */
    async uploadFile(file, filename) {
        try {
            if (!this.client) {
                throw new Error('Notion client not initialized');
            }
            // First, get upload URL
            const uploadResponse = await this.client.request({
                path: 'files',
                method: 'POST',
                body: {
                    name: filename,
                    type: 'file'
                }
            });
            const { upload_url, id } = uploadResponse;
            // Upload file to the URL (without conflicting headers from memory)
            const response = await fetch(upload_url, {
                method: 'PUT',
                body: file // Just the buffer, fetch handles headers automatically
            });
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
            return id;
        }
        catch (error) {
            console.error('❌ Error uploading file to Notion:', error);
            throw error;
        }
    }
    /**
     * Format page or database response
     */
    formatPageOrDatabase(item) {
        if (item.object === 'database') {
            return this.formatDatabase(item);
        }
        else {
            return this.formatPage(item);
        }
    }
    /**
     * Format page response
     */
    formatPage(page) {
        return {
            id: page.id,
            title: this.extractTitle(page.properties),
            url: page.url,
            icon: page.icon,
            cover: page.cover,
            parent: page.parent,
            properties: page.properties,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
            archived: page.archived,
            in_trash: page.in_trash || false
        };
    }
    /**
     * Format database response
     */
    formatDatabase(database) {
        return {
            id: database.id,
            title: this.extractTitle(database.title),
            description: database.description,
            icon: database.icon,
            cover: database.cover,
            properties: database.properties,
            parent: database.parent,
            url: database.url,
            created_time: database.created_time,
            last_edited_time: database.last_edited_time,
            archived: database.archived,
            in_trash: database.in_trash || false
        };
    }
    /**
     * Extract title from properties or title array
     */
    extractTitle(properties) {
        if (Array.isArray(properties)) {
            // Database title format
            return properties.map(item => item.plain_text).join('');
        }
        // Page properties format
        for (const [key, value] of Object.entries(properties)) {
            const prop = value;
            if (prop.type === 'title' && prop.title) {
                return prop.title.map((item) => item.plain_text).join('');
            }
        }
        return 'Untitled';
    }
    /**
     * Split array into chunks
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
//# sourceMappingURL=notion-api.adapter.js.map