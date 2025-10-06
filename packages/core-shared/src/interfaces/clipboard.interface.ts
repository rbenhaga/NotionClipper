import type { ClipboardContent } from '../types';

/**
 * Clipboard abstraction interface
 */
export interface IClipboard {
    read(): Promise<ClipboardContent | null>;
    write(content: ClipboardContent): Promise<void>;
    watch?(callback: (content: ClipboardContent) => void): () => void;
    hasContent(): Promise<boolean>;
    getAvailableFormats(): Promise<string[]>;
    clear(): Promise<void>;
}