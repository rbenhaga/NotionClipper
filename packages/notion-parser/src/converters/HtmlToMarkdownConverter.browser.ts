/**
 * HtmlToMarkdownConverter - Browser version (DOMParser only, zero Node.js dependencies)
 * 
 * This file is resolved via package.json "exports" condition "browser"
 * for web extension builds. No require("crypto"), no require("jsdom").
 */

export interface ConversionOptions {
    preserveFormatting?: boolean;
    cacheEnabled?: boolean;
    maxCacheSize?: number;
}

export class HtmlToMarkdownConverter {
    private conversionCache = new Map<string, string>();
    private readonly CACHE_MAX_SIZE: number;

    constructor(options: ConversionOptions = {}) {
        this.CACHE_MAX_SIZE = options.maxCacheSize || 100;
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

    /** Browser-safe hash using simple string hash */
    private hashHTML(html: string): string {
        let hash = 0;
        const str = html.substring(0, 5000);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    private convertHTMLToMarkdown(html: string): string {
        try {
            const cleanedHtml = this.preprocessHTML(html);
            const parser = new DOMParser();
            const doc = parser.parseFromString(cleanedHtml, 'text/html');
            const body = doc.body || doc.documentElement;
            const markdown = this.convertNode(body);
            return this.postProcessMarkdown(markdown);
        } catch (error) {
            console.warn('[HtmlToMarkdownConverter.browser] DOM parsing failed, using regex fallback:', error);
            return this.convertHTMLToMarkdownRegex(html);
        }
    }

    private preprocessHTML(html: string): string {
        let cleaned = html;
        cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
        cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
        return cleaned;
    }

    private convertNode(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || '';
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const children = Array.from(element.childNodes)
                .map(child => this.convertNode(child))
                .join('');
            return this.convertElement(element, children);
        }
        return '';
    }

    private convertElement(element: Element, children: string): string {
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            case 'h1': return `\n\n# ${children.trim()}\n\n`;
            case 'h2': return `\n\n## ${children.trim()}\n\n`;
            case 'h3': return `\n\n### ${children.trim()}\n\n`;
            case 'h4': return `\n\n#### ${children.trim()}\n\n`;
            case 'h5': return `\n\n##### ${children.trim()}\n\n`;
            case 'h6': return `\n\n###### ${children.trim()}\n\n`;
            case 'p': return `\n\n${children.trim()}\n\n`;
            case 'br': return '\n';
            case 'hr': return '\n\n---\n\n';
            case 'strong':
            case 'b': return `**${children}**`;
            case 'em':
            case 'i': return `*${children}*`;
            case 'u': return `__${children}__`;
            case 'del':
            case 's': return `~~${children}~~`;
            case 'code': return `\`${children}\``;
            case 'kbd': return `\`${children}\``;
            case 'pre':
                const codeEl = element.querySelector('code');
                if (codeEl) {
                    const lang = this.extractCodeLanguage(codeEl);
                    return `\n\`\`\`${lang}\n${codeEl.textContent || ''}\n\`\`\`\n`;
                }
                return `\n\`\`\`\n${children}\n\`\`\`\n`;
            case 'a':
                const href = element.getAttribute('href') || '';
                return href && children.trim() ? `[${children.trim()}](${href})` : children;
            case 'img':
                const src = element.getAttribute('src') || '';
                const alt = element.getAttribute('alt') || '';
                return src ? `![${alt}](${src})` : '';
            case 'ul': return '\n' + this.convertList(element, '-') + '\n';
            case 'ol': return '\n' + this.convertList(element, '1.') + '\n';
            case 'li': return children;
            case 'blockquote':
                return `\n\n${children.trim().split('\n').map(l => `> ${l}`).join('\n')}\n\n`;
            case 'table': return this.convertTable(element);
            case 'script':
            case 'style':
            case 'noscript':
            case 'head':
            case 'meta':
            case 'link':
            case 'title': return '';
            default: return children;
        }
    }

    private convertList(listElement: Element, marker: string): string {
        const items = Array.from(listElement.children).filter(c => c.tagName.toLowerCase() === 'li');
        let result = '';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const content = this.convertNode(item).trim();
            const actualMarker = marker === '1.' ? `${i + 1}.` : marker;
            result += `${actualMarker} ${content}\n`;
        }
        return result;
    }

    private convertTable(table: Element): string {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return '';

        let result = '\n\n';
        const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
        if (headerCells.length > 0) {
            result += '| ' + headerCells.map(c => this.convertNode(c).trim().replace(/\n/g, ' ')).join(' | ') + ' |\n';
            result += '|' + headerCells.map(() => ' --- ').join('|') + '|\n';
        }
        for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('td, th'));
            if (cells.length > 0) {
                result += '| ' + cells.map(c => this.convertNode(c).trim().replace(/\n/g, ' ')).join(' | ') + ' |\n';
            }
        }
        return result + '\n';
    }

    private extractCodeLanguage(codeElement: Element): string {
        const classList = Array.from(codeElement.classList);
        for (const className of classList) {
            if (className.startsWith('language-')) return className.replace('language-', '');
            if (className.startsWith('lang-')) return className.replace('lang-', '');
        }
        return '';
    }

    private postProcessMarkdown(markdown: string): string {
        let result = markdown;
        result = result.replace(/&nbsp;/g, ' ');
        result = result.replace(/&lt;/g, '<');
        result = result.replace(/&gt;/g, '>');
        result = result.replace(/&amp;/g, '&');
        result = result.replace(/\u00A0/g, ' ');
        result = result.replace(/[ \t]+/g, ' ');
        result = result.replace(/\n{3,}/g, '\n\n');
        result = result.split('\n').map(line => line.trimEnd()).join('\n');
        return result.trim();
    }

    /** Regex fallback for edge cases where DOMParser fails */
    private convertHTMLToMarkdownRegex(html: string): string {
        let text = html;
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
        text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
        text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');
        text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');
        text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
        text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
        text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
        text = text.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
        text = text.replace(/<[^>]+>/g, '');
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/\n{3,}/g, '\n\n');
        return text.trim();
    }
}

export const htmlToMarkdownConverter = new HtmlToMarkdownConverter();
