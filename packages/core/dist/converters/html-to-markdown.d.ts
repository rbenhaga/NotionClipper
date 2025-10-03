/**
 * HTML to Markdown conversion options
 */
export interface ConversionOptions {
    preserveFormatting?: boolean;
    cacheEnabled?: boolean;
    maxCacheSize?: number;
}
/**
 * HTML to Markdown converter with LRU cache optimization
 * Extracted from clipboard.service.js with performance improvements from memory
 */
export declare class HtmlToMarkdownConverter {
    private conversionCache;
    private readonly CACHE_MAX_SIZE;
    constructor(options?: ConversionOptions);
    /**
     * Convert HTML to Markdown with caching (from memory optimization)
     */
    convert(html: string, options?: ConversionOptions): string;
    /**
     * Calculate hash for HTML content (from memory optimization)
     */
    private hashHTML;
    /**
     * Core HTML to Markdown conversion logic
     * Preserves ALL formatting as specified in original code
     */
    private convertHTMLToMarkdown;
    /**
     * Get clean text from element
     */
    private getCleanText;
    /**
     * Restore markers to markdown
     */
    private restoreMarkdown;
    /**
     * Clean up final markdown
     */
    private cleanupMarkdown;
    /**
     * Clear conversion cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
    };
}
export declare const htmlToMarkdownConverter: HtmlToMarkdownConverter;
//# sourceMappingURL=html-to-markdown.d.ts.map