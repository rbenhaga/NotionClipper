import type { IStorage } from '@notion-clipper/core';
/**
 * Electron Storage Adapter using electron-store
 * Implements IStorage interface for secure, encrypted storage
 */
export declare class ElectronStorageAdapter implements IStorage {
    private store;
    readonly encrypted = true;
    constructor(options?: {
        encryptionKey?: string;
        name?: string;
    });
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    /**
     * Get nested configuration value
     */
    getConfig<T>(path: string): Promise<T | null>;
    /**
     * Set nested configuration value
     */
    setConfig<T>(path: string, value: T): Promise<void>;
    /**
     * Watch for changes to a specific key
     */
    watch(key: string, callback: (newValue: any, oldValue: any) => void): () => void;
    /**
     * Get store file path
     */
    getStorePath(): string;
    /**
     * Get store size in bytes
     */
    getStoreSize(): number;
    /**
     * Recursively get all keys from nested object
     */
    private getAllKeys;
}
