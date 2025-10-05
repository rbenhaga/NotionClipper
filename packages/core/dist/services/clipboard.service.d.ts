import { IClipboard, IStorage } from '../interfaces/index';
import type { ClipboardContent } from '../types/index';
import { EventEmitter } from 'eventemitter3';
/**
 * Core Clipboard Service with platform-agnostic business logic
 * Uses dependency injection for platform-specific implementations
 */
export declare class ClipboardService extends EventEmitter {
    private clipboard;
    private storage;
    private lastContent;
    private lastHash;
    private lastLoggedHash;
    private conversionCache;
    private readonly CACHE_MAX_SIZE;
    constructor(clipboard: IClipboard, storage: IStorage);
    /**
     * Get current clipboard content with enhanced detection and caching
     */
    getContent(): Promise<ClipboardContent | null>;
    /**
     * Set clipboard content
     */
    setContent(content: ClipboardContent): Promise<void>;
    /**
     * Check if clipboard content has changed
     */
    hasChanged(): Promise<boolean>;
    /**
     * Start watching clipboard changes
     */
    startWatching(interval?: number): () => void;
    /**
     * Clear clipboard
     */
    clear(): Promise<void>;
    /**
     * Get clipboard history from storage
     */
    getHistory(limit?: number): Promise<ClipboardContent[]>;
    /**
     * Save content to history
     */
    saveToHistory(content: ClipboardContent): Promise<void>;
    /**
     * Clear clipboard history
     */
    clearHistory(): Promise<void>;
    /**
     * Detect table delimiter (from memory optimization)
     */
    private detectTableDelimiter;
    private hashHTML;
    private calculateHash;
    private simpleStringHash;
    /**
     * Clear conversion cache
     */
    clearConversionCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
    };
}
//# sourceMappingURL=clipboard.service.d.ts.map