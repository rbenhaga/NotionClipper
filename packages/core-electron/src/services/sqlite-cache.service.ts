import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

/**
 * SQLite-based cache service
 * Electron-only (requires Node.js filesystem and native modules)
 */
export class SQLiteCacheService {
    private db: Database.Database | null = null;
    private readonly dbPath: string;

    constructor(dbPath?: string) {
        this.dbPath = dbPath || path.join(process.cwd(), 'cache.db');
    }

    /**
     * Initialize database
     */
    async initialize(): Promise<void> {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new Database(this.dbPath);

            // Create table if not exists
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    ttl INTEGER
                );
                CREATE INDEX IF NOT EXISTS idx_timestamp ON cache(timestamp);
            `);

            console.log('✅ SQLite cache initialized');
        } catch (error) {
            console.error('❌ Error initializing SQLite cache:', error);
            throw error;
        }
    }

    /**
     * Get cached value
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            const stmt = this.db.prepare('SELECT value, timestamp, ttl FROM cache WHERE key = ?');
            const row = stmt.get(key) as { value: string; timestamp: number; ttl: number | null } | undefined;

            if (!row) return null;

            // Check TTL
            if (row.ttl !== null) {
                const age = Date.now() - row.timestamp;
                if (age > row.ttl) {
                    // Expired
                    await this.remove(key);
                    return null;
                }
            }

            return JSON.parse(row.value) as T;
        } catch (error) {
            console.error(`❌ Error getting cache key "${key}":`, error);
            return null;
        }
    }

    /**
     * Set cached value
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO cache (key, value, timestamp, ttl)
                VALUES (?, ?, ?, ?)
            `);

            stmt.run(key, JSON.stringify(value), Date.now(), ttl || null);
        } catch (error) {
            console.error(`❌ Error setting cache key "${key}":`, error);
            throw error;
        }
    }

    /**
     * Remove cached value
     */
    async remove(key: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            const stmt = this.db.prepare('DELETE FROM cache WHERE key = ?');
            stmt.run(key);
        } catch (error) {
            console.error(`❌ Error removing cache key "${key}":`, error);
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            this.db.exec('DELETE FROM cache');
            console.log('✅ Cache cleared');
        } catch (error) {
            console.error('❌ Error clearing cache:', error);
            throw error;
        }
    }

    /**
     * Clean expired entries
     */
    async cleanExpired(): Promise<number> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            const stmt = this.db.prepare(`
                DELETE FROM cache 
                WHERE ttl IS NOT NULL 
                AND (? - timestamp) > ttl
            `);

            const result = stmt.run(Date.now());
            return result.changes;
        } catch (error) {
            console.error('❌ Error cleaning expired cache:', error);
            return 0;
        }
    }

    /**
     * Get all keys
     */
    async keys(): Promise<string[]> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            const stmt = this.db.prepare('SELECT key FROM cache');
            const rows = stmt.all() as { key: string }[];
            return rows.map(row => row.key);
        } catch (error) {
            console.error('❌ Error getting cache keys:', error);
            return [];
        }
    }

    /**
     * Close database
     */
    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('✅ SQLite cache closed');
        }
    }
}