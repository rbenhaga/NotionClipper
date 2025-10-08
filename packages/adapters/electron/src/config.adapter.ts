import type { IConfig } from '@notion-clipper/core-shared';
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

  // ✅ NOUVELLES MÉTHODES AJOUTÉES

  /**
   * Get Notion token
   */
  async getNotionToken(): Promise<string | null> {
    return await this.get<string>('notionToken');
  }

  /**
   * Set Notion token
   */
  async setNotionToken(token: string): Promise<void> {
    await this.set('notionToken', token);
  }

  /**
   * Check if configured
   */
  async isConfigured(): Promise<boolean> {
    const token = await this.getNotionToken();
    return !!token && token.length > 0;
  }

  /**
   * Check if first run
   */
  async isFirstRun(): Promise<boolean> {
    const completed = await this.get<boolean>('onboardingCompleted');
    return !completed;
  }

  /**
   * Get favorites
   */
  async getFavorites(): Promise<string[]> {
    return await this.get<string[]>('favorites') || [];
  }

  /**
   * Add favorite
   */
  async addFavorite(pageId: string): Promise<void> {
    const favorites = await this.getFavorites();
    if (!favorites.includes(pageId)) {
      favorites.push(pageId);
      await this.set('favorites', favorites);
    }
  }

  /**
   * Remove favorite
   */
  async removeFavorite(pageId: string): Promise<void> {
    const favorites = await this.getFavorites();
    const filtered = favorites.filter(id => id !== pageId);
    await this.set('favorites', filtered);
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
      'clipboard.watchInterval': 1000,
      'clipboard.autoDetect': true,
      'parser.maxBlocksPerRequest': 100,
      'parser.maxRichTextLength': 2000
    };

    for (const [key, value] of Object.entries(defaults)) {
      await this.set(key, value);
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
      token: await this.get<string>('notion.token'),
      selectedPages: await this.get<string[]>('notion.selectedPages') || [],
      lastSync: await this.get<string>('notion.lastSync')
    };
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
      theme: await this.get<string>('app.theme') || 'system',
      shortcuts: {
        toggle: await this.get<string>('app.shortcuts.toggle') || 'CommandOrControl+Shift+C',
        send: await this.get<string>('app.shortcuts.send') || 'CommandOrControl+Enter'
      },
      autoStart: await this.get<boolean>('app.autoStart') ?? true,
      minimizeToTray: await this.get<boolean>('app.minimizeToTray') ?? true,
      language: await this.get<string>('app.language') || 'fr'
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
      watchInterval: await this.get<number>('clipboard.watchInterval') || 1000,
      autoDetect: await this.get<boolean>('clipboard.autoDetect') ?? true
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
      maxBlocksPerRequest: await this.get<number>('parser.maxBlocksPerRequest') || 100,
      maxRichTextLength: await this.get<number>('parser.maxRichTextLength') || 2000
    };
  }
}