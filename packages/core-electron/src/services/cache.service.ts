import Database from 'better-sqlite3';
import { LRUCache } from 'lru-cache';

export class CacheService {
    private db: Database.Database;
    private memCache: LRUCache<string, any>;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.memCache = new LRUCache({ max: 100 });
        this.init();
    }

    private init() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        timestamp INTEGER
      )
    `);
    }

    async get<T>(key: string): Promise<T | null> {
        // Check memory first
        if (this.memCache.has(key)) {
            return this.memCache.get(key) as T;
        }

        // Check database
        const row = this.db.prepare('SELECT value FROM cache WHERE key = ?').get(key) as any;
        if (row) {
            const value = JSON.parse(row.value);
            this.memCache.set(key, value);
            return value;
        }

        return null;
    }

    async set(key: string, value: any): Promise<void> {
        const json = JSON.stringify(value);
        this.db.prepare('INSERT OR REPLACE INTO cache (key, value, timestamp) VALUES (?, ?, ?)').run(
            key,
            json,
            Date.now()
        );
        this.memCache.set(key, value);
    }

    async clear(): Promise<void> {
        this.db.prepare('DELETE FROM cache').run();
        this.memCache.clear();
    }
}