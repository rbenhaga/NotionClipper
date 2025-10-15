// packages/adapters/electron/src/history.adapter.ts
import {
  HistoryEntry,
  HistoryFilter,
  HistoryStats
} from '@notion-clipper/core-shared';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

// Interface simple pour l'adapter electron
interface IHistoryAdapter {
  initialize(): Promise<void>;
  add(entry: HistoryEntry): Promise<void>;
  getAll(filter?: HistoryFilter): Promise<HistoryEntry[]>;
  getById(id: string): Promise<HistoryEntry | null>;
  update(id: string, updates: Partial<HistoryEntry>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(filter?: HistoryFilter): Promise<void>;
  getStats(): Promise<HistoryStats>;
}

/**
 * Electron History Adapter - Utilise le filesystem
 */
export class ElectronHistoryAdapter implements IHistoryAdapter {
  private historyPath: string;
  private cache: HistoryEntry[] = [];

  constructor() {
    const userDataPath = app.getPath('userData');
    this.historyPath = path.join(userDataPath, 'history.json');
  }

  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.historyPath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start with empty cache
      this.cache = [];
    }
  }

  async add(entry: HistoryEntry): Promise<void> {
    this.cache.unshift(entry);
    await this.save();
  }

  async getAll(filter?: HistoryFilter): Promise<HistoryEntry[]> {
    let entries = [...this.cache];
    
    if (filter) {
      if (filter.status) {
        entries = entries.filter(e => filter.status!.includes(e.status));
      }
      if (filter.type) {
        entries = entries.filter(e => filter.type!.includes(e.type));
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        entries = entries.filter(e => 
          e.content.preview.toLowerCase().includes(searchLower) ||
          e.page.title.toLowerCase().includes(searchLower)
        );
      }
    }
    
    return entries;
  }

  async getById(id: string): Promise<HistoryEntry | null> {
    return this.cache.find(e => e.id === id) || null;
  }

  async update(id: string, updates: Partial<HistoryEntry>): Promise<void> {
    const index = this.cache.findIndex(e => e.id === id);
    if (index !== -1) {
      this.cache[index] = { ...this.cache[index], ...updates };
      await this.save();
    }
  }

  async delete(id: string): Promise<void> {
    this.cache = this.cache.filter(e => e.id !== id);
    await this.save();
  }

  async clear(filter?: HistoryFilter): Promise<void> {
    if (filter) {
      const toKeep = await this.getAll(filter);
      this.cache = this.cache.filter(e => !toKeep.some(k => k.id === e.id));
    } else {
      this.cache = [];
    }
    await this.save();
  }

  async getStats(): Promise<HistoryStats> {
    const total = this.cache.length;
    const success = this.cache.filter(e => e.status === 'success').length;
    const failed = this.cache.filter(e => e.status === 'failed').length;
    const pending = this.cache.filter(e => e.status === 'pending' || e.status === 'sending').length;
    
    const byType: Record<string, number> = {};
    const byPage: Record<string, number> = {};
    let totalSize = 0;
    
    for (const entry of this.cache) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      byPage[entry.page.id] = (byPage[entry.page.id] || 0) + 1;
      if (entry.content.metadata?.fileSize) {
        totalSize += entry.content.metadata.fileSize;
      }
    }
    
    return {
      total,
      success,
      failed,
      pending,
      totalSize,
      byType,
      byPage
    };
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.historyPath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }
}