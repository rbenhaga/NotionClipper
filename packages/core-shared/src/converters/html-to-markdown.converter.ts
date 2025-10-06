import * as crypto from 'crypto';

export interface ConversionOptions {
    preserveFormatting?: boolean;
    cacheEnabled?: boolean;
    maxCacheSize?: number;
}

export class HtmlToMarkdownConverter {
    private conversionCache = new Map<string, string>();
    private readonly CACHE_MAX_SIZE: number;

    constructor(options: ConversionOptions = {}) {
        this.CACHE_MAX_SIZE = options.maxCacheSize || 10;
    }

    convert(html: string, options: ConversionOptions = {}): string {
        if (!html || !html.trim()) return '';

        const htmlHash = this.hashHTML(html);

        if (options.cacheEnabled !== false && this.conversionCache.has(htmlHash)) {
            return this.conversionCache.get(htmlHash)!;
        }

        const markdown = this.convertHTMLToMarkdown(html);

        if (options.cacheEnabled !== false) {
            this.conversionCache.set(htmlHash, markdown);

            if (this.conversionCache.size > this.CACHE_MAX_SIZE) {
                const firstKey = this.conversionCache.keys().next().value;
                if (firstKey !== undefined) {
                    this.conversionCache.delete(firstKey);
                }
            }
        }

        return markdown;
    }

    private hashHTML(html: string): string {
        return crypto.createHash('md5')
            .update(html.substring(0, 5000))
            .digest('hex');
    }

    private convertHTMLToMarkdown(html: string): string {
        // Simplified conversion
        let text = html;

        // Remove scripts and styles
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Headers
        text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
        text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
        text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');

        // Lists
        text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

        // Links
        text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

        // Bold and italic
        text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

        // Code
        text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
        text = text.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n');

        // Paragraphs and line breaks
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/p>/gi, '\n\n');
        text = text.replace(/<p[^>]*>/gi, '');

        // Remove remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&quot;/g, '"');
        text = text.replace(/&#39;/g, "'");

        // Clean up whitespace
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.trim();

        return text;
    }
}

export const htmlToMarkdownConverter = new HtmlToMarkdownConverter();