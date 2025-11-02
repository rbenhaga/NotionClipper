// packages/core-electron/src/services/notion.service.ts
import type { INotionAPI, NotionPage, NotionDatabase, NotionBlock, ICacheAdapter, HistoryEntry } from '@notion-clipper/core-shared';
import { parseContent } from '@notion-clipper/core-shared';
import type { ElectronHistoryService } from './history.service';

/**
 * Electron Notion Service
 * Node.js implementation with caching support
 */
export class ElectronNotionService {
  private suggestionService?: any; // Service de suggestions optionnel

  constructor(
    private api: INotionAPI,
    private cache?: ICacheAdapter,
    private historyService?: ElectronHistoryService
  ) { }

  /**
   * Définir le service de suggestions (injection de dépendance)
   */
  setSuggestionService(suggestionService: any): void {
    this.suggestionService = suggestionService;
  }

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
   * Vérifier si le token actuel est valide
   */
  async isTokenValid(): Promise<boolean> {
    try {
      return await this.api.testConnection();
    } catch (error) {
      console.error('[NOTION] Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Obtenir des informations sur l'état de l'authentification
   */
  async getAuthStatus(): Promise<{
    isValid: boolean;
    needsReauth: boolean;
    error?: string;
  }> {
    try {
      const isValid = await this.isTokenValid();

      if (!isValid) {
        return {
          isValid: false,
          needsReauth: true,
          error: 'Token invalide ou expiré - OAuth requis'
        };
      }

      return {
        isValid: true,
        needsReauth: false
      };
    } catch (error: any) {
      return {
        isValid: false,
        needsReauth: true,
        error: error.message || 'Erreur de vérification du token'
      };
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
   * Get all pages (legacy method for compatibility)
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

    try {
      console.log('[NOTION] Fetching pages from API...');
      const pages = await this.api.searchPages();

      if (this.cache) {
        await this.cache.set(cacheKey, pages, 300000); // 5 minutes
      }

      return pages;
    } catch (error: any) {
      console.error('[NOTION] ❌ Error fetching pages:', error);

      // Vérifier si c'est une erreur d'autorisation
      if (error.code === 'unauthorized' || error.status === 401) {
        console.error('[NOTION] 🔑 Token invalide ou expiré');
        console.error('[NOTION] 💡 Solution: Refaire le processus OAuth dans les paramètres');

        // Retourner un tableau vide plutôt que de lancer l'erreur
        // L'UI peut afficher un message d'erreur approprié
        return [];
      }

      // Pour les autres erreurs, retourner un tableau vide aussi
      return [];
    }
  }

  /**
   * ✅ NOUVEAU: Get pages with pagination support for infinite scroll
   */
  async getPagesWithPagination(options: {
    cursor?: string;
    pageSize?: number;
  } = {}): Promise<{
    pages: NotionPage[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      console.log('[NOTION] Getting pages with pagination:', options);

      // Vérifier si l'adapter supporte la pagination directe
      if ('getPagesWithPagination' in this.api && typeof (this.api as any).getPagesWithPagination === 'function') {
        return await (this.api as any).getPagesWithPagination(options);
      }

      // Utiliser searchPagesPaginated si disponible
      if ('searchPagesPaginated' in this.api && typeof (this.api as any).searchPagesPaginated === 'function') {
        const result = await (this.api as any).searchPagesPaginated({
          cursor: options.cursor,
          pageSize: options.pageSize || 50
        });

        return {
          pages: result.pages,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor
        };
      }

      // Fallback: utiliser la méthode classique
      console.warn('[NOTION] Adapter does not support pagination, using fallback');
      const pages = await this.api.searchPages();

      return {
        pages: pages.slice(0, options.pageSize || 50),
        hasMore: false,
        nextCursor: undefined
      };
    } catch (error: any) {
      console.error('[NOTION] ❌ Error fetching pages with pagination:', error);

      if (error.code === 'unauthorized' || error.status === 401) {
        console.error('[NOTION] 🔑 Token invalide ou expiré');
        return { pages: [], hasMore: false };
      }

      return { pages: [], hasMore: false };
    }
  }

  /**
   * ✅ NOUVEAU: Get recent pages with pagination (optimized)
   */
  async getRecentPagesWithPagination(options: {
    cursor?: string;
    limit?: number;
  } = {}): Promise<{
    pages: NotionPage[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      console.log('[NOTION] Getting recent pages with pagination:', options);

      // Vérifier si l'adapter supporte la méthode récente
      if ('getRecentPagesWithPagination' in this.api && typeof (this.api as any).getRecentPagesWithPagination === 'function') {
        return await (this.api as any).getRecentPagesWithPagination(options);
      }

      // Fallback: utiliser getPagesWithPagination avec limite réduite
      console.warn('[NOTION] Adapter does not support recent pages method, using fallback');
      return await this.getPagesWithPagination({
        cursor: options.cursor,
        pageSize: options.limit || 20
      });
    } catch (error: any) {
      console.error('[NOTION] ❌ Error fetching recent pages:', error);

      if (error.code === 'unauthorized' || error.status === 401) {
        console.error('[NOTION] 🔑 Token invalide ou expiré');
        return { pages: [], hasMore: false };
      }

      return { pages: [], hasMore: false };
    }
  }

  /**
   * ✅ NOUVEAU: Get pages for specific tab with optimized strategies
   */
  async getPagesForTab(
    tab: 'all' | 'recent' | 'favorites' | 'suggested',
    options: {
      forceRefresh?: boolean;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{
    pages: NotionPage[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const { forceRefresh = false, limit, cursor } = options;
    const cacheKey = `notion:pages:${tab}`;

    // Check cache first (sauf si forceRefresh)
    if (!forceRefresh && this.cache) {
      const cached = await this.cache.get<{
        pages: NotionPage[];
        hasMore: boolean;
        nextCursor?: string;
        timestamp: number;
      }>(cacheKey);

      if (cached) {
        const cacheAge = Date.now() - cached.timestamp;
        const maxAge = tab === 'recent' || tab === 'suggested' ? 120000 : 300000; // 2min vs 5min

        if (cacheAge < maxAge) {
          console.log(`[NOTION] ✅ Using cached pages for tab: ${tab}`);
          return {
            pages: cached.pages,
            hasMore: cached.hasMore,
            nextCursor: cached.nextCursor
          };
        }
      }
    }

    let result: { pages: NotionPage[]; hasMore: boolean; nextCursor?: string };
    let cacheTTL = 300000; // 5 min par défaut

    try {
      switch (tab) {
        case 'recent':
          console.log('[NOTION] Fetching recent pages (optimized)...');
          result = await this.getRecentPagesWithPagination({
            cursor,
            limit: limit || 20
          });
          cacheTTL = 120000; // 2 min (changent souvent)
          break;

        case 'favorites':
          console.log('[NOTION] Fetching favorite pages...');
          result = await this.getFavoritePages();
          cacheTTL = 300000; // 5 min
          break;

        case 'suggested':
          console.log('[NOTION] Fetching suggested pages...');
          // Utiliser le service de suggestions si disponible
          if (this.suggestionService) {
            try {
              const allPages = await this.getPages(false);
              const suggestionResult = await this.suggestionService.getSuggestions({
                text: '', // Pas de texte spécifique, on veut les suggestions générales
                maxSuggestions: limit || 10,
                includeContent: false
              });
              
              // Convertir les suggestions en format de pages
              const suggestedPages = suggestionResult.suggestions.map((s: any) => 
                allPages.find((p: any) => p.id === s.pageId)
              ).filter(Boolean);
              
              result = {
                pages: suggestedPages,
                hasMore: false, // Les suggestions sont limitées
                nextCursor: undefined
              };
            } catch (error) {
              console.warn('[NOTION] Suggestion service failed, falling back to recent pages:', error);
              result = await this.getRecentPagesWithPagination({
                cursor,
                limit: limit || 10
              });
              result.hasMore = false;
              result.nextCursor = undefined;
            }
          } else {
            // Fallback vers les pages récentes
            result = await this.getRecentPagesWithPagination({
              cursor,
              limit: limit || 10
            });
            result.hasMore = false;
            result.nextCursor = undefined;
          }
          cacheTTL = 120000; // 2 min
          break;

        case 'all':
        default:
          console.log('[NOTION] Fetching all pages...');
          result = await this.getPagesWithPagination({
            cursor,
            pageSize: limit || 50
          });
          cacheTTL = 600000; // 10 min
          break;
      }

      // Mettre en cache avec timestamp
      if (this.cache) {
        await this.cache.set(cacheKey, {
          ...result,
          timestamp: Date.now()
        }, cacheTTL);
      }

      console.log(`[NOTION] ✅ Loaded ${result.pages.length} pages for tab: ${tab}`);
      return result;

    } catch (error: any) {
      console.error(`[NOTION] ❌ Error fetching pages for tab ${tab}:`, error);
      return { pages: [], hasMore: false };
    }
  }

  /**
   * ✅ HELPER: Get favorite pages
   */
  private async getFavoritePages(): Promise<{
    pages: NotionPage[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      // TODO: Récupérer les IDs des favoris depuis la config
      // Pour l'instant, retourner un tableau vide car pas d'accès direct à la config
      const favoriteIds: string[] = [];

      if (favoriteIds.length === 0) {
        console.log('[NOTION] No favorite pages found');
        return { pages: [], hasMore: false };
      }

      console.log(`[NOTION] Loading ${favoriteIds.length} favorite pages...`);

      // Charger les pages par IDs
      const pages = await this.getPagesByIds(favoriteIds);

      return {
        pages,
        hasMore: false, // Pas de pagination pour favoris
        nextCursor: undefined
      };
    } catch (error) {
      console.error('[NOTION] Error getting favorite pages:', error);
      return { pages: [], hasMore: false };
    }
  }

  /**
   * ✅ HELPER: Get multiple pages by IDs
   */
  private async getPagesByIds(pageIds: string[]): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];

    // Charger en parallèle (max 5 à la fois pour ne pas surcharger l'API)
    const batchSize = 5;
    for (let i = 0; i < pageIds.length; i += batchSize) {
      const batch = pageIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(id => this.getPage(id))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          pages.push(result.value);
        } else {
          console.warn('[NOTION] Failed to load page:', result.reason);
        }
      }
    }

    return pages;
  }

  /**
   * 🆕 Get pages progressively with pagination
   * Returns a batch of pages for improved UX during loading
   */
  async getPagesBatch(options: {
    limit?: number;
    forceRefresh?: boolean;
    onProgress?: (loaded: number, total: number) => void;
  } = {}): Promise<NotionPage[]> {
    const { limit = 20, forceRefresh = false, onProgress } = options;
    const cacheKey = 'notion:pages';
    const progressCacheKey = 'notion:pages:loading';

    // Check if we're already loading pages
    if (!forceRefresh && this.cache) {
      const isLoading = await this.cache.get<boolean>(progressCacheKey);
      if (isLoading) {
        console.log('[NOTION] Pages are already being loaded, waiting...');
        // Return cached pages if available
        const cached = await this.cache.get<NotionPage[]>(cacheKey);
        if (cached) return cached.slice(0, limit);
      }
    }

    try {
      // Mark as loading
      if (this.cache) {
        await this.cache.set(progressCacheKey, true, 60000); // 1 minute TTL
      }

      console.log(`[NOTION] 📥 Fetching first ${limit} pages...`);
      const startTime = Date.now();

      // Fetch all pages (Notion API doesn't support pagination in search)
      const allPages = await this.api.searchPages();
      const duration = Date.now() - startTime;

      console.log(`[NOTION] ✅ Fetched ${allPages.length} pages in ${duration}ms`);

      // Update progress
      if (onProgress) {
        onProgress(allPages.length, allPages.length);
      }

      // Cache all pages
      if (this.cache) {
        await this.cache.set(cacheKey, allPages, 300000); // 5 minutes
        await this.cache.delete(progressCacheKey); // Clear loading flag
      }

      // Return first batch immediately
      const batch = allPages.slice(0, limit);
      console.log(`[NOTION] 🎯 Returning first ${batch.length} pages`);

      return allPages; // Return all for now since Notion API doesn't paginate
    } catch (error) {
      if (this.cache) {
        await this.cache.delete(progressCacheKey);
      }
      throw error;
    }
  }

  /**
   * 🆕 Get pages count (fast)
   */
  async getPagesCount(): Promise<number> {
    const cached = this.cache ? await this.cache.get<NotionPage[]>('notion:pages') : null;
    if (cached) {
      return cached.length;
    }

    // If not cached, fetch all pages
    const pages = await this.getPages();
    return pages.length;
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

    try {
      console.log('[NOTION] Fetching databases from API...');
      const databases = await this.api.searchDatabases();

      if (this.cache) {
        await this.cache.set(cacheKey, databases, 300000);
      }

      return databases;
    } catch (error: any) {
      console.error('[NOTION] ❌ Error fetching databases:', error);

      // Vérifier si c'est une erreur d'autorisation
      if (error.code === 'unauthorized' || error.status === 401) {
        console.error('[NOTION] 🔑 Token invalide ou expiré');
        console.error('[NOTION] 💡 Solution: Refaire le processus OAuth dans les paramètres');

        // Retourner un tableau vide plutôt que de lancer l'erreur
        return [];
      }

      // Pour les autres erreurs, retourner un tableau vide aussi
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
    options?: { type?: string; asChild?: boolean; afterBlockId?: string }
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
      const blocks = await this.contentToBlocks(content, options?.type);

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

      // Append blocks to page (ou après un bloc spécifique)
      await this.appendBlocks(cleanPageId, blocks, options?.afterBlockId);

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
    options?: { type?: string; asChild?: boolean; afterBlockId?: string };
  }): Promise<{ success: boolean; error?: string; results?: any[] }> {
    try {
      // Single page mode
      if (data.pageId && !data.pageIds) {
        console.log(`[NOTION] sendToNotion - Single page mode`);
        if (data.options?.afterBlockId) {
          console.log(`[NOTION] 📍 Inserting after block: ${data.options.afterBlockId}`);
        }
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
   * ✅ CORRECTION: Append blocks to a page or after a specific block
   * @param pageId - The page ID to append to
   * @param blocks - The blocks to append
   * @param afterBlockId - Optional: Insert after this specific block ID
   */
  async appendBlocks(pageId: string, blocks: NotionBlock[], afterBlockId?: string): Promise<void> {
    try {
      if (!pageId) {
        throw new Error('PageId is required but was undefined or null');
      }

      const cleanPageId = pageId.replace(/-/g, '');

      // 🔄 CHUNKING: Diviser les blocs en groupes de 100 maximum (limite API Notion)
      const CHUNK_SIZE = 100;
      const chunks = [];
      
      for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
        chunks.push(blocks.slice(i, i + CHUNK_SIZE));
      }

      console.log(`[NOTION] 📦 Dividing ${blocks.length} blocks into ${chunks.length} chunks of max ${CHUNK_SIZE} blocks`);

      // ✅ CORRECTION: Si afterBlockId est fourni, utiliser l'API PATCH /blocks/{block_id}/children
      if (afterBlockId) {
        const cleanBlockId = afterBlockId.replace(/-/g, '');
        console.log(`[NOTION] 📍 Appending ${blocks.length} blocks AFTER block ${cleanBlockId}`);

        // Envoyer les chunks séquentiellement
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`[NOTION] 📦 Sending chunk ${i + 1}/${chunks.length} (${chunk.length} blocks)`);
          
          // Pour le premier chunk, utiliser le blockId original
          // Pour les suivants, on ajoute à la fin de la page car on ne peut pas chaîner les afterBlockId
          if (i === 0) {
            await this.api.appendBlocksAfter(cleanBlockId, chunk);
          } else {
            await this.api.appendBlocks(cleanPageId, chunk);
          }
        }
        
        console.log(`[NOTION] ✅ Successfully appended all ${blocks.length} blocks after ${cleanBlockId}`);
      } else {
        // Mode par défaut: ajouter à la fin de la page
        console.log(`[NOTION] 📍 Appending ${blocks.length} blocks to END of page ${cleanPageId}`);
        
        // Envoyer les chunks séquentiellement
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`[NOTION] 📦 Sending chunk ${i + 1}/${chunks.length} (${chunk.length} blocks)`);
          await this.api.appendBlocks(cleanPageId, chunk);
        }
        
        console.log(`[NOTION] ✅ Successfully appended all ${blocks.length} blocks to page ${cleanPageId}`);
      }
    } catch (error: any) {
      console.error('[NOTION] ❌ Error appending blocks:', error);
      
      // Améliorer la gestion des erreurs réseau
      if (error.message?.includes('NETWORK_OFFLINE') || 
          error.message?.includes('ENOTFOUND') ||
          error.message?.includes('fetch failed') ||
          error.code === 'ENOTFOUND') {
        throw new Error('NETWORK_ERROR: Impossible de se connecter à Notion. Vérifiez votre connexion internet.');
      }
      
      throw error;
    }
  }

  /**
   * Get page blocks
   */
  async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    try {
      const cleanPageId = pageId.replace(/-/g, '');
      return await this.api.getPageBlocks(cleanPageId);
    } catch (error) {
      console.error('[NOTION] Error getting page blocks:', error);
      throw error;
    }
  }

  /**
   * Helper: Convert content to Notion blocks
   */
  private async contentToBlocks(content: any, _type?: string): Promise<NotionBlock[]> {
    // Si c'est déjà un tableau de blocs
    if (Array.isArray(content)) {
      return content;
    }

    // ✅ CORRECTION: Gérer les images et fichiers spécialement
    if (content?.type === 'image' && (content?.data || content?.content)) {
      console.log('[NOTION] 📸 Processing image content');
      return await this.createImageBlock(content);
    }

    if (content?.type === 'file' && (content?.data || content?.content)) {
      console.log('[NOTION] 📎 Processing file content');
      return await this.createFileBlock(content);
    }

    // Extraire le texte du contenu
    let textContent = '';

    if (typeof content === 'string') {
      textContent = content;
    } else if (content?.text && typeof content.text === 'string') {
      textContent = content.text;
    } else if (content?.data && typeof content.data === 'string') {
      // ✅ CORRECTION: Vérifier que data est une string avant de l'utiliser
      textContent = content.data;
    } else if (content?.content && typeof content.content === 'string') {
      // ✅ CORRECTION: Vérifier que content est une string avant de l'utiliser
      textContent = content.content;
    } else if (content?.textContent && typeof content.textContent === 'string') {
      // ✅ NOUVEAU: Gérer le cas textContent
      textContent = content.textContent;
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
        console.warn('[NOTION] Original content:', typeof textContent === 'string' ? textContent.substring(0, 200) + '...' : '[Non-string content]');
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
    // ✅ CORRECTION: Vérifier que text est bien une string
    if (!text || typeof text !== 'string' || !text.trim()) {
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
   * ✅ NOUVEAU: Create image block from clipboard content using native upload
   */
  private async createImageBlock(content: any): Promise<NotionBlock[]> {
    try {
      console.log('[NOTION] 📸 Creating image block from clipboard content using native upload');

      // Vérifier qu'on a les données nécessaires
      if (!content.data && !content.content) {
        console.warn('[NOTION] No image data found in content');
        return this.createFallbackImageBlock(content);
      }

      // Convertir les données en Blob
      const imageData = content.data || content.content;
      const mimeType = content.metadata?.mimeType || 'image/png';
      const filename = `clipboard-image-${Date.now()}.${content.metadata?.format || 'png'}`;

      // Créer un Blob à partir des données
      let blob: Blob;
      if (imageData instanceof Uint8Array || imageData instanceof Buffer) {
        blob = new Blob([imageData], { type: mimeType });
      } else {
        console.warn('[NOTION] Unsupported image data type:', typeof imageData);
        return this.createFallbackImageBlock(content);
      }

      // Utiliser le FileUploadHandler pour uploader l'image
      try {
        const { FileUploadHandler } = await import('@notion-clipper/notion-parser');

        // Obtenir le token Notion depuis l'API adapter
        const notionToken = await this.getNotionToken();
        if (!notionToken) {
          console.warn('[NOTION] No Notion token available for upload');
          return this.createFallbackImageBlock(content);
        }

        const uploader = new FileUploadHandler({
          notionToken,
          maxFileSize: 20 * 1024 * 1024,
          integrationType: 'file_upload'
        });

        // Créer un objet File-like
        const fileObject = Object.assign(blob, {
          name: filename,
          lastModified: Date.now()
        }) as File;

        console.log('[NOTION] 🚀 Uploading image to Notion...');
        const uploadResult = await uploader.uploadFile(fileObject, filename);

        if (uploadResult.success && uploadResult.notionFileId) {
          console.log('[NOTION] ✅ Image uploaded successfully:', uploadResult.notionFileId);

          // Créer le bloc d'image avec l'ID du fichier uploadé
          return [{
            object: 'block',
            type: 'image',
            image: {
              type: 'file_upload',
              file_upload: {
                id: uploadResult.notionFileId
              }
            }
          } as NotionBlock];
        } else {
          console.error('[NOTION] Image upload failed:', uploadResult.error);
          return this.createFallbackImageBlock(content, uploadResult.error);
        }
      } catch (uploadError) {
        console.error('[NOTION] Error during image upload:', uploadError);
        return this.createFallbackImageBlock(content, uploadError instanceof Error ? uploadError.message : 'Upload error');
      }
    } catch (error) {
      console.error('[NOTION] Error creating image block:', error);
      return this.createFallbackImageBlock(content, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * ✅ HELPER: Create fallback text block for images
   */
  private createFallbackImageBlock(content: any, error?: string): NotionBlock[] {
    const imageInfo = content.metadata ?
      `Image détectée (${content.metadata.format || 'format inconnu'}, ${content.metadata.dimensions ? `${content.metadata.dimensions.width}x${content.metadata.dimensions.height}` : 'dimensions inconnues'}, ${((content.metadata.bufferSize || 0) / 1024).toFixed(2)} KB)` :
      'Image détectée depuis le presse-papiers';

    const errorText = error ? `\n❌ Erreur d'upload: ${error}` : '';
    const helpText = '\n💡 Astuce: Vous pouvez glisser-déposer l\'image directement dans Notion ou utiliser la fonction d\'upload.';

    return [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: `📸 ${imageInfo}${errorText}${helpText}` }
        }]
      }
    } as NotionBlock];
  }

  /**
   * ✅ HELPER: Get Notion token from API adapter
   */
  private async getNotionToken(): Promise<string | null> {
    try {
      // Essayer d'accéder au token depuis l'adapter
      const apiAdapter = this.api as any;

      // Méthode 1: token directement stocké dans l'adapter
      if (apiAdapter.token) {
        console.log('[NOTION] 🔑 Token found in adapter');
        return apiAdapter.token;
      }

      // Méthode 2: token dans le client Notion
      if (apiAdapter.client && apiAdapter.client.auth) {
        console.log('[NOTION] 🔑 Token found in client.auth');
        return apiAdapter.client.auth;
      }

      // Méthode 3: méthode getToken si elle existe
      if ('getToken' in this.api && typeof (this.api as any).getToken === 'function') {
        console.log('[NOTION] 🔑 Using getToken method');
        return await (this.api as any).getToken();
      }

      console.warn('[NOTION] ⚠️ No token found in adapter');
      return null;
    } catch (error) {
      console.error('[NOTION] Error getting token:', error);
      return null;
    }
  }

  /**
   * ✅ NOUVEAU: Create file block from clipboard content using native upload
   */
  private async createFileBlock(content: any): Promise<NotionBlock[]> {
    try {
      console.log('[NOTION] 📎 Creating file block from clipboard content using native upload');

      // Vérifier qu'on a les données nécessaires
      if (!content.data && !content.content) {
        console.warn('[NOTION] No file data found in content');
        return this.createFallbackFileBlock(content);
      }

      // Convertir les données en Blob
      const fileData = content.data || content.content;
      const mimeType = content.metadata?.mimeType || 'application/octet-stream';
      const filename = content.metadata?.name || `clipboard-file-${Date.now()}`;

      // Créer un Blob à partir des données
      let blob: Blob;
      if (fileData instanceof Uint8Array || fileData instanceof Buffer) {
        blob = new Blob([fileData], { type: mimeType });
      } else {
        console.warn('[NOTION] Unsupported file data type:', typeof fileData);
        return this.createFallbackFileBlock(content);
      }

      // Utiliser le FileUploadHandler pour uploader le fichier
      try {
        const { FileUploadHandler } = await import('@notion-clipper/notion-parser');

        // Obtenir le token Notion depuis l'API adapter
        const notionToken = await this.getNotionToken();
        if (!notionToken) {
          console.warn('[NOTION] No Notion token available for upload');
          return this.createFallbackFileBlock(content);
        }

        const uploader = new FileUploadHandler({
          notionToken,
          maxFileSize: 20 * 1024 * 1024,
          integrationType: 'file_upload'
        });

        // Créer un objet File-like
        const fileObject = Object.assign(blob, {
          name: filename,
          lastModified: Date.now()
        }) as File;

        console.log('[NOTION] 🚀 Uploading file to Notion...');
        const uploadResult = await uploader.uploadFile(fileObject, filename);

        if (uploadResult.success && uploadResult.notionFileId) {
          console.log('[NOTION] ✅ File uploaded successfully:', uploadResult.notionFileId);

          // Créer un bloc toggle avec le fichier à l'intérieur
          const fileName = content.metadata?.name || filename;
          const fileExtension = fileName.split('.').pop()?.toLowerCase();
          const mimeType = content.metadata?.mimeType || 'application/octet-stream';

          // Déterminer le type de bloc à créer à l'intérieur du toggle
          let innerBlock: NotionBlock;

          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension || '')) {
            // Image
            innerBlock = {
              object: 'block',
              type: 'image',
              image: {
                type: 'file_upload',
                file_upload: {
                  id: uploadResult.notionFileId
                }
              }
            } as NotionBlock;
          } else if (['mp4', 'mov', 'webm', 'avi'].includes(fileExtension || '')) {
            // Vidéo
            innerBlock = {
              object: 'block',
              type: 'video',
              video: {
                type: 'file_upload',
                file_upload: {
                  id: uploadResult.notionFileId
                }
              }
            } as NotionBlock;
          } else if (['mp3', 'wav', 'ogg', 'aac'].includes(fileExtension || '')) {
            // Audio
            innerBlock = {
              object: 'block',
              type: 'audio',
              audio: {
                type: 'file_upload',
                file_upload: {
                  id: uploadResult.notionFileId
                }
              }
            } as NotionBlock;
          } else if (fileExtension === 'pdf' || mimeType.includes('pdf')) {
            // PDF - Créer un embed pour l'aperçu intégré
            innerBlock = {
              object: 'block',
              type: 'embed',
              embed: {
                url: uploadResult.notionUrl || uploadResult.url || `https://notion.so/file/${uploadResult.notionFileId}`
              }
            } as NotionBlock;
          } else {
            // Autres fichiers (documents, etc.)
            innerBlock = {
              object: 'block',
              type: 'file',
              file: {
                type: 'file_upload',
                file_upload: {
                  id: uploadResult.notionFileId
                }
              }
            } as NotionBlock;
          }

          // Obtenir l'icône appropriée selon le type de fichier
          const fileIcon = this.getFileIcon(fileName, mimeType);

          // Créer le bloc toggle avec le fichier à l'intérieur
          return [{
            object: 'block',
            type: 'toggle',
            toggle: {
              rich_text: [{
                type: 'text',
                text: { content: `${fileIcon} ${fileName}` }
              }],
              children: [innerBlock]
            }
          } as NotionBlock];
        } else {
          console.error('[NOTION] File upload failed:', uploadResult.error);
          return this.createFallbackFileBlock(content, uploadResult.error);
        }
      } catch (uploadError) {
        console.error('[NOTION] Error during file upload:', uploadError);
        return this.createFallbackFileBlock(content, uploadError instanceof Error ? uploadError.message : 'Upload error');
      }
    } catch (error) {
      console.error('[NOTION] Error creating file block:', error);
      return this.createFallbackFileBlock(content, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * ✅ HELPER: Create fallback text block for files
   */
  private createFallbackFileBlock(content: any, error?: string): NotionBlock[] {
    const fileName = content.metadata?.name || 'nom inconnu';
    const mimeType = content.metadata?.mimeType || 'application/octet-stream';
    
    // Obtenir l'icône appropriée
    const fileIcon = this.getFileIcon(fileName, mimeType);
    
    const fileInfo = content.metadata ?
      `Fichier détecté (${fileName}, ${((content.metadata.size || 0) / 1024).toFixed(2)} KB)` :
      'Fichier détecté depuis le presse-papiers';

    const errorText = error ? `\n❌ Erreur d'upload: ${error}` : '';
    const helpText = '\n💡 Astuce: Vous pouvez glisser-déposer le fichier directement dans Notion ou utiliser la fonction d\'upload.';

    return [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: `${fileIcon} ${fileInfo}${errorText}${helpText}` }
        }]
      }
    } as NotionBlock];
  }

  /**
   * ✅ NOUVEAU: Get appropriate icon for file type
   */
  private getFileIcon(fileName: string, mimeType: string): string {
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    // Images
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension || '')) {
      return '🖼️';
    }

    // Vidéos
    if (mimeType.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(fileExtension || '')) {
      return '🎬';
    }

    // Audio
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(fileExtension || '')) {
      return '🎵';
    }

    // PDF
    if (fileExtension === 'pdf' || mimeType === 'application/pdf') {
      return '📄';
    }

    // Documents Word
    if (['doc', 'docx'].includes(fileExtension || '') || mimeType.includes('wordprocessingml')) {
      return '📝';
    }

    // Feuilles de calcul Excel
    if (['xls', 'xlsx'].includes(fileExtension || '') || mimeType.includes('spreadsheetml')) {
      return '📊';
    }

    // Présentations PowerPoint
    if (['ppt', 'pptx'].includes(fileExtension || '') || mimeType.includes('presentationml')) {
      return '📋';
    }

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension || '')) {
      return '🗜️';
    }

    // Code
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(fileExtension || '')) {
      return '💻';
    }

    // Texte
    if (['txt', 'md', 'rtf'].includes(fileExtension || '') || mimeType.startsWith('text/')) {
      return '📃';
    }

    // Fichier générique
    return '📎';
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

  /**
   * Récupère les informations complètes sur l'utilisateur et son workspace
   */
  async getUserInfo(): Promise<{
    name?: string;
    email?: string;
    workspaceName?: string;
    avatar?: string;
    userId?: string;
    workspaceId?: string;
    totalPages?: number;
    totalDatabases?: number;
    recentPages?: Array<{ id: string; title: string; lastEdited: string }>;
  } | null> {
    try {
      if (!this.api) {
        console.warn('[ElectronNotionService] getUserInfo: No Notion API available');
        return null;
      }

      // ✅ Utiliser la méthode getUserInfo de l'adapter si disponible
      if ('getUserInfo' in this.api && typeof (this.api as any).getUserInfo === 'function') {
        return await (this.api as any).getUserInfo();
      }

      // ✅ Fallback: essayer d'accéder au client directement (pour compatibilité)
      const apiAdapter = this.api as any;
      if (apiAdapter.client) {
        try {
          const botUser = await apiAdapter.client.users.me();
          const userInfo: {
            name?: string;
            email?: string;
            workspaceName?: string;
            avatar?: string;
            userId?: string;
            workspaceId?: string;
            totalPages?: number;
            totalDatabases?: number;
            recentPages?: Array<{ id: string; title: string; lastEdited: string }>;
          } = {};

          if (botUser.name) {
            userInfo.name = botUser.name;
          }

          if (botUser.id) {
            userInfo.userId = botUser.id;
          }

          if (botUser.avatar_url) {
            userInfo.avatar = botUser.avatar_url;
          }

          if ('person' in botUser && botUser.person && 'email' in botUser.person) {
            userInfo.email = botUser.person.email;
          }

          userInfo.workspaceName = 'Workspace Notion';

          console.log('[ElectronNotionService] getUserInfo result (fallback):', userInfo);
          return userInfo;
        } catch (error) {
          console.error('[ElectronNotionService] Fallback getUserInfo failed:', error);
        }
      }

      console.warn('[ElectronNotionService] getUserInfo: No method available');
      return null;
    } catch (error) {
      console.error('[ElectronNotionService] Error in getUserInfo:', error);
      return null;
    }
  }
}