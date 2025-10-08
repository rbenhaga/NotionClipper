// packages/core-shared/src/interfaces/cache.interface.ts

/**
 * Cache adapter interface
 */
export interface ICacheAdapter {
    /**
     * Get a cached value by key
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Set a value in cache with optional TTL
     */
    set<T>(key: string, value: T, ttl?: number): Promise<void>;

    /**
     * Delete a cached value by key
     */
    delete(key: string): Promise<void>;

    /**
     * Clear all cached values
     */
    clear(): Promise<void>;

    /**
     * Check if a key exists in cache
     */
    has(key: string): Promise<boolean>;

    /**
     * Get all cache keys
     */
    keys(): Promise<string[]>;

    /**
     * Initialize the cache (optional)
     */
    initialize?(): Promise<void>;

    /**
     * Persist cache to storage (optional)
     */
    persist?(): Promise<boolean>;

    /**
     * Get cache statistics (optional)
     */
    getStats?(): Promise<CacheStats>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    total: number;
    valid: number;
    expired: number;
    maxSize: number;
    usage: string;
    sizeKB?: string;
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T = any> {
    value: T;
    createdAt: number;
    lastAccessed: number;
    expiresAt: number | null;
}