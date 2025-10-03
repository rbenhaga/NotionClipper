/**
 * Content detection result
 */
export interface DetectionResult {
    type: 'text' | 'html' | 'image' | 'table' | 'code' | 'url' | 'json' | 'xml' | 'markdown' | 'empty';
    subtype?: string | null;
    confidence: number;
    mimeType?: string;
    metadata?: Record<string, any>;
}
/**
 * Enhanced content detector with TypeScript support
 * Extracted from clipboard.service.js with optimizations from memory
 */
export declare class ContentDetector {
    private readonly patterns;
    constructor();
    /**
     * Detect content type with enhanced logic from memory optimizations
     */
    detect(content: string | Buffer | Blob | null | undefined): DetectionResult;
    private detectUrlType;
    private detectStructuredData;
    private getMarkdownScore;
    private detectCode;
    private detectTable;
}
export declare const contentDetector: ContentDetector;
//# sourceMappingURL=content-detector.d.ts.map