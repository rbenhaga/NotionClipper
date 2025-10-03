import Store from 'electron-store';
/**
 * Electron Storage Adapter using electron-store
 * Implements IStorage interface for secure, encrypted storage
 */
export class ElectronStorageAdapter {
    // Use generic Record<string, any> for flexibility while ensuring defaults match StoreSchema
    store;
    encrypted = true;
    constructor(options = {}) {
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
    async get(key) {
        try {
            const value = this.store.get(key);
            return value !== undefined ? value : null;
        }
        catch (error) {
            console.error(`❌ Error getting key "${key}":`, error);
            return null;
        }
    }
    async set(key, value) {
        try {
            this.store.set(key, value);
        }
        catch (error) {
            console.error(`❌ Error setting key "${key}":`, error);
            throw error;
        }
    }
    async remove(key) {
        try {
            this.store.delete(key);
        }
        catch (error) {
            console.error(`❌ Error removing key "${key}":`, error);
            throw error;
        }
    }
    async clear() {
        try {
            this.store.clear();
        }
        catch (error) {
            console.error('❌ Error clearing storage:', error);
            throw error;
        }
    }
    async keys() {
        try {
            // electron-store doesn't have a direct keys() method
            // We need to traverse the store object
            const storeData = this.store.store;
            return this.getAllKeys(storeData);
        }
        catch (error) {
            console.error('❌ Error getting keys:', error);
            return [];
        }
    }
    async has(key) {
        try {
            return this.store.has(key);
        }
        catch (error) {
            console.error(`❌ Error checking key "${key}":`, error);
            return false;
        }
    }
    /**
     * Get nested configuration value
     */
    async getConfig(path) {
        try {
            const value = this.store.get(path);
            return value !== undefined ? value : null;
        }
        catch (error) {
            console.error(`❌ Error getting config "${path}":`, error);
            return null;
        }
    }
    /**
     * Set nested configuration value
     */
    async setConfig(path, value) {
        try {
            this.store.set(path, value);
        }
        catch (error) {
            console.error(`❌ Error setting config "${path}":`, error);
            throw error;
        }
    }
    /**
     * Watch for changes to a specific key
     */
    watch(key, callback) {
        const unsubscribe = this.store.onDidChange(key, callback);
        return unsubscribe;
    }
    /**
     * Get store file path
     */
    getStorePath() {
        return this.store.path;
    }
    /**
     * Get store size in bytes
     */
    getStoreSize() {
        return this.store.size;
    }
    /**
     * Recursively get all keys from nested object
     */
    getAllKeys(obj, prefix = '') {
        const keys = [];
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
//# sourceMappingURL=storage.adapter.js.map