import type { ClipboardContent } from '../types/clipboard.types';
/**
 * Clipboard abstraction interface
 * Allows different clipboard implementations (Electron, Browser Paste API, etc.)
 */
export interface IClipboard {
    /**
     * Read content from clipboard
     */
    read(): Promise<ClipboardContent | null>;
    /**
     * Write content to clipboard
     */
    write(content: ClipboardContent): Promise<void>;
    /**
     * Watch for clipboard changes (optional - desktop only)
     */
    watch?(callback: (content: ClipboardContent) => void): () => void;
    /**
     * Check if clipboard has content
     */
    hasContent(): Promise<boolean>;
    /**
     * Get available formats
     */
    getAvailableFormats(): Promise<string[]>;
    /**
     * Clear clipboard
     */
    clear(): Promise<void>;
}
//# sourceMappingURL=clipboard.interface.d.ts.map