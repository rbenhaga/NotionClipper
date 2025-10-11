export interface ConversionOptions {
    preserveFormatting?: boolean;
    cacheEnabled?: boolean;
    maxCacheSize?: number;
}
export declare class HtmlToMarkdownConverter {
    private conversionCache;
    private readonly CACHE_MAX_SIZE;
    constructor(options?: ConversionOptions);
    convert(html: string, options?: ConversionOptions): string;
    private hashHTML;
    private convertHTMLToMarkdown;
    private decodeHTMLEntities;
}
export declare const htmlToMarkdownConverter: HtmlToMarkdownConverter;
//# sourceMappingURL=html-to-markdown.converter.d.ts.map