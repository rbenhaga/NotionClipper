// storage.adapter.ts - Correction du typage chrome.storage
import type { IStorage } from '@notion-clipper/core';

/**
 * WebExtension Storage Adapter
 * Uses chrome.storage.local API for persistent storage
 */
export class WebExtensionStorageAdapter implements IStorage {
  private readonly storageArea = chrome.storage.local;

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.storageArea.get(key);
      return result[key] !== undefined ? result[key] : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.storageArea.set({ [key]: value });
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.storageArea.remove(key);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.storageArea.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const result: { [key: string]: any } = await this.storageArea.get(null) as any;
      return Object.keys(result);
    } catch (error) {
      console.error('Storage keys error:', error);
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async getScoped<T>(namespace: string): Promise<T | null> {
    return this.get<T>(namespace);
  }

  async setScoped<T>(namespace: string, value: T): Promise<void> {
    await this.set(namespace, value);
  }

  watch(key: string, callback: (oldValue: any, newValue: any) => void): () => void {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[key]) {
        callback(changes[key].oldValue, changes[key].newValue);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  async getStorageStats(): Promise<{ used: number; quota: number }> {
    try {
      const bytesInUse: number = await this.storageArea.getBytesInUse() as any;
      const quota = 5 * 1024 * 1024;
      
      return {
        used: bytesInUse || 0,
        quota
      };
    } catch (error) {
      console.error('Storage stats error:', error);
      return {
        used: 0,
        quota: 5 * 1024 * 1024
      };
    }
  }
}