export class CacheService {
    constructor(adapter) {
        this.adapter = adapter;
    }
    async get(key) {
        return await this.adapter.get(key);
    }
    async set(key, value, ttl) {
        return await this.adapter.set(key, value, ttl);
    }
    async delete(key) {
        return await this.adapter.delete(key);
    }
    async clear() {
        return await this.adapter.clear();
    }
    async has(key) {
        return await this.adapter.has(key);
    }
    async keys() {
        return await this.adapter.keys();
    }
}
