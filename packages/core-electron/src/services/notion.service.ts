import type { INotionAPI, NotionPage, NotionDatabase, ICacheAdapter } from '@notion-clipper/core-shared';

export class ElectronNotionService {
  constructor(
    private api: INotionAPI,
    private cache?: ICacheAdapter
  ) {}
  
  async getPages(forceRefresh = false): Promise<NotionPage[]> {
    const cacheKey = 'notion:pages';
    
    if (!forceRefresh && this.cache) {
      const cached = await this.cache.get<NotionPage[]>(cacheKey); // ✅ Maintenant OK
      if (cached) return cached;
    }
    
    const pages = await this.api.searchPages();
    
    if (this.cache) {
      await this.cache.set(cacheKey, pages, 300000);
    }
    
    return pages;
  }
  
  async getDatabases(forceRefresh = false): Promise<NotionDatabase[]> {
    const cacheKey = 'notion:databases';
    
    if (!forceRefresh && this.cache) {
      const cached = await this.cache.get<NotionDatabase[]>(cacheKey); // ✅ Maintenant OK
      if (cached) return cached;
    }
    
    const databases = await this.api.searchDatabases();
    
    if (this.cache) {
      await this.cache.set(cacheKey, databases, 300000);
    }
    
    return databases;
  }
}