// packages/core-electron/src/services/notion.service.ts
import type { INotionAPI, NotionPage, NotionDatabase, NotionBlock, ICacheAdapter, HistoryEntry } from '@notion-clipper/core-shared';
import { parseContent } from '@notion-clipper/core-shared';
import type { ElectronHistoryService } from './history.service';

/**
 * Electron Notion Service
 * Node.js implementation with caching support
 */
export class ElectronNotionService {
  constructor(
    private api: INotionAPI,
    private cache?: ICacheAdapter,
    private historyService?: ElectronHistoryService
  ) { }

  /**
   * Set Notion API token
   */
  async setToken(token: string): Promise<void> {
    this.api.setToken(token);
    // Clear cache when token changes
    if (this.cache) {
      await this.cache.clear();
    }
  }

  /**
   * Test connection to Notion API
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.api.testConnection();
    } catch (error) {
      console.error('[NOTION] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all pages
   */
  async getPages(forceRefresh = false): Promise<NotionPage[]> {
    const cacheKey = 'notion:pages';

    if (!forceRefresh && this.cache) {
      const cached = await this.cache.get<NotionPage[]>(cacheKey);
      if (cached) {
        console.log('[NOTION] Returning cached pages');
        return cached;
      }
    }

    console.log('[NOTION] Fetching pages from API...');
    const pages = await this.api.searchPages();

    if (this.cache) {
      await this.cache.set(cacheKey, pages, 300000); // 5 minutes
    }

    return pages;
  }

  /**
   * Get all databases
   */
  async getDatabases(forceRefresh = false): Promise<NotionDatabase[]> {
    const cacheKey = 'notion:databases';

    if (!forceRefresh && this.cache) {
      const cached = await this.cache.get<NotionDatabase[]>(cacheKey);
      if (cached) {
        console.log('[NOTION] Returning cached databases');
        return cached;
      }
    }

    console.log('[NOTION] Fetching databases from API...');
    const databases = await this.api.searchDatabases();

    if (this.cache) {
      await this.cache.set(cacheKey, databases, 300000);
    }

    return databases;
  }

  /**
   * Search pages by query
   */
  async searchPages(query: string): Promise<NotionPage[]> {
    try {
      return await this.api.searchPages(query);
    } catch (error) {
      console.error('[NOTION] Search pages failed:', error);
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
      console.error('[NOTION] Search databases failed:', error);
      return [];
    }
  }

  /**
   * Get a specific page
   */
  async getPage(pageId: string): Promise<NotionPage> {
    const cacheKey = `page:${pageId}`;

    if (this.cache) {
      const cached = await this.cache.get<NotionPage>(cacheKey);
      if (cached) return cached;
    }

    const cleanPageId = pageId.replace(/-/g, '');
    const page = await this.api.getPage(cleanPageId);

    if (this.cache) {
      await this.cache.set(cacheKey, page, 300000);
    }

    return page;
  }

  /**
   * Get a specific database
   */
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    const cacheKey = `database:${databaseId}`;

    if (this.cache) {
      const cached = await this.cache.get<NotionDatabase>(cacheKey);
      if (cached) return cached;
    }

    const cleanDbId = databaseId.replace(/-/g, '');
    const database = await this.api.getDatabase(cleanDbId);

    if (this.cache) {
      await this.cache.set(cacheKey, database, 300000);
    }

    return database;
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
    const startTime = Date.now();
    let addedHistoryEntry: HistoryEntry | null = null;

    try {
      const cleanPageId = pageId.replace(/-/g, '');

      console.log(`[NOTION] Sending content to page ${pageId}...`);
      console.log(`[NOTION] 📝 Raw content:`, content);
      console.log(`[NOTION] 🏷️ Content type:`, options?.type);

      // Prepare and add history entry FIRST (before any potential failures)
      if (this.historyService) {
        // Get page info for history (with fallback)
        let page = null;
        try {
          page = await this.getPage(pageId);
        } catch (error) {
          console.warn(`[NOTION] Could not get page info for history: ${error}`);
        }

        const historyEntry: Omit<HistoryEntry, 'id'> = {
          timestamp: startTime,
          type: this.detectContentType(content),
          status: 'sending',
          content: {
            raw: typeof content === 'string' ? content : JSON.stringify(content),
            preview: this.getContentPreview(content),
            blocks: [],
            metadata: {
              source: 'clipboard'
            }
          },
          page: {
            id: pageId,
            title: page?.title || 'Page sans titre',
            icon: page?.icon?.emoji || '📄'
          },
          retryCount: 0
        };

        addedHistoryEntry = await this.historyService.add(historyEntry);
        console.log(`[NOTION] 📝 Added to history with ID: ${addedHistoryEntry.id}`);
      }

      // Convert content to Notion blocks
      const blocks = this.contentToBlocks(content, options?.type);

      console.log(`[NOTION] 🔄 Generated ${blocks.length} blocks`);
      if (blocks.length > 0) {
        console.log(`[NOTION] 📦 First block type:`, blocks[0].type);
      }

      if (blocks.length === 0) {
        console.error(`[NOTION] ❌ No blocks generated from content:`, content);

        // Update history as failed
        if (this.historyService && addedHistoryEntry) {
          await this.historyService.update(addedHistoryEntry.id, {
            status: 'failed',
            error: 'No valid content to send'
          });
        }

        return {
          success: false,
          error: 'No valid content to send'
        };
      }

      // Append blocks to page
      await this.api.appendBlocks(cleanPageId, blocks);

      console.log(`[NOTION] ✅ Content sent successfully (${blocks.length} blocks)`);

      // Update history as success
      if (this.historyService && addedHistoryEntry) {
        await this.historyService.update(addedHistoryEntry.id, {
          status: 'success',
          content: {
            ...addedHistoryEntry.content,
            blocks: blocks
          },
          sentAt: Date.now(),
          duration: Date.now() - startTime
        });
        console.log(`[NOTION] ✅ Updated history entry ${addedHistoryEntry.id} as success`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('[NOTION] ❌ Send content failed:', error);

      // Update history as failed
      if (this.historyService && addedHistoryEntry) {
        await this.historyService.update(addedHistoryEntry.id, {
          status: 'failed',
          error: error.message || 'Failed to send content',
          duration: Date.now() - startTime
        });
      }

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

        // Filter out invalid pageIds
        console.log(`[NOTION] 🔍 Original pageIds:`, data.pageIds);
        const validPageIds = data.pageIds.filter(pageId => pageId && typeof pageId === 'string');
        console.log(`[NOTION] ✅ Valid pageIds:`, validPageIds);

        if (validPageIds.length === 0) {
          console.error(`[NOTION] ❌ No valid pageIds found in:`, data.pageIds);
          return {
            success: false,
            error: 'No valid pageIds provided'
          };
        }

        if (validPageIds.length !== data.pageIds.length) {
          console.warn(`[NOTION] ⚠️ Filtered out ${data.pageIds.length - validPageIds.length} invalid pageIds`);
          console.warn(`[NOTION] ⚠️ Invalid pageIds:`, data.pageIds.filter(pageId => !pageId || typeof pageId !== 'string'));
        }

        const results = await Promise.allSettled(
          validPageIds.map(pageId =>
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

        console.log(`[NOTION] ✅ Content sent to ${successful}/${validPageIds.length} pages`);

        return {
          success: successful > 0,
          error: failed.length > 0 ? `${failed.length} pages failed` : undefined,
          results: results.map((r, i) => ({
            pageId: validPageIds[i],
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
   * Create a new page
   */
  async createPage(data: {
    parent: { page_id: string } | { database_id: string } | { data_source_id: string };
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
   * Update a page
   */
  async updatePage(pageId: string, data: {
    properties?: Record<string, any>;
  }): Promise<NotionPage> {
    try {
      const cleanPageId = pageId.replace(/-/g, '');
      return await this.api.updatePage(cleanPageId, data);
    } catch (error) {
      console.error('[NOTION] Error updating page:', error);
      throw error;
    }
  }

  /**
   * Append blocks to a page
   */
  async appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void> {
    try {
      if (!pageId) {
        throw new Error('PageId is required but was undefined or null');
      }

      const cleanPageId = pageId.replace(/-/g, '');
      console.log(`[NOTION] 🚀 Calling API appendBlocks with ${blocks.length} blocks`);
      console.log(`[NOTION] 📄 Page ID: ${cleanPageId}`);
      console.log(`[NOTION] 📦 First block:`, JSON.stringify(blocks[0], null, 2));

      // Debug spécial pour le bloc 8
      if (blocks.length > 8) {
        console.log(`[NOTION] 🚨 DEBUG BLOC 8:`, JSON.stringify(blocks[8], null, 2));
      }

      await this.api.appendBlocks(cleanPageId, blocks);
      console.log(`[NOTION] ✅ API call successful`);
    } catch (error) {
      console.error('[NOTION] ❌ Error appending blocks:', error);
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

    // Extraire le texte du contenu
    let textContent = '';

    if (typeof content === 'string') {
      textContent = content;
    } else if (content?.text) {
      textContent = content.text;
    } else if (content?.data) {
      textContent = content.data;
    } else if (content?.content) {
      textContent = content.content;
    } else {
      console.warn('[NOTION] Could not extract text from content:', content);
      return this.createFallbackBlock('');
    }

    // Utiliser le nouveau parser pour une détection intelligente
    try {
      const result = parseContent(textContent, {
        useModernParser: true
        // Note: All formatting options removed - parser handles everything automatically
      });

      if (result.success && result.blocks.length > 0) {
        console.log(`[NOTION] ✨ Parsed content: ${result.blocks.length} blocks (${result.metadata?.detectedType})`);
        return result.blocks;
      } else {
        console.warn('[NOTION] ⚠️ Parser returned no blocks - using fallback!');
        console.warn('[NOTION] Parse result details:', {
          success: result.success,
          blockCount: result.blocks.length,
          error: result.error,
          metadata: result.metadata
        });
        console.warn('[NOTION] Original content:', textContent.substring(0, 200) + '...');
        return this.createFallbackBlock(textContent);
      }
    } catch (error) {
      console.error('[NOTION] Parser error, using fallback:', error);
      return this.createFallbackBlock(textContent);
    }
  }

  /**
   * Create fallback block for simple text
   */
  private createFallbackBlock(text: string): NotionBlock[] {
    if (!text.trim()) {
      return [];
    }

    const lines = text.split('\n').filter(line => line.trim());
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

  /**
   * Detect content type for history
   */
  private detectContentType(content: any): 'text' | 'image' | 'file' | 'markdown' | 'html' | 'code' {
    if (!content) return 'text';

    if (typeof content === 'object') {
      if (content.type === 'image') return 'image';
      if (content.type === 'file') return 'file';
      return 'text';
    }

    const text = String(content);
    if (text.includes('```')) return 'code';
    if (text.includes('**') || text.includes('##') || text.includes('*')) return 'markdown';
    if (text.includes('<') && text.includes('>')) return 'html';

    return 'text';
  }

  /**
   * Get content preview for history
   */
  private getContentPreview(content: any): string {
    if (!content) return '';

    if (typeof content === 'object') {
      if (content.preview) return content.preview;
      if (content.text) return String(content.text).substring(0, 200);
      if (content.data) return `[${content.type || 'Data'}]`;
      return JSON.stringify(content).substring(0, 200);
    }

    return String(content).substring(0, 200);
  }
}