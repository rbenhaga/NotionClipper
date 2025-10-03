import type { IConfig } from '@notion-clipper/core';
import { ElectronStorageAdapter } from './storage.adapter';
/**
 * Electron Configuration Adapter
 * Implements IConfig interface using ElectronStorageAdapter
 */
export declare class ElectronConfigAdapter implements IConfig {
    private storage;
    private readonly configPrefix;
    constructor(storage?: ElectronStorageAdapter);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    getAll(): Promise<Record<string, any>>;
    reset(): Promise<void>;
    watch(key: string, callback: (value: any) => void): () => void;
    validate(): Promise<boolean>;
    /**
     * Set default configuration values
     */
    private setDefaults;
    /**
     * Get Notion-specific configuration
     */
    getNotionConfig(): Promise<{
        token: string | null;
        selectedPages: string[];
        lastSync: string | null;
    }>;
    /**
     * Set Notion token
     */
    setNotionToken(token: string): Promise<void>;
    /**
     * Get app-specific configuration
     */
    getAppConfig(): Promise<{
        theme: string;
        shortcuts: Record<string, string>;
        autoStart: boolean;
        minimizeToTray: boolean;
        language: string;
    }>;
    /**
     * Get clipboard configuration
     */
    getClipboardConfig(): Promise<{
        watchInterval: number;
        autoDetect: boolean;
    }>;
    /**
     * Get parser configuration
     */
    getParserConfig(): Promise<{
        maxBlocksPerRequest: number;
        maxRichTextLength: number;
    }>;
}
