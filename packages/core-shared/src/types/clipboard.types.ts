export interface ClipboardContent {
    type: 'text' | 'html' | 'image' | 'file' | 'code' | 'url';
    data: string | Buffer | Blob;
    content?: string;
    timestamp: number;
    hash?: string;
    subtype?: string;
    confidence?: number;
    metadata?: {
        source?: string;
        title?: string;
        url?: string;
        format?: string;
        language?: string;
        [key: string]: any;
    };
}