// packages/core-web/src/services/notion.service.ts
import type { INotionAPI, NotionPage, NotionDatabase } from '@notion-clipper/core-shared';

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
    async getPages(): Promise<NotionPage[]> {
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
    async getDatabases(): Promise<NotionDatabase[]> {
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
     * Send content to a Notion page
     */
    async sendToPage(
        pageId: string,
        content: string,
        options?: { type?: string }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // TODO: Implémenter l'envoi de contenu via l'API
            // Pour l'instant, méthode simplifiée
            const cleanPageId = pageId.replace(/-/g, '');

            const blocks = [{
                object: 'block' as const,
                type: 'paragraph' as const,
                paragraph: {
                    rich_text: [{
                        type: 'text' as const,
                        text: { content }
                    }]
                }
            }];

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
}