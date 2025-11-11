// packages/core-shared/src/types/clipboard.types.ts

/**
 * Clipboard content types
 * Unified type for all clipboard operations (Web-safe)
 */
export interface ClipboardContent {
    type: 'text' | 'html' | 'image' | 'table' | 'code' | 'url' | 'file';
    subtype?: string;
    data: string | Uint8Array | string[]; // ✅ Web-safe (pas Buffer) + string[] pour les chemins de fichiers
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
    // ✅ Champs additionnels pour compatibilité
    bufferSize?: number;
    textContent?: string;
    length?: number;
    // ✅ Champs pour les fichiers multiples
    count?: number;
    files?: Array<{
        path: string;
        name: string;
    }>;
}

export interface ClipboardImage {
    buffer: Uint8Array; // ✅ Web-safe (pas Buffer)
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

// DEPRECATED: Supprimé pour éviter la confusion
// Utiliser ClipboardContent directement