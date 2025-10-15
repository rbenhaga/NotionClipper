// packages/adapters/electron/src/queue.adapter.ts
import {
  QueueEntry,
  QueueStats
} from '@notion-clipper/core-shared';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

// Interface simple pour l'adapter queue
interface IQueueAdapter {
  initialize(): Promise<void>;
  add(entry: QueueEntry): Promise<void>;
  getAll(): Promise<QueueEntry[]>;
  getById(id: string): Promise<QueueEntry | null>;
  update(id: string, updates: Partial<QueueEntry>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<QueueStats>;
}

/**
 * Electron Queue Adapter - Persiste dans un fichier JSON
 */
export class ElectronQueueAdapter implements IQueueAdapter {
  private queuePath: string;
  private cache: QueueEntry[] = [];

  constructor() {
    const userDataPath = app.getPath('userData');
    this.queuePath = path.join(userDataPath, 'queue.json');
  }

  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.queuePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start with empty cache
      this.cache = [];
    }
  }

  async add(entry: QueueEntry): Promise<void> {
    // Insert based on priority
    if (entry.priority === 'high') {
      this.cache.unshift(entry);
    } else if (entry.priority === 'low') {
      this.cache.push(entry);
    } else {
      // Normal priority - insert before low priority items
      const firstLowIndex = this.cache.findIndex(e => e.priority === 'low');
      if (firstLowIndex !== -1) {
        this.cache.splice(firstLowIndex, 0, entry);
      } else {
        this.cache.push(entry);
      }
    }
    await this.save();
  }

  async getAll(): Promise<QueueEntry[]> {
    return [...this.cache];
  }

  async getById(id: string): Promise<QueueEntry | null> {
    return this.cache.find(e => e.id === id) || null;
  }

  async update(id: string, updates: Partial<QueueEntry>): Promise<void> {
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

  async clear(): Promise<void> {
    this.cache = [];
    await this.save();
  }

  async getStats(): Promise<QueueStats> {
    const total = this.cache.length;
    const queued = this.cache.filter(e => e.status === 'queued').length;
    const processing = this.cache.filter(e => e.status === 'processing').length;
    const retrying = this.cache.filter(e => e.status === 'retrying').length;
    const failed = this.cache.filter(e => e.status === 'failed').length;
    const completed = this.cache.filter(e => e.status === 'completed').length;
    
    return {
      total,
      queued,
      processing,
      retrying,
      failed,
      completed
    };
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.queuePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }
}