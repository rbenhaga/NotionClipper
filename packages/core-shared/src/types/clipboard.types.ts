/**
 * Clipboard content types
 */
export interface ClipboardContent {
    type: 'text' | 'html' | 'image' | 'table' | 'code' | 'url' | 'file';
    subtype?: string;
    data: string | Buffer;
    content: string | Buffer;
    preview?: string;
    text?: string;
    html?: string;
    length?: number;
    size?: number;
    bufferSize?: number;
    confidence?: number;
    metadata?: ClipboardMetadata;
    timestamp: number;
    hash: string;
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
}

export interface ClipboardImage {
    buffer: Buffer;
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