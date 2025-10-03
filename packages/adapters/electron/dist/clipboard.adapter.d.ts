import type { IClipboard, ClipboardContent } from '@notion-clipper/core';
import { EventEmitter } from 'events';
/**
 * Electron Clipboard Adapter with native watching capability
 * Implements IClipboard interface with optimizations from memory
 */
export declare class ElectronClipboardAdapter extends EventEmitter implements IClipboard {
    private watchInterval;
    private isWatching;
    private lastHash;
    private lastLoggedHash;
    constructor();
    read(): Promise<ClipboardContent | null>;
    write(content: ClipboardContent): Promise<void>;
    hasContent(): Promise<boolean>;
    getAvailableFormats(): Promise<string[]>;
    clear(): Promise<void>;
    /**
     * Watch for clipboard changes with native surveillance (from memory optimization)
     */
    watch(callback: (content: ClipboardContent) => void): () => void;
    /**
     * Stop watching clipboard changes
     */
    private stopWatching;
    /**
     * Check if clipboard content has changed (from memory optimization)
     */
    private hasChanged;
    /**
     * Read raw clipboard content for change detection
     */
    private readRaw;
    /**
     * Read image from clipboard
     */
    private readImage;
    /**
     * Read HTML from clipboard
     */
    private readHTML;
    /**
     * Read text from clipboard
     */
    private readText;
    /**
     * Calculate hash for content (from memory optimization)
     */
    private calculateHash;
}
