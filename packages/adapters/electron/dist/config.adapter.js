import { ElectronStorageAdapter } from './storage.adapter';
/**
 * Electron Configuration Adapter
 * Implements IConfig interface using ElectronStorageAdapter
 */
export class ElectronConfigAdapter {
    storage;
    configPrefix = 'config';
    constructor(storage) {
        this.storage = storage || new ElectronStorageAdapter({ name: 'notion-clipper-config' });
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
    async getNotionConfig() {
        return {
            token: await this.get('notion.token'),
            selectedPages: await this.get('notion.selectedPages') || [],
            lastSync: await this.get('notion.lastSync')
        };
    }
    /**
     * Set Notion token
     */
    async setNotionToken(token) {
        await this.set('notion.token', token);
    }
    /**
     * Get app-specific configuration
     */
    async getAppConfig() {
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
    async getClipboardConfig() {
        return {
            watchInterval: await this.get('clipboard.watchInterval') || 500,
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
//# sourceMappingURL=config.adapter.js.map