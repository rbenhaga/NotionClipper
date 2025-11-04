// packages/adapters/electron/src/notion-api.adapter.ts
import type { INotionAPI, NotionPage, NotionDatabase, NotionBlock } from '@notion-clipper/core-shared';
import { Client } from '@notionhq/client';

// Declare fetch as global (available in Electron)
declare global {
  function fetch(input: string, init?: any): Promise<any>;
}

/**
 * Electron Notion API Adapter
 * Implements INotionAPI interface using the official Notion SDK
 */
export class ElectronNotionAPIAdapter implements INotionAPI {
  private client: Client | null = null;
  private token: string | null = null;

  constructor(token?: string) {
    if (token) {
      this.setToken(token);
    }
  }

  /**
   * Set Notion API token
   */
  setToken(token: string): void {
    // ✅ Validation du format
    if (!token || token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }
    
    // Validation flexible du token - accepter plusieurs formats
    if (!token.startsWith('ntn_')) {
      console.warn('⚠️ Token format non reconnu - tentative de connexion quand même');
      // Ne pas lancer d'erreur, laisser l'API Notion décider
    }
    
    this.token = token;
    this.client = new Client({
      auth: token,
      notionVersion: '2025-09-03'
    });
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      await this.client.users.me({});
      return true;
    } catch (error) {
      console.error('❌ Notion API connection test failed:', error);
      
      // Vérifier si c'est une erreur d'autorisation
      if ((error as any)?.code === 'unauthorized' || (error as any)?.status === 401) {
        console.error('🔑 Token invalide ou expiré - OAuth requis');
        // Émettre un événement pour déclencher le renouvellement OAuth
        this.emitTokenExpired();
      }
      
      return false;
    }
  }

  /**
   * Émettre un événement quand le token expire
   */
  private emitTokenExpired(): void {
    // Dans un vrai environnement, on utiliserait EventEmitter
    console.log('🔄 Token expiré - renouvellement OAuth nécessaire');
    
    // Pour l'instant, on peut juste logger
    // Dans une version future, on pourrait déclencher automatiquement le renouvellement
  }

  /**
   * Search for pages and databases
   */
  async search(query?: string): Promise<(NotionPage | NotionDatabase)[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.search({
        query,
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      return response.results.map(item => this.formatPageOrDatabase(item));
    } catch (error) {
      console.error('❌ Error searching Notion:', error);
      throw error;
    }
  }

  /**
   * Search only pages with pagination support
   */
  async searchPages(query?: string): Promise<NotionPage[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const allPages: NotionPage[] = [];
      let hasMore = true;
      let startCursor: string | undefined;

      while (hasMore) {
        const response = await this.client.search({
          query,
          filter: {
            property: 'object',
            value: 'page'
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: 100, // Maximum per request
          start_cursor: startCursor
        });

        const pages = response.results
          .filter(item => item.object === 'page')
          .map(item => this.formatPage(item));

        allPages.push(...pages);

        // Émettre un événement de progression via le main window
        try {
          const { BrowserWindow } = require('electron');
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('pages:progress', {
              count: allPages.length,
              batch: pages.length,
              completed: false
            });
          }
        } catch (error) {
          // Ignorer les erreurs d'émission d'événements
        }

        hasMore = response.has_more;
        startCursor = response.next_cursor || undefined;

        // Limite de sécurité pour éviter les boucles infinies
        if (allPages.length > 10000) {
          console.warn('[NOTION] ⚠️ Reached safety limit of 10,000 pages');
          break;
        }
      }

      console.log(`[NOTION] ✅ Retrieved ${allPages.length} pages total`);
      
      // Émettre un événement final de progression
      try {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('pages:progress', {
            count: allPages.length,
            total: allPages.length,
            completed: true
          });
        }
      } catch (error) {
        // Ignorer les erreurs d'émission d'événements
      }
      
      return allPages;
    } catch (error) {
      console.error('❌ Error searching pages:', error);
      throw error;
    }
  }

  /**
   * Search only databases with pagination support
   * Note: Notion API doesn't support filtering by 'database' directly,
   * so we search all and filter results manually
   */
  async searchDatabases(query?: string): Promise<NotionDatabase[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const allDatabases: NotionDatabase[] = [];
      let hasMore = true;
      let startCursor: string | undefined;

      while (hasMore) {
        // Search without filter, then filter manually
        const response = await this.client.search({
          query,
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: 100, // Maximum per request
          start_cursor: startCursor
        });

        // Filter only databases from results
        const databases = response.results
          .filter(item => this.isDatabase(item))
          .map(item => this.formatDatabase(item));

        allDatabases.push(...databases);

        hasMore = response.has_more;
        startCursor = response.next_cursor || undefined;

        // Limite de sécurité pour éviter les boucles infinies
        if (allDatabases.length > 1000) {
          console.warn('[NOTION] ⚠️ Reached safety limit of 1,000 databases');
          break;
        }
      }

      console.log(`[NOTION] ✅ Retrieved ${allDatabases.length} databases total`);
      return allDatabases;
    } catch (error) {
      console.error('❌ Error searching databases:', error);
      throw error;
    }
  }

  /**
   * Get all pages
   */
  async getPages(): Promise<NotionPage[]> {
    // Use searchPages without query to get all pages
    return this.searchPages();
  }

  /**
   * ✅ NOUVEAU: Get pages with pagination support for infinite scroll
   */
  async getPagesWithPagination(options: {
    cursor?: string;
    pageSize?: number;
    sortBy?: 'last_edited_time';
    sortDirection?: 'ascending' | 'descending';
  } = {}): Promise<{
    pages: NotionPage[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const {
        cursor,
        pageSize = 50,
        sortBy = 'last_edited_time',
        sortDirection = 'descending'
      } = options;

      console.log(`[NOTION] 📄 Loading pages with pagination (cursor: ${cursor ? 'yes' : 'no'}, size: ${pageSize})`);

      const response = await this.client.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: sortDirection,
          timestamp: sortBy
        },
        page_size: Math.min(pageSize, 100), // Notion API limit
        start_cursor: cursor
      });

      const pages = response.results
        .filter(item => item.object === 'page')
        .map(item => this.formatPage(item));

      console.log(`[NOTION] ✅ Loaded ${pages.length} pages (hasMore: ${response.has_more})`);

      return {
        pages,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined
      };
    } catch (error) {
      console.error('❌ Error loading pages with pagination:', error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU: Get recent pages with pagination (optimized for recent tab)
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
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const { cursor, limit = 20 } = options;

      console.log(`[NOTION] 🕒 Loading recent pages (cursor: ${cursor ? 'yes' : 'no'}, limit: ${limit})`);

      const response = await this.client.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time' // Toujours trier par dernière modification
        },
        page_size: Math.min(limit, 100),
        start_cursor: cursor
      });

      const pages = response.results
        .filter(item => item.object === 'page')
        .map(item => this.formatPage(item));

      console.log(`[NOTION] ✅ Loaded ${pages.length} recent pages (hasMore: ${response.has_more})`);

      return {
        pages,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined
      };
    } catch (error) {
      console.error('❌ Error loading recent pages:', error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU: Search pages with explicit pagination support
   */
  async searchPagesPaginated(options: {
    query?: string;
    cursor?: string;
    pageSize?: number;
  } = {}): Promise<{
    pages: NotionPage[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const { query, cursor, pageSize = 50 } = options;

      console.log(`[NOTION] 🔍 Paginated search (query: ${query || 'none'}, cursor: ${cursor ? 'yes' : 'no'}, size: ${pageSize})`);

      const response = await this.client.search({
        query,
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        },
        page_size: Math.min(pageSize, 100),
        start_cursor: cursor
      });

      const pages = response.results
        .filter(item => item.object === 'page')
        .map(item => this.formatPage(item));

      console.log(`[NOTION] ✅ Paginated search result: ${pages.length} pages (hasMore: ${response.has_more})`);

      return {
        pages,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined
      };
    } catch (error) {
      console.error('❌ Error in paginated search:', error);
      throw error;
    }
  }

  /**
   * Get all databases
   */
  async getDatabases(): Promise<NotionDatabase[]> {
    // Use searchDatabases without query to get all databases
    return this.searchDatabases();
  }

  /**
   * Get page by ID
   */
  async getPage(pageId: string): Promise<NotionPage> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.pages.retrieve({ page_id: pageId });
      return this.formatPage(response);
    } catch (error) {
      console.error(`❌ Error getting page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Get database by ID with data source support
   */
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // With API version 2025-09-03, we need to get data sources
      const response = await this.client.databases.retrieve({ database_id: databaseId });
      const database = this.formatDatabase(response);
      
      // Add data source information if available (cast to any for new API fields)
      const responseWithDataSources = response as any;
      if (responseWithDataSources.data_sources && responseWithDataSources.data_sources.length > 0) {
        database.data_sources = responseWithDataSources.data_sources;
        // Use the first data source as default for backward compatibility
        database.default_data_source_id = responseWithDataSources.data_sources[0].id;
      }
      
      return database;
    } catch (error) {
      console.error(`❌ Error getting database ${databaseId}:`, error);
      throw error;
    }
  }

  /**
   * Get data source information for a database
   */
  async getDataSource(dataSourceId: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // Use custom request for data source API (not yet in SDK)
      const response = await (this.client as any).request({
        path: `data_sources/${dataSourceId}`,
        method: 'GET'
      });
      
      return response;
    } catch (error) {
      console.error('❌ Error retrieving data source:', error);
      throw error;
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
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // Handle data_source_id parent by converting to database_id for SDK compatibility
      let parentForSDK = data.parent;
      if ('data_source_id' in data.parent) {
        // For now, we'll need to get the database_id from the data source
        // This is a temporary workaround until SDK v5 is available
        console.warn('data_source_id parent detected, using as-is with cast');
        parentForSDK = data.parent as any;
      }

      const response = await this.client.pages.create({
        parent: parentForSDK as any,
        properties: data.properties,
        children: (data.children || []) as any
      });

      return this.formatPage(response);
    } catch (error) {
      console.error('❌ Error creating page:', error);
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
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const response = await this.client.pages.update({
        page_id: pageId,
        properties: data.properties || {}
      });

      return this.formatPage(response);
    } catch (error) {
      console.error(`❌ Error updating page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Append blocks to a page
   */
  async appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const cleanPageId = pageId.replace(/-/g, '');

      // Split blocks into chunks of 100 (Notion API limit)
      const chunks = this.chunkArray(blocks, 100);
      
      for (const chunk of chunks) {
        await this.client.blocks.children.append({
          block_id: cleanPageId,
          children: chunk as any
        });
      }
    } catch (error) {
      console.error(`❌ Error appending blocks to page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Check network connectivity before making API calls
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // Simple connectivity check - try to resolve DNS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok || response.status === 401; // 401 means we can reach the API
    } catch (error: any) {
      console.log('[API] Network connectivity check failed:', error.code || error.message);
      return false;
    }
  }

  /**
   * ✅ NOUVEAU: Append blocks AFTER a specific block
   * Uses Notion API PATCH /blocks/{parent_id}/children with 'after' parameter
   */
  async appendBlocksAfter(blockId: string, blocks: NotionBlock[]): Promise<void> {
    try {
      if (!this.client || !this.token) {
        throw new Error('Notion client not initialized');
      }

      // ✅ Vérifier la connectivité réseau avant de faire l'appel
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('NETWORK_OFFLINE: No internet connection available');
      }

      const cleanBlockId = blockId.replace(/-/g, '');
      console.log(`[API] Appending ${blocks.length} blocks after block ${cleanBlockId}`);

      // ✅ ÉTAPE 1: Récupérer le bloc pour obtenir son parent
      const blockResponse = await fetch(`https://api.notion.com/v1/blocks/${cleanBlockId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!blockResponse.ok) {
        const error = await blockResponse.json();
        throw new Error(`Failed to get block: ${error.message || blockResponse.statusText}`);
      }

      const block = await blockResponse.json();
      const parentId = block.parent?.page_id || block.parent?.block_id;

      if (!parentId) {
        throw new Error('Could not determine parent block/page ID');
      }

      console.log(`[API] Parent ID: ${parentId}, inserting after block ${cleanBlockId}`);

      // ✅ ÉTAPE 2: Utiliser PATCH sur le parent avec le paramètre 'after'
      const response = await fetch(`https://api.notion.com/v1/blocks/${parentId}/children`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          children: blocks,
          after: cleanBlockId // ✅ Insère APRÈS ce bloc
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Notion API error: ${error.message || response.statusText}`);
      }

      console.log(`[API] ✅ Successfully appended blocks after ${cleanBlockId}`);
    } catch (error) {
      console.error('❌ Error appending blocks after specific block:', error);
      throw error;
    }
  }

  /**
   * Get page blocks (children)
   */
  async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      const blocks: NotionBlock[] = [];
      let cursor: string | undefined;

      do {
        const response = await this.client.blocks.children.list({
          block_id: pageId,
          start_cursor: cursor,
          page_size: 100
        });

        blocks.push(...response.results as NotionBlock[]);
        cursor = response.has_more ? response.next_cursor || undefined : undefined;
      } while (cursor);

      return blocks;
    } catch (error) {
      console.error(`❌ Error getting blocks for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Upload file to Notion
   */
  async uploadFile(file: Buffer, filename: string): Promise<string> {
    try {
      if (!this.client) {
        throw new Error('Notion client not initialized');
      }

      // ✅ Vérifier la connectivité réseau avant l'upload
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('NETWORK_OFFLINE: No internet connection available for file upload');
      }

      // First, get upload URL
      const uploadResponse = await (this.client as any).request({
        path: 'files',
        method: 'POST',
        body: {
          name: filename,
          type: 'file'
        }
      });

      const { upload_url, id } = uploadResponse as any;

      // Upload file to the URL
      const response = await fetch(upload_url, {
        method: 'PUT',
        body: file
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      return id;
    } catch (error) {
      console.error('❌ Error uploading file to Notion:', error);
      throw error;
    }
  }

  /**
   * ✅ Get comprehensive user information from Notion API
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
      if (!this.client) {
        console.warn('[ElectronNotionAPIAdapter] No Notion client available');
        return null;
      }

      console.log('[ElectronNotionAPIAdapter] 🔍 Fetching comprehensive user info...');

      // 1. Get bot user info
      const botUser = await this.client.users.me({});
      console.log('[ElectronNotionAPIAdapter] Bot user:', botUser);

      // 2. Get recent pages for workspace stats and info
      const pagesSearch = await this.client.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        },
        page_size: 10 // Get 10 recent pages for stats
      });

      // 3. Get databases count
      const databasesSearch = await this.client.search({
        filter: {
          property: 'object',
          value: 'database'
        },
        page_size: 5 // Just for counting
      });

      // 4. Build comprehensive user info
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

      // Basic user info
      if (botUser.name) {
        userInfo.name = botUser.name;
      }

      if (botUser.id) {
        userInfo.userId = botUser.id;
      }

      // Extract email if available
      if ('person' in botUser && botUser.person && 'email' in botUser.person) {
        userInfo.email = botUser.person.email;
      }

      // Extract avatar URL
      if (botUser.avatar_url) {
        userInfo.avatar = botUser.avatar_url;
      }

      // Workspace info from first page
      if (pagesSearch.results.length > 0) {
        const firstResult: any = pagesSearch.results[0];
        
        // Try to extract workspace ID and name
        if (firstResult.parent && firstResult.parent.type === 'workspace') {
          userInfo.workspaceId = 'workspace'; // API doesn't expose workspace ID directly
          
          // Try to get a meaningful workspace name from page titles
          const pageTitles = pagesSearch.results
            .slice(0, 3)
            .map((page: any) => this.extractTitle(page.properties))
            .filter(title => title && title !== 'Untitled');
          
          if (pageTitles.length > 0) {
            // Use a smart workspace name based on content
            const commonWords = pageTitles.join(' ').split(' ');
            const uniqueWords = [...new Set(commonWords)].filter(word => 
              word.length > 3 && !['page', 'document', 'note'].includes(word.toLowerCase())
            );
            
            if (uniqueWords.length > 0) {
              userInfo.workspaceName = `${uniqueWords[0]} Workspace`;
            } else {
              userInfo.workspaceName = 'Mon Workspace Notion';
            }
          } else {
            userInfo.workspaceName = 'Mon Workspace Notion';
          }
        }
      }

      // Default workspace name if not found
      if (!userInfo.workspaceName) {
        userInfo.workspaceName = userInfo.name ? `Workspace de ${userInfo.name}` : 'Mon Workspace Notion';
      }

      // Stats
      userInfo.totalPages = pagesSearch.results.length; // This is just the sample, real count would need pagination
      userInfo.totalDatabases = databasesSearch.results.length;

      // Recent pages info
      userInfo.recentPages = pagesSearch.results.slice(0, 5).map((page: any) => ({
        id: page.id,
        title: this.extractTitle(page.properties) || 'Page sans titre',
        lastEdited: page.last_edited_time
      }));

      // Get more accurate counts with additional searches (optional, for better UX)
      try {
        // Quick count of total pages (limited search)
        const allPagesSearch = await this.client.search({
          filter: {
            property: 'object',
            value: 'page'
          },
          page_size: 100
        });
        userInfo.totalPages = allPagesSearch.results.length;

        // Quick count of total databases
        const allDbSearch = await this.client.search({
          filter: {
            property: 'object',
            value: 'database'
          },
          page_size: 50
        });
        userInfo.totalDatabases = allDbSearch.results.length;
      } catch (error) {
        console.warn('[ElectronNotionAPIAdapter] Could not get accurate counts:', error);
      }

      console.log('[ElectronNotionAPIAdapter] ✅ Comprehensive user info:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('[ElectronNotionAPIAdapter] Error getting user info:', error);
      return null;
    }
  }

  /**
   * Check if item is a database
   */
  private isDatabase(item: any): boolean {
    return item.object === 'database' || item.object === 'data_source';
  }

  /**
   * Format page or database response
   */
  private formatPageOrDatabase(item: any): NotionPage | NotionDatabase {
    // Check object type directly
    if (item.object === 'database' || item.object === 'data_source') {
      return this.formatDatabase(item);
    } else {
      return this.formatPage(item);
    }
  }

  /**
   * Format page response
   */
  private formatPage(page: any): NotionPage {
    return {
      id: page.id,
      title: this.extractTitle(page.properties),
      url: page.url,
      icon: page.icon,
      cover: page.cover,
      parent: page.parent,
      properties: page.properties || {},
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      archived: page.archived || false,
      in_trash: page.in_trash || false,
      type: 'page' // Ajouter le type pour que PageCard puisse différencier
    };
  }

  /**
   * Format database response
   */
  private formatDatabase(database: any): NotionDatabase {
    return {
      id: database.id,
      title: this.extractTitle(database.title),
      description: database.description || '',
      icon: database.icon,
      cover: database.cover,
      properties: database.properties || {},
      parent: database.parent,
      url: database.url,
      created_time: database.created_time,
      last_edited_time: database.last_edited_time,
      archived: database.archived || false,
      in_trash: database.in_trash || false,
      type: 'database' // Ajouter le type pour que PageCard puisse détecter les databases
    };
  }

  /**
   * Extract title from properties or title array
   */
  private extractTitle(properties: any): string {
    if (Array.isArray(properties)) {
      // Database title format
      return properties.map(item => item.plain_text).join('');
    }

    // Page properties format
    for (const [key, value] of Object.entries(properties)) {
      const prop = value as any;
      if (prop.type === 'title' && prop.title) {
        return prop.title.map((item: any) => item.plain_text).join('');
      }
    }

    return 'Untitled';
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

}