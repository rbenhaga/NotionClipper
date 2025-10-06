/**
 * IndexedDB-based storage service
 * Web-compatible (no Node.js modules)
 */
export class IndexedDBStorageService {
    private dbName: string;
    private storeName: string;
    private db: IDBDatabase | null = null;

    constructor(dbName: string = 'NotionClipperCache', storeName: string = 'cache') {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    /**
     * Initialize IndexedDB
     */
    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'key' });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Get cached value
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(key);

            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    resolve(null);
                    return;
                }

                // Check TTL
                if (result.ttl !== null && result.ttl !== undefined) {
                    const age = Date.now() - result.timestamp;
                    if (age > result.ttl) {
                        this.remove(key);
                        resolve(null);
                        return;
                    }
                }

                resolve(result.value as T);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get key "${key}"`));
            };
        });
    }

    /**
     * Set cached value
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            const data = {
                key,
                value,
                timestamp: Date.now(),
                ttl: ttl || null
            };

            const request = objectStore.put(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to set key "${key}"`));
        });
    }

    /**
     * Remove cached value
     */
    async remove(key: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to remove key "${key}"`));
        });
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.clear();

            request.onsuccess = () => {
                console.log('✅ Cache cleared');
                resolve();
            };

            request.onerror = () => reject(new Error('Failed to clear cache'));
        });
    }

    /**
     * Clean expired entries
     */
    async cleanExpired(): Promise<number> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.openCursor();

            let deletedCount = 0;
            const now = Date.now();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;

                if (cursor) {
                    const data = cursor.value;

                    if (data.ttl !== null && data.ttl !== undefined) {
                        const age = now - data.timestamp;
                        if (age > data.ttl) {
                            cursor.delete();
                            deletedCount++;
                        }
                    }

                    cursor.continue();
                } else {
                    resolve(deletedCount);
                }
            };

            request.onerror = () => reject(new Error('Failed to clean expired entries'));
        });
    }

    /**
     * Close database
     */
    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('✅ IndexedDB closed');
        }
    }
}