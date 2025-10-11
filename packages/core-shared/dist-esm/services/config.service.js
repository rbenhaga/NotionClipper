export class ConfigService {
    constructor(adapter) {
        this.adapter = adapter;
    }
    async getAll() {
        return await this.adapter.getAll();
    }
    async get(key) {
        return await this.adapter.get(key);
    }
    async set(key, value) {
        return await this.adapter.set(key, value);
    }
    async getNotionToken() {
        return await this.adapter.getNotionToken();
    }
    async setNotionToken(token) {
        return await this.adapter.setNotionToken(token);
    }
    async getFavorites() {
        return await this.adapter.getFavorites();
    }
    async addFavorite(pageId) {
        return await this.adapter.addFavorite(pageId);
    }
    async removeFavorite(pageId) {
        return await this.adapter.removeFavorite(pageId);
    }
    async isConfigured() {
        return await this.adapter.isConfigured();
    }
    async validate() {
        return await this.adapter.validate();
    }
}
