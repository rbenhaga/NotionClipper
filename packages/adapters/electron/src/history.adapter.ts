// packages/adapters/electron/src/history.adapter.ts

import {
  IHistoryAdapter,
  HistoryEntry,
  HistoryFilter,
  HistoryStats,
  HistoryPaginationOptions,
  HistoryPaginatedResult,
  HistoryCleanupOptions,
  HistoryStatus
} from '@notion-clipper/core-shared';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Electron History Adapter - Utilise le filesystem avec cache en mémoire
 * Stockage : ~/.notion-clipper/history.json
 */
export class ElectronHistoryAdapter implements IHistoryAdapter {
  private historyPath: string;
  private historyFile: string;
  private cache: Map<string, HistoryEntry> = new Map();
  private initialized = false;
  private persistTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.historyPath = path.join(app.getPath('userData'), 'history');
    this.historyFile = path.join(this.historyPath, 'history.json');
  }

  /**
   * Initialiser l'adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Créer le dossier
      await fs.mkdir(this.historyPath, { recursive: true });

      // Charger l'historique depuis le fichier
      try {
        const data = await fs.readFile(this.historyFile, 'utf8');
        const entries = JSON.parse(data) as HistoryEntry[];

        // Charger en cache avec validation
        let loaded = 0;
        let invalid = 0;

        for (const entry of entries) {
          if (this.validateEntry(entry)) {
            this.cache.set(entry.id, entry);
            loaded++;
          } else {
            invalid++;
          }
        }

        console.log(`[HISTORY] Loaded ${loaded} entries (${invalid} invalid)`);
      } catch (error) {
        // Fichier n'existe pas encore, initialiser vide
        console.log('[HISTORY] Initializing empty history');
        await this.persist();
      }

      this.initialized = true;
    } catch (error) {
      console.error('[HISTORY] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Ajouter une entrée à l'historique
   */
  async add(entry: HistoryEntry): Promise<void> {
    if (!this.initialized) await this.initialize();

    if (!this.validateEntry(entry)) {
      throw new Error('Invalid history entry');
    }

    this.cache.set(entry.id, entry);
    await this.debouncedPersist();
  }

  /**
   * Récupérer toutes les entrées avec filtres optionnels
   */
  async getAll(filter?: HistoryFilter): Promise<HistoryEntry[]> {
    if (!this.initialized) await this.initialize();

    let entries = Array.from(this.cache.values());

    // Appliquer les filtres
    if (filter) {
      entries = this.applyFilter(entries, filter);
    }

    // Trier par date décroissante (plus récent en premier)
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Récupérer les entrées avec pagination
   */
  async getPaginated(
    filter?: HistoryFilter,
    pagination?: HistoryPaginationOptions
  ): Promise<HistoryPaginatedResult> {
    if (!this.initialized) await this.initialize();

    const allEntries = await this.getAll(filter);
    
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const sortBy = pagination?.sortBy || 'timestamp';
    const sortOrder = pagination?.sortOrder || 'desc';

    // Tri personnalisé
    if (sortBy !== 'timestamp') {
      allEntries.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (sortBy) {
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'size':
            aVal = a.content.size || 0;
            bVal = b.content.size || 0;
            break;
          default:
            aVal = a.timestamp;
            bVal = b.timestamp;
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const entries = allEntries.slice(startIndex, endIndex);

    const total = allEntries.length;
    const totalPages = Math.ceil(total / limit);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Récupérer une entrée par ID
   */
  async getById(id: string): Promise<HistoryEntry | null> {
    if (!this.initialized) await this.initialize();

    return this.cache.get(id) || null;
  }

  /**
   * Mettre à jour le statut d'une entrée
   */
  async updateStatus(
    id: string,
    status: HistoryStatus,
    error?: string,
    metadata?: Partial<HistoryEntry>
  ): Promise<void> {
    if (!this.initialized) await this.initialize();

    const entry = this.cache.get(id);
    if (entry) {
      entry.status = status;
      if (error) entry.error = error;
      if (metadata) {
        Object.assign(entry, metadata);
      }
      await this.debouncedPersist();
    }
  }

  /**
   * Mettre à jour une entrée complète
   */
  async update(id: string, updates: Partial<HistoryEntry>): Promise<void> {
    if (!this.initialized) await this.initialize();

    const entry = this.cache.get(id);
    if (entry) {
      Object.assign(entry, updates);
      await this.debouncedPersist();
    }
  }

  /**
   * Supprimer une entrée
   */
  async delete(id: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    this.cache.delete(id);
    await this.debouncedPersist();
  }

  /**
   * Supprimer plusieurs entrées selon un filtre
   */
  async deleteMany(filter: HistoryFilter): Promise<number> {
    if (!this.initialized) await this.initialize();

    const entries = Array.from(this.cache.values());
    const toDelete = this.applyFilter(entries, filter);

    for (const entry of toDelete) {
      this.cache.delete(entry.id);
    }

    if (toDelete.length > 0) {
      await this.debouncedPersist();
    }

    return toDelete.length;
  }

  /**
   * Vider l'historique selon des critères
   */
  async clear(filter?: HistoryFilter): Promise<void> {
    if (!this.initialized) await this.initialize();

    if (!filter) {
      // Vider complètement
      this.cache.clear();
    } else {
      // Vider selon le filtre
      await this.deleteMany(filter);
    }

    await this.persist();
  }

  /**
   * Obtenir les statistiques
   */
  async getStats(): Promise<HistoryStats> {
    if (!this.initialized) await this.initialize();

    const entries = Array.from(this.cache.values());
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7days = now - (7 * 24 * 60 * 60 * 1000);
    const last30days = now - (30 * 24 * 60 * 60 * 1000);

    // Compter par statut
    const statusCounts = {
      pending: 0,
      sending: 0,
      success: 0,
      error: 0
    };

    // Compter par type de contenu
    const byContentType = {
      text: 0,
      image: 0,
      file: 0,
      html: 0,
      markdown: 0
    };

    let totalSize = 0;
    let totalProcessingTime = 0;
    let processedCount = 0;

    for (const entry of entries) {
      // Statuts
      statusCounts[entry.status]++;

      // Types de contenu
      byContentType[entry.content.type]++;

      // Taille
      totalSize += entry.content.size || 0;

      // Temps de traitement
      if (entry.processingTime) {
        totalProcessingTime += entry.processingTime;
        processedCount++;
      }
    }

    const averageProcessingTime = processedCount > 0 
      ? totalProcessingTime / processedCount 
      : 0;

    const successRate = entries.length > 0 
      ? statusCounts.success / entries.length 
      : 0;

    return {
      total: entries.length,
      pending: statusCounts.pending,
      sending: statusCounts.sending,
      success: statusCounts.success,
      error: statusCounts.error,
      totalSize,
      averageProcessingTime,
      successRate,
      byContentType,
      last24h: entries.filter(e => e.timestamp >= last24h).length,
      last7days: entries.filter(e => e.timestamp >= last7days).length,
      last30days: entries.filter(e => e.timestamp >= last30days).length
    };
  }

  /**
   * Nettoyer l'historique selon des options
   */
  async cleanup(options: HistoryCleanupOptions): Promise<number> {
    if (!this.initialized) await this.initialize();

    const entries = Array.from(this.cache.values());
    let toDelete: HistoryEntry[] = [];

    // Filtre par âge
    if (options.olderThanDays) {
      const cutoffDate = Date.now() - (options.olderThanDays * 24 * 60 * 60 * 1000);
      toDelete = entries.filter(e => e.timestamp < cutoffDate);
    }

    // Filtre par statut
    if (options.status && options.status.length > 0) {
      toDelete = toDelete.length > 0 
        ? toDelete.filter(e => options.status!.includes(e.status))
        : entries.filter(e => options.status!.includes(e.status));
    }

    // Garder les succès si demandé
    if (options.keepSuccessful) {
      toDelete = toDelete.filter(e => e.status !== 'success');
    }

    // Limite du nombre d'entrées
    if (options.maxEntries && entries.length > options.maxEntries) {
      const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
      const excess = sorted.slice(0, entries.length - options.maxEntries);
      toDelete = [...toDelete, ...excess];
    }

    // Supprimer les doublons
    const uniqueToDelete = Array.from(new Set(toDelete.map(e => e.id)))
      .map(id => entries.find(e => e.id === id)!)
      .filter(Boolean);

    for (const entry of uniqueToDelete) {
      this.cache.delete(entry.id);
    }

    if (uniqueToDelete.length > 0) {
      await this.persist();
    }

    return uniqueToDelete.length;
  }

  /**
   * Rechercher dans l'historique
   */
  async search(query: string, filter?: HistoryFilter): Promise<HistoryEntry[]> {
    if (!this.initialized) await this.initialize();

    let entries = Array.from(this.cache.values());

    // Appliquer le filtre d'abord
    if (filter) {
      entries = this.applyFilter(entries, filter);
    }

    // Recherche textuelle
    const searchQuery = query.toLowerCase();
    const results = entries.filter(entry => {
      return (
        entry.content.preview.toLowerCase().includes(searchQuery) ||
        entry.target.pageTitle.toLowerCase().includes(searchQuery) ||
        (entry.content.fileName && entry.content.fileName.toLowerCase().includes(searchQuery)) ||
        (entry.error && entry.error.toLowerCase().includes(searchQuery))
      );
    });

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Exporter l'historique
   */
  async export(filter?: HistoryFilter): Promise<string> {
    if (!this.initialized) await this.initialize();

    const entries = await this.getAll(filter);
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalEntries: entries.length,
      entries
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importer l'historique
   */
  async import(data: string): Promise<number> {
    if (!this.initialized) await this.initialize();

    try {
      const importData = JSON.parse(data);
      
      if (!importData.entries || !Array.isArray(importData.entries)) {
        throw new Error('Format d\'import invalide');
      }

      let imported = 0;
      let skipped = 0;

      for (const entry of importData.entries) {
        if (this.validateEntry(entry) && !this.cache.has(entry.id)) {
          this.cache.set(entry.id, entry);
          imported++;
        } else {
          skipped++;
        }
      }

      if (imported > 0) {
        await this.persist();
      }

      console.log(`[HISTORY] Imported ${imported} entries (${skipped} skipped)`);
      return imported;
    } catch (error) {
      throw new Error(`Erreur d'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Obtenir la taille du stockage
   */
  async getStorageSize(): Promise<number> {
    try {
      const stats = await fs.stat(this.historyFile);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Optimiser le stockage
   */
  async optimize(): Promise<void> {
    if (!this.initialized) await this.initialize();

    // Nettoyer les entrées expirées/invalides
    const entries = Array.from(this.cache.values());
    let cleaned = 0;

    for (const entry of entries) {
      if (!this.validateEntry(entry)) {
        // entry.id existe car entry vient du cache qui contient des HistoryEntry valides
        this.cache.delete((entry as HistoryEntry).id);
        cleaned++;
      }
    }

    // Forcer la persistance
    await this.persist();

    console.log(`[HISTORY] Optimized: cleaned ${cleaned} invalid entries`);
  }

  /**
   * Persister les données sur disque
   */
  private async persist(): Promise<void> {
    try {
      const entries = Array.from(this.cache.values());
      await fs.writeFile(this.historyFile, JSON.stringify(entries, null, 2));
    } catch (error) {
      console.error('[HISTORY] Persist error:', error);
      throw error;
    }
  }

  /**
   * Persistance avec debounce pour éviter trop d'écritures
   */
  private async debouncedPersist(): Promise<void> {
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }

    this.persistTimeout = setTimeout(async () => {
      await this.persist();
      this.persistTimeout = null;
    }, 1000); // 1 seconde de debounce
  }

  /**
   * Appliquer un filtre aux entrées
   */
  private applyFilter(entries: HistoryEntry[], filter: HistoryFilter): HistoryEntry[] {
    return entries.filter(entry => {
      if (filter.status && entry.status !== filter.status) return false;
      if (filter.pageId && entry.target.pageId !== filter.pageId) return false;
      if (filter.contentType && entry.content.type !== filter.contentType) return false;
      if (filter.workspaceId && entry.target.workspaceId !== filter.workspaceId) return false;
      if (filter.dateFrom && entry.timestamp < filter.dateFrom) return false;
      if (filter.dateTo && entry.timestamp > filter.dateTo) return false;
      
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matches = (
          entry.content.preview.toLowerCase().includes(query) ||
          entry.target.pageTitle.toLowerCase().includes(query) ||
          (entry.content.fileName && entry.content.fileName.toLowerCase().includes(query))
        );
        if (!matches) return false;
      }

      return true;
    });
  }

  /**
   * Valider une entrée d'historique
   */
  private validateEntry(entry: any): entry is HistoryEntry {
    return (
      entry &&
      typeof entry.id === 'string' &&
      typeof entry.timestamp === 'number' &&
      entry.content &&
      typeof entry.content.type === 'string' &&
      typeof entry.content.data === 'string' &&
      typeof entry.content.preview === 'string' &&
      entry.target &&
      typeof entry.target.pageId === 'string' &&
      typeof entry.target.pageTitle === 'string' &&
      typeof entry.status === 'string' &&
      ['pending', 'sending', 'success', 'error'].includes(entry.status)
    );
  }
}