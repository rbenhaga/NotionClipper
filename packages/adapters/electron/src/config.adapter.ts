import type { IConfig } from '@notion-clipper/core';
import { ElectronStorageAdapter } from './storage.adapter';

/**
 * Electron Configuration Adapter
 * Implements IConfig interface using ElectronStorageAdapter
 */
export class ElectronConfigAdapter implements IConfig {
  private storage: ElectronStorageAdapter;
  private readonly configPrefix = 'config';

  constructor(storage?: ElectronStorageAdapter) {
    this.storage = storage || new ElectronStorageAdapter({ name: 'notion-clipper-config' });
  }

  async get<T>(key: string): Promise<T | null> {
    return this.storage.getConfig<T>(`${this.configPrefix}.${key}`);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.storage.setConfig(`${this.configPrefix}.${key}`, value);
  }

  async remove(key: string): Promise<void> {
    await this.storage.remove(`${this.configPrefix}.${key}`);
  }

  async getAll(): Promise<Record<string, any>> {
    try {
      const config = await this.storage.get(this.configPrefix);
      return config || {};
    } catch (error) {
      console.error('❌ Error getting all config:', error);
      return {};
    }
  }

  async reset(): Promise<void> {
    try {
      await this.storage.remove(this.configPrefix);
      // Set default values
      await this.setDefaults();
    } catch (error) {
      console.error('❌ Error resetting config:', error);
      throw error;
    }
  }

  watch(key: string, callback: (value: any) => void): () => void {
    const fullKey = `${this.configPrefix}.${key}`;
    return this.storage.watch(fullKey, (newValue) => {
      callback(newValue);
    });
  }

  async validate(): Promise<boolean> {
    try {
      const config = await this.getAll();
      
      // Basic validation - check required fields
      const requiredFields = ['notion.token'];
      
      for (const field of requiredFields) {
        const value = await this.get(field);
        if (!value) {
          console.warn(`⚠️ Missing required config field: ${field}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error validating config:', error);
      return false;
    }
  }

  /**
   * Set default configuration values
   */
  private async setDefaults(): Promise<void> {
    const defaults = {
      'notion.token': null,
      'notion.selectedPages': [],
      'notion.lastSync': null,
      'app.theme': 'system',
      'app.shortcuts.toggle': process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C',
      'app.shortcuts.send': process.platform === 'darwin' ? 'Cmd+Enter' : 'Ctrl+Enter',
      'app.autoStart': true,
      'app.minimizeToTray': true,
      'app.language': 'fr',
      'clipboard.watchInterval': 500,
      'clipboard.autoDetect': true,
      'parser.maxBlocksPerRequest': 100,
      'parser.maxRichTextLength': 2000,
      'cache.maxSize': 1000,
      'cache.ttl': 3600000 // 1 hour
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await this.get(key);
      if (existing === null) {
        await this.set(key, value);
      }
    }
  }

  /**
   * Get Notion-specific configuration
   */
  async getNotionConfig(): Promise<{
    token: string | null;
    selectedPages: string[];
    lastSync: string | null;
  }> {
    return {
      token: await this.get('notion.token'),
      selectedPages: await this.get('notion.selectedPages') || [],
      lastSync: await this.get('notion.lastSync')
    };
  }

  /**
   * Set Notion token
   */
  async setNotionToken(token: string): Promise<void> {
    await this.set('notion.token', token);
  }

  /**
   * Get app-specific configuration
   */
  async getAppConfig(): Promise<{
    theme: string;
    shortcuts: Record<string, string>;
    autoStart: boolean;
    minimizeToTray: boolean;
    language: string;
  }> {
    return {
      theme: await this.get('app.theme') || 'system',
      shortcuts: {
        toggle: await this.get('app.shortcuts.toggle') || (process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C'),
        send: await this.get('app.shortcuts.send') || (process.platform === 'darwin' ? 'Cmd+Enter' : 'Ctrl+Enter')
      },
      autoStart: await this.get('app.autoStart') ?? true,
      minimizeToTray: await this.get('app.minimizeToTray') ?? true,
      language: await this.get('app.language') || 'fr'
    };
  }

  /**
   * Get clipboard configuration
   */
  async getClipboardConfig(): Promise<{
    watchInterval: number;
    autoDetect: boolean;
  }> {
    return {
      watchInterval: await this.get('clipboard.watchInterval') || 500,
      autoDetect: await this.get('clipboard.autoDetect') ?? true
    };
  }

  /**
   * Get parser configuration
   */
  async getParserConfig(): Promise<{
    maxBlocksPerRequest: number;
    maxRichTextLength: number;
  }> {
    return {
      maxBlocksPerRequest: await this.get('parser.maxBlocksPerRequest') || 100,
      maxRichTextLength: await this.get('parser.maxRichTextLength') || 2000
    };
  }
}
