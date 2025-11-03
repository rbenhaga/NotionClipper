import type { IStorage } from '@notion-clipper/core-shared';
import Store from 'electron-store';

// Define the schema type for better type safety
interface StoreSchema {
  notion: {
    token: string | null;
    selectedPages: string[];
    lastSync: string | null;
  };
  app: {
    theme: string;
    shortcuts: {
      toggle: string;
      send: string;
    };
    autoStart: boolean;
    minimizeToTray: boolean;
  };
  cache: {
    pages: Record<string, any>;
    lastUpdate: string | null;
  };
}

/**
 * Electron Storage Adapter using electron-store
 * Implements IStorage interface for secure, encrypted storage
 */
export class ElectronStorageAdapter implements IStorage {
  private store: any;
  public readonly encrypted = true;

  constructor(options: { encryptionKey?: string; name?: string } = {}) {
    this.store = new Store({
      name: options.name || 'notion-clipper-storage',
      encryptionKey: options.encryptionKey,
      // Default values with proper typing
      defaults: {
        notion: {
          token: null,
          selectedPages: [],
          lastSync: null
        },
        app: {
          theme: 'system',
          shortcuts: {
            toggle: 'CommandOrControl+Shift+C',
            send: 'CommandOrControl+Enter'
          },
          autoStart: true,
          minimizeToTray: true
        },
        cache: {
          pages: {},
          lastUpdate: null
        }
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = this.store.get(key) as T;
      return value !== undefined ? value : null;
    } catch (error) {
      console.error(`❌ Error getting key "${key}":`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      this.store.set(key, value);
    } catch (error) {
      console.error(`❌ Error setting key "${key}":`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.store.delete(key);
    } catch (error) {
      console.error(`❌ Error removing key "${key}":`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      this.store.clear();
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      // electron-store doesn't have a direct keys() method
      // We need to traverse the store object
      const storeData = this.store.store;
      return this.getAllKeys(storeData);
    } catch (error) {
      console.error('❌ Error getting keys:', error);
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return this.store.has(key);
    } catch (error) {
      console.error(`❌ Error checking key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get nested configuration value
   */
  async getConfig<T>(path: string): Promise<T | null> {
    try {
      const value = this.store.get(path) as T;
      return value !== undefined ? value : null;
    } catch (error) {
      console.error(`❌ Error getting config "${path}":`, error);
      return null;
    }
  }

  /**
   * Set nested configuration value
   */
  async setConfig<T>(path: string, value: T): Promise<void> {
    try {
      // Si la valeur est undefined ou null, supprimer la clé
      if (value === undefined || value === null) {
        if (this.store.has(path)) {
          this.store.delete(path);
        }
        return;
      }
      
      this.store.set(path, value);
    } catch (error) {
      console.error(`❌ Error setting config "${path}":`, error);
      throw error;
    }
  }

  /**
   * Watch for changes to a specific key
   */
  watch(key: string, callback: (newValue: any, oldValue: any) => void): () => void {
    const unsubscribe = this.store.onDidChange(key, callback);
    return unsubscribe;
  }

  /**
   * Get store file path
   */
  getStorePath(): string {
    return this.store.path;
  }

  /**
   * Get store size in bytes
   */
  getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Recursively get all keys from nested object
   */
  private getAllKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          keys.push(...this.getAllKeys(obj[key], fullKey));
        }
      }
    }
    
    return keys;
  }
}
