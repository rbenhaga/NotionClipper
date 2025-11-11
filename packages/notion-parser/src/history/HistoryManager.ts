// packages/notion-parser/src/history/HistoryManager.ts
import { EventEmitter } from 'eventemitter3';
import type { FileUploadResult } from '../utils/FileUploadHandler';
import type { NotionBlock } from '../types';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  content: {
    type: 'text' | 'image' | 'file' | 'html' | 'markdown';
    data: string;
    preview: string;
    size?: number;
  };
  target: {
    pageId: string;
    pageTitle: string;
    pageIcon?: string;
  };
  status: 'pending' | 'sending' | 'success' | 'error';
  error?: string;
  blocksCount?: number;
  retryCount?: number;
  uploadResult?: FileUploadResult;
  blocks?: NotionBlock[];
}

export interface HistoryStats {
  total: number;
  pending: number;
  success: number;
  error: number;
  totalSize: number;
}

export interface HistoryFilter {
  status?: HistoryEntry['status'];
  type?: HistoryEntry['content']['type'];
  pageId?: string;
  dateFrom?: number;
  dateTo?: number;
}

/**
 * Gestionnaire d'historique des envois
 */
export class HistoryManager extends EventEmitter {
  private entries: Map<string, HistoryEntry> = new Map();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    super();
    this.maxEntries = maxEntries;
  }

  /**
   * Ajouter une entrée à l'historique
   */
  add(entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = this.generateId();
    
    const historyEntry: HistoryEntry = {
      id,
      timestamp: Date.now(),
      retryCount: 0,
      ...entry
    };

    this.entries.set(id, historyEntry);
    this.emit('entryAdded', historyEntry);

    // Nettoyer si nécessaire
    this.cleanup();

    return id;
  }

  /**
   * Mettre à jour une entrée
   */
  update(id: string, updates: Partial<HistoryEntry>): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    Object.assign(entry, updates);
    this.emit('entryUpdated', entry);
    return true;
  }

  /**
   * Obtenir une entrée par ID
   */
  get(id: string): HistoryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Obtenir toutes les entrées avec filtres optionnels
   */
  getAll(filter?: HistoryFilter): HistoryEntry[] {
    let entries = Array.from(this.entries.values());

    if (filter) {
      if (filter.status) {
        entries = entries.filter(entry => entry.status === filter.status);
      }
      
      if (filter.type) {
        entries = entries.filter(entry => entry.content.type === filter.type);
      }
      
      if (filter.pageId) {
        entries = entries.filter(entry => entry.target.pageId === filter.pageId);
      }
      
      if (filter.dateFrom) {
        entries = entries.filter(entry => entry.timestamp >= filter.dateFrom!);
      }
      
      if (filter.dateTo) {
        entries = entries.filter(entry => entry.timestamp <= filter.dateTo!);
      }
    }

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Supprimer une entrée
   */
  delete(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    this.entries.delete(id);
    this.emit('entryDeleted', entry);
    return true;
  }

  /**
   * Réessayer une entrée échouée
   */
  retry(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry || entry.status !== 'error') return false;

    entry.status = 'pending';
    entry.error = undefined;
    entry.retryCount = (entry.retryCount || 0) + 1;

    this.emit('entryRetried', entry);
    return true;
  }

  /**
   * Obtenir les statistiques
   */
  getStats(): HistoryStats {
    const entries = Array.from(this.entries.values());
    
    return {
      total: entries.length,
      pending: entries.filter(entry => entry.status === 'pending').length,
      success: entries.filter(entry => entry.status === 'success').length,
      error: entries.filter(entry => entry.status === 'error').length,
      totalSize: entries.reduce((sum, entry) => sum + (entry.content.size || 0), 0)
    };
  }

  /**
   * Vider l'historique
   */
  clear(): void {
    this.entries.clear();
    this.emit('cleared');
  }

  /**
   * Exporter l'historique
   */
  export(): HistoryEntry[] {
    return this.getAll();
  }

  /**
   * Importer l'historique
   */
  import(entries: HistoryEntry[]): void {
    this.entries.clear();
    
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
    
    this.emit('imported', entries.length);
  }

  /**
   * Nettoyer les anciennes entrées
   */
  private cleanup(): void {
    if (this.entries.size <= this.maxEntries) return;

    const entries = Array.from(this.entries.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    const toDelete = entries.slice(0, this.entries.size - this.maxEntries);
    
    for (const entry of toDelete) {
      this.entries.delete(entry.id);
    }

    if (toDelete.length > 0) {
      this.emit('cleaned', toDelete.length);
    }
  }

  /**
   * Générer un ID unique
   */
  private generateId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Instance globale du gestionnaire d'historique
 */
export const globalHistoryManager = new HistoryManager();