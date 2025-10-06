import Database from 'better-sqlite3';
import { NotionPage } from '@notion-clipper/core-shared';

export interface CacheEntry {
  key: string;
  value: string;
  timestamp: number;
}

export class CacheService {
  private db: Database.Database;

  constructor(dbPath: string = './cache.db') {
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON cache(timestamp);
      CREATE INDEX IF NOT EXISTS idx_pages_timestamp ON pages(timestamp);
    `);
  }

  set(key: string, value: any, ttl?: number): void {
    const timestamp = Date.now();
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO cache (key, value, timestamp) VALUES (?, ?, ?)'
    );
    stmt.run(key, JSON.stringify(value), timestamp);
  }

  get<T>(key: string, maxAge?: number): T | null {
    const stmt = this.db.prepare(
      'SELECT value, timestamp FROM cache WHERE key = ?'
    );
    const row = stmt.get(key) as CacheEntry | undefined;

    if (!row) return null;

    if (maxAge && Date.now() - row.timestamp > maxAge) {
      this.delete(key);
      return null;
    }

    return JSON.parse(row.value) as T;
  }

  delete(key: string): void {
    const stmt = this.db.prepare('DELETE FROM cache WHERE key = ?');
    stmt.run(key);
  }

  clear(): void {
    this.db.exec('DELETE FROM cache');
  }

  // Pages cache
  cachePages(pages: NotionPage[]): void {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO pages (id, data, timestamp) VALUES (?, ?, ?)'
    );
    const timestamp = Date.now();

    const transaction = this.db.transaction(() => {
      for (const page of pages) {
        stmt.run(page.id, JSON.stringify(page), timestamp);
      }
    });

    transaction();
  }

  getCachedPages(maxAge: number = 5 * 60 * 1000): NotionPage[] {
    const stmt = this.db.prepare(
      'SELECT data FROM pages WHERE timestamp > ?'
    );
    const minTimestamp = Date.now() - maxAge;
    const rows = stmt.all(minTimestamp) as { data: string }[];

    return rows.map(row => JSON.parse(row.data));
  }

  close(): void {
    this.db.close();
  }
}