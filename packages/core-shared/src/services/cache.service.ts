// packages/core-shared/src/services/cache.service.ts
export interface ICacheAdapter {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
}

export interface CacheStats {
    total: number;
    valid: number;
    expired: number;
    maxSize: number;
    usage: string;
}

export class CacheService {
    constructor(private adapter: ICacheAdapter) { }

    async get<T>(key: string): Promise<T | null> {
        return await this.adapter.get<T>(key);
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        return await this.adapter.set(key, value, ttl);
    }

    async delete(key: string): Promise<void> {
        return await this.adapter.delete(key);
    }

    async clear(): Promise<void> {
        return await this.adapter.clear();
    }

    async has(key: string): Promise<boolean> {
        return await this.adapter.has(key);
    }

    async keys(): Promise<string[]> {
        return await this.adapter.keys();
    }
}