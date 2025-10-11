import type { ClipboardContent } from '../types';
/**
 * Clipboard abstraction interface
 * All clipboard implementations must follow this interface
 */
export interface IClipboard {
    /**
     * Read clipboard content
     * Returns null if clipboard is empty or inaccessible
     */
    read(): Promise<ClipboardContent | null>;
    /**
     * Write content to clipboard
     * @param content - Content to write to clipboard
     */
    write(content: ClipboardContent): Promise<void>;
    /**
     * Watch clipboard for changes (optional)
     * Returns a function to stop watching
     */
    watch?(callback: (content: ClipboardContent) => void): () => void;
    /**
     * Check if clipboard has content
     */
    hasContent(): Promise<boolean>;
    /**
     * Get available clipboard formats
     * Returns array of MIME types or format strings
     */
    getAvailableFormats(): Promise<string[]>;
    /**
     * Clear clipboard content
     */
    clear(): Promise<void>;
}
//# sourceMappingURL=clipboard.interface.d.ts.map