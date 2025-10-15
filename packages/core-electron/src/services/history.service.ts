// packages/core-electron/src/services/history.service.ts
import type { IStorage } from '@notion-clipper/core-shared';
import type { HistoryEntry, HistoryStats, HistoryFilter } from '@notion-clipper/core-shared';

export class ElectronHistoryService {
  private storage: IStorage;
  private maxEntries: number = 1000; // Limite à 1000 entrées
  private storageKey = 'history';
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Ajouter une entrée à l'historique
   */
  async add(entry: Omit<HistoryEntry, 'id'>): Promise<HistoryEntry> {
    const fullEntry: HistoryEntry = {
      ...entry,
      id: this.generateId(),
    };
    
    const history = await this.getAll();
    history.unshift(fullEntry);
    
    // Limiter à maxEntries
    if (history.length > this.maxEntries) {
      history.splice(this.maxEntries);
    }
    
    await this.storage.set(this.storageKey, history);
    return fullEntry;
  }

  /**
   * Mettre à jour une entrée
   */
  async update(
    id: string,
    updates: Partial<HistoryEntry>
  ): Promise<HistoryEntry | null> {
    const history = await this.getAll();
    const index = history.findIndex(e => e.id === id);
    
    if (index === -1) return null;
    
    history[index] = { ...history[index], ...updates };
    await this.storage.set(this.storageKey, history);
    
    return history[index];
  }

  /**
   * Récupérer tout l'historique
   */
  async getAll(): Promise<HistoryEntry[]> {
    return await this.storage.get<HistoryEntry[]>(this.storageKey) || [];
  }

  /**
   * Récupérer l'historique filtré
   */
  async getFiltered(filter: HistoryFilter): Promise<HistoryEntry[]> {
    const history = await this.getAll();
    
    return history.filter(entry => {
      // Filtrer par statut
      if (filter.status && !filter.status.includes(entry.status)) {
        return false;
      }
      
      // Filtrer par type
      if (filter.type && !filter.type.includes(entry.type)) {
        return false;
      }
      
      // Filtrer par page
      if (filter.pageId && entry.page.id !== filter.pageId) {
        return false;
      }
      
      // Filtrer par date
      if (filter.dateFrom && entry.timestamp < filter.dateFrom) {
        return false;
      }
      if (filter.dateTo && entry.timestamp > filter.dateTo) {
        return false;
      }
      
      // Recherche textuelle
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const inContent = entry.content.preview.toLowerCase().includes(searchLower);
        const inPage = entry.page.title.toLowerCase().includes(searchLower);
        return inContent || inPage;
      }
      
      return true;
    });
  }

  /**
   * Obtenir les statistiques
   */
  async getStats(): Promise<HistoryStats> {
    const history = await this.getAll();
    
    const stats: HistoryStats = {
      total: history.length,
      success: 0,
      failed: 0,
      pending: 0,
      totalSize: 0,
      byType: {},
      byPage: {}
    };
    
    for (const entry of history) {
      // Compter par statut
      if (entry.status === 'success') stats.success++;
      if (entry.status === 'failed') stats.failed++;
      if (entry.status === 'pending' || entry.status === 'sending') stats.pending++;
      
      // Compter par type
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
      
      // Compter par page
      stats.byPage[entry.page.id] = (stats.byPage[entry.page.id] || 0) + 1;
      
      // Taille totale
      if (entry.content.metadata?.fileSize) {
        stats.totalSize += entry.content.metadata.fileSize;
      }
    }
    
    return stats;
  }

  /**
   * Supprimer une entrée
   */
  async delete(id: string): Promise<boolean> {
    const history = await this.getAll();
    const filtered = history.filter(e => e.id !== id);
    
    if (filtered.length === history.length) return false;
    
    await this.storage.set(this.storageKey, filtered);
    return true;
  }

  /**
   * Vider l'historique
   */
  async clear(): Promise<void> {
    await this.storage.set(this.storageKey, []);
  }

  /**
   * Nettoyer les anciennes entrées (> 30 jours)
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const history = await this.getAll();
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    const filtered = history.filter(e => e.timestamp > cutoff);
    const removed = history.length - filtered.length;
    
    if (removed > 0) {
      await this.storage.set(this.storageKey, filtered);
    }
    
    return removed;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}