export interface ClipboardContent {
    type: 'text' | 'image' | 'html' | 'url' | 'code';
    data: string | Buffer;
    content: string;
    timestamp: number;
    hash: string;
    metadata?: {
        url?: string;
        title?: string;
        language?: string;
        imageFormat?: string;
    };
}

export interface IClipboard {
    read(): Promise<ClipboardContent | null>;
    write(content: ClipboardContent): Promise<void>;
    hasContent(): Promise<boolean>;
    getAvailableFormats(): Promise<string[]>;
    clear(): Promise<void>;
}