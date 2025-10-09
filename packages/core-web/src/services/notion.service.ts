// packages/core-web/src/services/notion.service.ts
import type { INotionAPI, NotionPage, NotionDatabase, NotionBlock } from '@notion-clipper/core-shared';

/**
 * Web Notion Service
 * Browser-only implementation using fetch API
 */
export class WebNotionService {
    constructor(private api: INotionAPI) { }

    /**
     * Set Notion API token
     */
    setToken(token: string): void {
        this.api.setToken(token);
    }

    /**
     * Test connection to Notion API
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const isValid = await this.api.testConnection();
            return { success: isValid };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Connection failed'
            };
        }
    }

    /**
     * Get all pages
     */
    async getPages(forceRefresh = false): Promise<NotionPage[]> {
        try {
            return await this.api.searchPages();
        } catch (error) {
            console.error('[NOTION] Error getting pages:', error);
            return [];
        }
    }

    /**
     * Get all databases
     */
    async getDatabases(forceRefresh = false): Promise<NotionDatabase[]> {
        try {
            return await this.api.searchDatabases();
        } catch (error) {
            console.error('[NOTION] Error getting databases:', error);
            return [];
        }
    }

    /**
     * Search pages by query
     */
    async searchPages(query: string): Promise<NotionPage[]> {
        try {
            return await this.api.searchPages(query);
        } catch (error) {
            console.error('[NOTION] Error searching pages:', error);
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
            console.error('[NOTION] Error searching databases:', error);
            return [];
        }
    }

    /**
     * Get a specific page
     */
    async getPage(pageId: string): Promise<NotionPage> {
        try {
            const cleanPageId = pageId.replace(/-/g, '');
            return await this.api.getPage(cleanPageId);
        } catch (error) {
            console.error('[NOTION] Error getting page:', error);
            throw error;
        }
    }

    /**
     * Get a specific database
     */
    async getDatabase(databaseId: string): Promise<NotionDatabase> {
        try {
            const cleanDbId = databaseId.replace(/-/g, '');
            return await this.api.getDatabase(cleanDbId);
        } catch (error) {
            console.error('[NOTION] Error getting database:', error);
            throw error;
        }
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
            
            // Convert content to Notion blocks
            const blocks = this.contentToBlocks(content, options?.type);
            
            // Append blocks to page
            await this.api.appendBlocks(cleanPageId, blocks);
            
            return { success: true };
        } catch (error: any) {
            console.error('[NOTION] Error sending content:', error);
            return {
                success: false,
                error: error.message || 'Failed to send content'
            };
        }
    }

    /**
     * ✅ NOUVELLE MÉTHODE : Send content to Notion (single or multiple pages)
     * Unified method for both single and multi-page sending
     */
    async sendToNotion(data: {
        pageId?: string;
        pageIds?: string[];
        content: any;
        options?: { type?: string; asChild?: boolean };
    }): Promise<{ success: boolean; error?: string; results?: any[] }> {
        try {
            // Single page mode
            if (data.pageId && !data.pageIds) {
                console.log(`[NOTION] sendToNotion - Single page mode`);
                return await this.sendContent(data.pageId, data.content, data.options);
            }
            
            // Multiple pages mode
            if (data.pageIds && data.pageIds.length > 0) {
                console.log(`[NOTION] sendToNotion - Multi-page mode: ${data.pageIds.length} pages`);
                
                const results = await Promise.allSettled(
                    data.pageIds.map(pageId => 
                        this.sendContent(pageId, data.content, data.options)
                    )
                );
                
                const successful = results.filter(
                    r => r.status === 'fulfilled' && r.value.success
                ).length;
                
                const failed = results.filter(
                    r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
                );
                
                if (failed.length > 0) {
                    console.warn(`[NOTION] ⚠️ ${failed.length}/${data.pageIds.length} pages failed`);
                }
                
                console.log(`[NOTION] ✅ Content sent to ${successful}/${data.pageIds.length} pages`);
                
                return { 
                    success: successful > 0,
                    error: failed.length > 0 ? `${failed.length} pages failed` : undefined,
                    results: results.map((r, i) => ({
                        pageId: data.pageIds![i],
                        success: r.status === 'fulfilled' && r.value.success,
                        error: r.status === 'rejected' 
                            ? r.reason 
                            : (r.status === 'fulfilled' && r.value.error) || undefined
                    }))
                };
            }
            
            return {
                success: false,
                error: 'No pageId or pageIds provided'
            };
        } catch (error: any) {
            console.error('[NOTION] ❌ sendToNotion failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to send content'
            };
        }
    }

    /**
     * Send content to a Notion page (alias)
     */
    async sendToPage(
        pageId: string,
        content: string,
        options?: { type?: string }
    ): Promise<{ success: boolean; error?: string }> {
        return this.sendContent(pageId, content, options);
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

        // Fallback
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