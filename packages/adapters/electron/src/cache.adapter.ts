// packages/adapters/electron/src/cache.adapter.ts
import type { ICacheAdapter, CacheStats, CacheEntry } from '@notion-clipper/core-shared';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Cache key version prefix to avoid migration issues
 */
const CACHE_VERSION = 'v2';

/**
 * Electron Cache Adapter using LRU in-memory cache + disk persistence
 * 
 * 🔧 SCOPING: Supports user/workspace scoping via:
 * - getScopedKey(scopeKey, baseKey) - creates scoped cache key
 * - getScoped(scopeKey, baseKey) - get with scoping
 * - setScoped(scopeKey, baseKey, value, ttl) - set with scoping
 * - clearScope(scopeKey) - clear all keys for a scope
 */
export class ElectronCacheAdapter implements ICacheAdapter {
    private maxSize: number;
    private ttl: number;
    private cachePath: string;
    private cacheFile: string;
    private cache: Map<string, CacheEntry>;
    private initialized = false;

    constructor(options: { maxSize?: number; ttl?: number } = {}) {
        this.maxSize = options.maxSize || 2000; // Max entries
        this.ttl = options.ttl || 3600000; // 1 hour in ms
        this.cachePath = path.join(app.getPath('userData'), 'cache');
        this.cacheFile = path.join(this.cachePath, 'cache.json');
        this.cache = new Map();
    }

    // ============================================
    // SCOPED CACHE METHODS (for user/workspace isolation)
    // ============================================

    /**
     * Create a scoped cache key
     * @param scopeKey - The scope (e.g., "user:123:ws:456")
     * @param baseKey - The base key (e.g., "notion:pages")
     * @returns Versioned scoped key (e.g., "v2:user:123:ws:456:notion:pages")
     */
    getScopedKey(scopeKey: string, baseKey: string): string {
        if (!scopeKey) {
            // No scope = global key (still versioned)
            return `${CACHE_VERSION}:${baseKey}`;
        }
        return `${CACHE_VERSION}:${scopeKey}:${baseKey}`;
    }

    /**
     * Get a value from cache with scoping
     */
    async getScoped<T>(scopeKey: string, baseKey: string): Promise<T | null> {
        const key = this.getScopedKey(scopeKey, baseKey);
        return this.get<T>(key);
    }

    /**
     * Set a value in cache with scoping
     */
    async setScoped<T>(scopeKey: string, baseKey: string, value: T, ttl?: number): Promise<void> {
        const key = this.getScopedKey(scopeKey, baseKey);
        return this.set(key, value, ttl);
    }

    /**
     * Delete a scoped key
     */
    async deleteScoped(scopeKey: string, baseKey: string): Promise<void> {
        const key = this.getScopedKey(scopeKey, baseKey);
        return this.delete(key);
    }

    /**
     * Clear all cache entries for a specific scope
     * @param scopeKey - The scope to clear (e.g., "user:123:ws:456")
     */
    async clearScope(scopeKey: string): Promise<number> {
        if (!this.initialized) await this.initialize();

        const prefix = `${CACHE_VERSION}:${scopeKey}:`;
        let cleared = 0;

        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                cleared++;
            }
        }

        if (cleared > 0) {
            await this.persist();
            console.log(`[CACHE] 🧹 Cleared ${cleared} entries for scope: ${scopeKey}`);
        }

        return cleared;
    }

    /**
     * Get all keys for a specific scope
     */
    async keysForScope(scopeKey: string): Promise<string[]> {
        if (!this.initialized) await this.initialize();

        const prefix = `${CACHE_VERSION}:${scopeKey}:`;
        const keys: string[] = [];

        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                // Return the base key (without version and scope prefix)
                keys.push(key.slice(prefix.length));
            }
        }

        return keys;
    }

    /**
     * Initialize cache - load from disk
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Create cache directory
            await fs.mkdir(this.cachePath, { recursive: true });

            // Load cache from file
            try {
                const data = await fs.readFile(this.cacheFile, 'utf8');
                const cacheData = JSON.parse(data);

                const now = Date.now();
                let loaded = 0;
                let expired = 0;

                for (const [key, entry] of Object.entries<CacheEntry>(cacheData)) {
                    if (!entry.expiresAt || entry.expiresAt > now) {
                        this.cache.set(key, entry);
                        loaded++;
                    } else {
                        expired++;
                    }
                }

                console.log(`[CACHE] Loaded: ${loaded} entries (${expired} expired)`);
            } catch {
                console.log('[CACHE] Initializing empty cache');
            }

            this.initialized = true;
        } catch (error) {
            console.error('[CACHE] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Persist cache to disk
     */
    async persist(): Promise<boolean> {
        try {
            const cacheObject: Record<string, CacheEntry> = {};
            for (const [key, value] of this.cache.entries()) {
                cacheObject[key] = value;
            }

            await fs.writeFile(this.cacheFile, JSON.stringify(cacheObject, null, 2));
            return true;
        } catch (error) {
            console.error('[CACHE] Persist error:', error);
            return false;
        }
    }

    /**
     * Get a value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.initialized) await this.initialize();

        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check TTL
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            await this.persist();
            return null;
        }

        // Update last accessed for LRU
        entry.lastAccessed = Date.now();
        return entry.value as T;
    }

    /**
     * Set a value in cache
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        if (!this.initialized) await this.initialize();

        const now = Date.now();
        const effectiveTtl = ttl !== undefined ? ttl : this.ttl;

        const entry: CacheEntry<T> = {
            value,
            createdAt: now,
            lastAccessed: now,
            expiresAt: effectiveTtl ? now + effectiveTtl : null
        };

        this.cache.set(key, entry);

        // LRU eviction if over max size
        if (this.cache.size > this.maxSize) {
            await this.evictLRU();
        }

        await this.persist();
    }

    /**
     * Delete a key from cache
     */
    async delete(key: string): Promise<void> {
        if (!this.initialized) await this.initialize();

        this.cache.delete(key);
        await this.persist();
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        if (!this.initialized) await this.initialize();

        this.cache.clear();
        await this.persist();
    }

    /**
     * Check if key exists
     */
    async has(key: string): Promise<boolean> {
        if (!this.initialized) await this.initialize();

        const entry = this.cache.get(key);
        if (!entry) return false;

        // Check TTL
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Get all cache keys
     */
    async keys(): Promise<string[]> {
        if (!this.initialized) await this.initialize();

        return Array.from(this.cache.keys());
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        if (!this.initialized) await this.initialize();

        const now = Date.now();
        let expired = 0;
        let valid = 0;
        let totalSize = 0;

        for (const [, entry] of this.cache.entries()) {
            if (entry.expiresAt && entry.expiresAt < now) {
                expired++;
            } else {
                valid++;
            }

            totalSize += JSON.stringify(entry).length;
        }

        return {
            total: this.cache.size,
            valid,
            expired,
            maxSize: this.maxSize,
            usage: ((valid / this.maxSize) * 100).toFixed(2) + '%',
            sizeKB: (totalSize / 1024).toFixed(2)
        };
    }

    /**
     * Evict least recently used entries
     */
    private async evictLRU(): Promise<void> {
        const entries = Array.from(this.cache.entries());

        // Sort by lastAccessed (oldest first)
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        // Remove oldest 10%
        const toRemove = Math.ceil(this.maxSize * 0.1);

        for (let i = 0; i < toRemove && i < entries.length; i++) {
            this.cache.delete(entries[i][0]);
        }

        console.log(`[CACHE] Evicted ${toRemove} LRU entries`);
    }

    /**
     * Force clean cache (compatibility method)
     */
    async forceCleanCache(): Promise<boolean> {
        console.log('[CACHE] Force cleaning...');
        await this.clear();

        try {
            await fs.unlink(this.cacheFile);
            console.log('[CACHE] Cache file deleted');
        } catch {
            // File doesn't exist, OK
        }

        return true;
    }
}