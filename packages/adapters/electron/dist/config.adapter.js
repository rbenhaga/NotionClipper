"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronConfigAdapter = void 0;
const storage_adapter_1 = require("./storage.adapter");
/**
 * Electron Configuration Adapter
 * Implements IConfig interface using ElectronStorageAdapter
 */
class ElectronConfigAdapter {
    storage;
    configPrefix = 'config';
    constructor(storage) {
        this.storage = storage || new storage_adapter_1.ElectronStorageAdapter({ name: 'notion-clipper-config' });
    }
    async get(key) {
        return this.storage.getConfig(`${this.configPrefix}.${key}`);
    }
    async set(key, value) {
        await this.storage.setConfig(`${this.configPrefix}.${key}`, value);
    }
    async remove(key) {
        await this.storage.remove(`${this.configPrefix}.${key}`);
    }
    async getAll() {
        try {
            const config = await this.storage.get(this.configPrefix);
            return config || {};
        }
        catch (error) {
            console.error('❌ Error getting all config:', error);
            return {};
        }
    }
    async reset() {
        try {
            await this.storage.remove(this.configPrefix);
            // Set default values
            await this.setDefaults();
        }
        catch (error) {
            console.error('❌ Error resetting config:', error);
            throw error;
        }
    }
    watch(key, callback) {
        const fullKey = `${this.configPrefix}.${key}`;
        return this.storage.watch(fullKey, (newValue) => {
            callback(newValue);
        });
    }
    async validate() {
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
        }
        catch (error) {
            console.error('❌ Error validating config:', error);
            return false;
        }
    }
    // ✅ NOUVELLES MÉTHODES AJOUTÉES
    /**
     * Get Notion token
     */
    async getNotionToken() {
        return await this.get('notionToken');
    }
    /**
     * Set Notion token
     */
    async setNotionToken(token) {
        await this.set('notionToken', token);
    }
    /**
     * Check if configured
     */
    async isConfigured() {
        const token = await this.getNotionToken();
        return !!token && token.length > 0;
    }
    /**
     * Check if first run
     */
    async isFirstRun() {
        const completed = await this.get('onboardingCompleted');
        return !completed;
    }
    /**
     * Get favorites
     */
    async getFavorites() {
        return await this.get('favorites') || [];
    }
    /**
     * Add favorite
     */
    async addFavorite(pageId) {
        const favorites = await this.getFavorites();
        if (!favorites.includes(pageId)) {
            favorites.push(pageId);
            await this.set('favorites', favorites);
        }
    }
    /**
     * Remove favorite
     */
    async removeFavorite(pageId) {
        const favorites = await this.getFavorites();
        const filtered = favorites.filter(id => id !== pageId);
        await this.set('favorites', filtered);
    }
    /**
     * Set default configuration values
     */
    async setDefaults() {
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
    async getNotionConfig() {
        return {
            token: await this.get('notion.token'),
            selectedPages: await this.get('notion.selectedPages') || [],
            lastSync: await this.get('notion.lastSync')
        };
    }
    /**
     * Get app-specific configuration
     */
    async getAppConfig() {
        return {
            theme: await this.get('app.theme') || 'system',
            shortcuts: {
                toggle: await this.get('app.shortcuts.toggle') || 'CommandOrControl+Shift+C',
                send: await this.get('app.shortcuts.send') || 'CommandOrControl+Enter'
            },
            autoStart: await this.get('app.autoStart') ?? true,
            minimizeToTray: await this.get('app.minimizeToTray') ?? true,
            language: await this.get('app.language') || 'fr'
        };
    }
    /**
     * Get clipboard configuration
     */
    async getClipboardConfig() {
        return {
            watchInterval: await this.get('clipboard.watchInterval') || 1000,
            autoDetect: await this.get('clipboard.autoDetect') ?? true
        };
    }
    /**
     * Get parser configuration
     */
    async getParserConfig() {
        return {
            maxBlocksPerRequest: await this.get('parser.maxBlocksPerRequest') || 100,
            maxRichTextLength: await this.get('parser.maxRichTextLength') || 2000
        };
    }
}
exports.ElectronConfigAdapter = ElectronConfigAdapter;
//# sourceMappingURL=config.adapter.js.map