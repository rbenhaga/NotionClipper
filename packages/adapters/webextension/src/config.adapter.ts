import type { IConfig } from '@notion-clipper/core';
import { WebExtensionStorageAdapter } from './storage.adapter';

/**
 * WebExtension Config Adapter
 * Manages configuration using chrome.storage
 */
export class WebExtensionConfigAdapter implements IConfig {
  private storage: WebExtensionStorageAdapter;
  private readonly configPrefix = 'config';

  constructor(storage?: WebExtensionStorageAdapter) {
    this.storage = storage || new WebExtensionStorageAdapter();
  }

  async get<T>(key: string): Promise<T | null> {
    return await this.storage.get<T>(`${this.configPrefix}.${key}`);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.storage.set(`${this.configPrefix}.${key}`, value);
  }

  async remove(key: string): Promise<void> {
    await this.storage.remove(`${this.configPrefix}.${key}`);
  }

  async getAll(): Promise<Record<string, any>> {
    const config = await this.storage.get(this.configPrefix);
    return config || {};
  }

  async reset(): Promise<void> {
    await this.storage.remove(this.configPrefix);
  }

  watch(key: string, callback: (value: any) => void): () => void {
    return this.storage.watch(`${this.configPrefix}.${key}`, (oldValue, newValue) => {
      callback(newValue);
    });
  }

  async validate(): Promise<boolean> {
    const token = await this.getNotionToken();
    return Boolean(token);
  }

  async getNotionToken(): Promise<string | null> {
    return await this.get<string>('notionToken');
  }

  async setNotionToken(token: string): Promise<void> {
    await this.set('notionToken', token);
  }

  async isConfigured(): Promise<boolean> {
    const token = await this.getNotionToken();
    return Boolean(token);
  }

  async isFirstRun(): Promise<boolean> {
    const firstRun = await this.get<boolean>('firstRun');
    return firstRun !== false;
  }

  async setFirstRunComplete(): Promise<void> {
    await this.set('firstRun', false);
  }

  async getFavorites(): Promise<string[]> {
    return (await this.get<string[]>('favorites')) || [];
  }

  async addFavorite(pageId: string): Promise<void> {
    const favorites = await this.getFavorites();
    if (!favorites.includes(pageId)) {
      await this.set('favorites', [...favorites, pageId]);
    }
  }

  async removeFavorite(pageId: string): Promise<void> {
    const favorites = await this.getFavorites();
    await this.set('favorites', favorites.filter(id => id !== pageId));
  }

  async toggleFavorite(pageId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    if (favorites.includes(pageId)) {
      await this.removeFavorite(pageId);
      return false;
    } else {
      await this.addFavorite(pageId);
      return true;
    }
  }

  async getUsageHistory(): Promise<Record<string, number>> {
    return (await this.get<Record<string, number>>('usageHistory')) || {};
  }

  async updateUsage(pageId: string): Promise<void> {
    const history = await this.getUsageHistory();
    history[pageId] = (history[pageId] || 0) + 1;
    await this.set('usageHistory', history);
  }

  async clearUsageHistory(): Promise<void> {
    await this.remove('usageHistory');
  }
}