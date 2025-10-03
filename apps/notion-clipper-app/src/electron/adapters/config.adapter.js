const Store = require('electron-store');
const crypto = require('crypto');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

class ElectronConfigAdapter {
  constructor() {
    const encryptionKey = this.getOrCreateEncryptionKey();
    
    try {
      this.store = new Store({
        name: 'notion-clipper-config',
        encryptionKey,
        schema: {
          notionToken: { type: 'string', default: '' },
          previewPageId: { type: 'string', default: '' },
          theme: { type: 'string', default: 'dark' },
          favorites: { type: 'array', default: [] },
          onboardingCompleted: { type: 'boolean', default: false },
          enablePolling: { type: 'boolean', default: true },
          pollingInterval: { type: 'number', default: 30000 },
          cacheSize: { type: 'number', default: 2000 }
        }
      });
      
      this.store.get('theme');
      console.log('[OK] Config store loaded with encryption');
      
    } catch (error) {
      console.warn('[WARN] Config corrupted, recreating:', error.message);
      
      const configPath = path.join(app.getPath('userData'), 'notion-clipper-config.json');
      
      try {
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
          console.log('[OK] Removed corrupted config file');
        }
      } catch (e) {
        console.error('[ERROR] Could not remove config:', e);
      }
      
      this.store = new Store({
        name: 'notion-clipper-config',
        encryptionKey,
        schema: {
          notionToken: { type: 'string', default: '' },
          previewPageId: { type: 'string', default: '' },
          theme: { type: 'string', default: 'dark' },
          favorites: { type: 'array', default: [] },
          onboardingCompleted: { type: 'boolean', default: false },
          enablePolling: { type: 'boolean', default: true },
          pollingInterval: { type: 'number', default: 30000 },
          cacheSize: { type: 'number', default: 2000 }
        }
      });
      
      console.log('[OK] Config store recreated');
    }
  }

  getOrCreateEncryptionKey() {
    const keyPath = path.join(app.getPath('userData'), '.enc-key');
    
    try {
      if (fs.existsSync(keyPath)) {
        console.log('[OK] Using existing encryption key');
        return fs.readFileSync(keyPath, 'utf8');
      }
      
      const key = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
      console.log('[OK] Generated new encryption key');
      return key;
    } catch (error) {
      console.error('[ERROR] Error with encryption key:', error);
      return crypto.randomBytes(32).toString('hex');
    }
  }

  async get(key) {
    try {
      const value = this.store.get(key);
      return value !== undefined ? value : null;
    } catch (error) {
      console.error(`[ERROR] Error getting config "${key}":`, error);
      return null;
    }
  }

  async set(key, value) {
    try {
      this.store.set(key, value);
      return true;
    } catch (error) {
      console.error(`[ERROR] Error setting config "${key}":`, error);
      return false;
    }
  }

  async remove(key) {
    try {
      this.store.delete(key);
      return true;
    } catch (error) {
      console.error(`[ERROR] Error removing config "${key}":`, error);
      return false;
    }
  }

  async getAll() {
    try {
      return this.store.store;
    } catch (error) {
      console.error('[ERROR] Error getting all config:', error);
      return {};
    }
  }

  async reset() {
    try {
      this.store.clear();
      return true;
    } catch (error) {
      console.error('[ERROR] Error resetting config:', error);
      return false;
    }
  }

  async has(key) {
    return this.store.has(key);
  }

  async getNotionToken() {
    return await this.get('notionToken');
  }

  async setNotionToken(token) {
    return await this.set('notionToken', token);
  }

  async isConfigured() {
    const token = await this.get('notionToken');
    return token && token.length > 0;
  }

  async isFirstRun() {
    const completed = await this.get('onboardingCompleted');
    return !completed;
  }

  async getFavorites() {
    return await this.get('favorites') || [];
  }

  async addFavorite(pageId) {
    const favorites = await this.getFavorites();
    if (!favorites.includes(pageId)) {
      favorites.push(pageId);
      return await this.set('favorites', favorites);
    }
    return true;
  }

  async removeFavorite(pageId) {
    const favorites = await this.getFavorites();
    const filtered = favorites.filter(id => id !== pageId);
    return await this.set('favorites', filtered);
  }
  
}

module.exports = ElectronConfigAdapter;