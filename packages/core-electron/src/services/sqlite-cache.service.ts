// packages/core-electron/src/services/sqlite-cache.service.ts
// Alias to SimpleCacheService (no SQLite dependency)

import { SimpleCacheService } from './cache.service';

/**
 * SQLiteCacheService (now uses in-memory cache instead of SQLite)
 * This is an alias to SimpleCacheService to maintain backward compatibility
 * 
 * Note: This no longer uses SQLite due to pnpm compatibility issues
 * with native modules like better-sqlite3
 */
export class SQLiteCacheService extends SimpleCacheService {
    constructor(maxSize?: number, ttl?: number) {
        super(maxSize, ttl);
        console.log('[CACHE] Using in-memory cache (SQLite disabled for pnpm compatibility)');
    }
}