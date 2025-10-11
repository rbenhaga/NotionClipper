/**
 * Clipboard content types
 * Unified type for all clipboard operations (Web-safe)
 */
export interface ClipboardContent {
    type: 'text' | 'html' | 'image' | 'table' | 'code' | 'url' | 'file';
    subtype?: string;
    data: string | Uint8Array;
    preview?: string;
    metadata?: ClipboardMetadata;
    timestamp: number;
    hash?: string;
}
export interface ClipboardMetadata {
    format?: string;
    delimiter?: string;
    delimiterCode?: number;
    source?: string;
    language?: string;
    encoding?: string;
    mimeType?: string;
    filename?: string;
    dimensions?: {
        width: number;
        height: number;
    };
    bufferSize?: number;
    textContent?: string;
    length?: number;
}
export interface ClipboardImage {
    buffer: Uint8Array;
    format: 'png' | 'jpg' | 'jpeg' | 'gif' | 'bmp' | 'webp';
    width: number;
    height: number;
    size: number;
}
export interface ClipboardTable {
    delimiter: '\t' | ',' | ';' | '|';
    rows: string[][];
    headers?: string[];
    format: 'tsv' | 'csv' | 'markdown';
}
//# sourceMappingURL=clipboard.types.d.ts.map