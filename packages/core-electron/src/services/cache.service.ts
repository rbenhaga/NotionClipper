// packages/core-electron/src/services/cache.service.ts
// Simple in-memory LRU cache (no SQLite dependency)

interface CacheEntry<T = any> {
    value: T;
    timestamp: number;
    expiresAt: number | null;
}

/**
 * Simple LRU Cache Service (No SQLite)
 * In-memory cache with TTL support
 */
export class SimpleCacheService {
    private cache: Map<string, CacheEntry>;
    private maxSize: number;
    private ttl: number;

    constructor(maxSize: number = 1000, ttl: number = 3600000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    /**
     * Get cached value
     */
    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    /**
     * Set cached value
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        // Check max size and remove oldest if needed
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        const expiresAt = ttl ? Date.now() + ttl : Date.now() + this.ttl;

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            expiresAt
        });
    }

    /**
     * Delete cached value
     */
    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        this.cache.clear();
    }

    /**
     * Check if key exists
     */
    async has(key: string): Promise<boolean> {
        const entry = this.cache.get(key);

        if (!entry) {
            return false;
        }

        // Check if expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Get all keys
     */
    async keys(): Promise<string[]> {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache stats
     */
    getStats(): {
        size: number;
        maxSize: number;
        ttl: number;
    } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl
        };
    }

    /**
     * Clean expired entries
     */
    cleanExpired(): void {
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt && now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}