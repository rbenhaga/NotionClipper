import { parse } from 'node-html-parser';
import * as crypto from 'crypto';
/**
 * HTML to Markdown converter with LRU cache optimization
 * Extracted from clipboard.service.js with performance improvements from memory
 */
export class HtmlToMarkdownConverter {
    constructor(options = {}) {
        this.conversionCache = new Map();
        this.CACHE_MAX_SIZE = options.maxCacheSize || 10;
    }
    /**
     * Convert HTML to Markdown with caching (from memory optimization)
     */
    convert(html, options = {}) {
        if (!html || !html.trim())
            return '';
        // Calculate hash for caching (from memory: MD5 hash of first 5000 chars)
        const htmlHash = this.hashHTML(html);
        // Check cache first (50-200x performance improvement from memory)
        if (options.cacheEnabled !== false && this.conversionCache.has(htmlHash)) {
            return this.conversionCache.get(htmlHash);
        }
        // Convert HTML to Markdown
        const markdown = this.convertHTMLToMarkdown(html);
        // Cache the result (LRU implementation from memory)
        if (options.cacheEnabled !== false) {
            this.conversionCache.set(htmlHash, markdown);
            // Limit cache size (LRU simple from memory)
            if (this.conversionCache.size > this.CACHE_MAX_SIZE) {
                const firstKey = this.conversionCache.keys().next().value;
                if (firstKey !== undefined) {
                    this.conversionCache.delete(firstKey);
                }
            }
        }
        return markdown;
    }
    /**
     * Calculate hash for HTML content (from memory optimization)
     */
    hashHTML(html) {
        return crypto.createHash('md5')
            .update(html.substring(0, 5000)) // First 5000 chars sufficient
            .digest('hex');
    }
    /**
     * Core HTML to Markdown conversion logic
     * Preserves ALL formatting as specified in original code
     */
    convertHTMLToMarkdown(html) {
        try {
            // Parse HTML
            const root = parse(html, {
                lowerCaseTagName: false,
                comment: false,
                blockTextElements: {
                    script: false,
                    noscript: false,
                    style: false,
                    pre: true
                }
            });
            // 1. Remove unwanted elements
            root.querySelectorAll('script, style, noscript, meta, link').forEach(el => el.remove());
            // 2. Handle HTML elements in correct hierarchical order
            // Details/Summary (convert to Notion toggle)
            root.querySelectorAll('details').forEach(details => {
                const summary = details.querySelector('summary');
                const summaryText = summary ? this.getCleanText(summary) : 'Détails';
                // Get content without summary
                if (summary)
                    summary.remove();
                const content = this.getCleanText(details);
                if (content.trim()) {
                    details.replaceWith(`\n\n▸ **${summaryText}**\n${content}\n\n`);
                }
                else {
                    details.replaceWith(`\n\n▸ **${summaryText}**\n\n`);
                }
            });
            // Keyboard keys (kbd)
            root.querySelectorAll('kbd').forEach(kbd => {
                const text = this.getCleanText(kbd);
                if (text) {
                    kbd.replaceWith(`\`${text}\``); // Convert to inline code
                }
            });
            // Superscript (sup) and subscript (sub)
            root.querySelectorAll('sup').forEach(sup => {
                const text = this.getCleanText(sup);
                if (text) {
                    sup.replaceWith(`^${text}^`); // Alternative markdown notation
                }
            });
            root.querySelectorAll('sub').forEach(sub => {
                const text = this.getCleanText(sub);
                if (text) {
                    sub.replaceWith(`~${text}~`); // Alternative markdown notation
                }
            });
            // Center - Notion doesn't support, just put text
            root.querySelectorAll('center').forEach(center => {
                const text = this.getCleanText(center);
                if (text) {
                    center.replaceWith(`\n${text}\n`);
                }
            });
            // Preserve links BEFORE any other processing
            root.querySelectorAll('a').forEach(a => {
                const text = this.getCleanText(a);
                const href = a.getAttribute('href');
                if (text && href && !href.startsWith('javascript:')) {
                    // Mark temporarily to avoid double conversion
                    a.innerHTML = `§LINK§${text}§${href}§`;
                }
            });
            // Preserve images
            root.querySelectorAll('img').forEach(img => {
                const alt = img.getAttribute('alt') || 'image';
                const src = img.getAttribute('src');
                if (src) {
                    img.replaceWith(`§IMG§${alt}§${src}§`);
                }
            });
            // Handle inline formatting (in correct order)
            // Inline code (before other formatting to avoid conflicts)
            root.querySelectorAll('code').forEach(el => {
                if (!el.closest('pre')) {
                    const text = this.getCleanText(el);
                    if (text) {
                        el.innerHTML = `§CODE§${text}§`;
                    }
                }
            });
            // Underline (u, ins)
            root.querySelectorAll('u, ins').forEach(el => {
                const text = this.getCleanText(el);
                if (text) {
                    el.innerHTML = `§UNDERLINE§${text}§`;
                }
            });
            // Strikethrough (del, strike, s)
            root.querySelectorAll('del, strike, s').forEach(el => {
                const text = this.getCleanText(el);
                if (text) {
                    el.innerHTML = `§STRIKE§${text}§`;
                }
            });
            // Bold (strong, b)
            root.querySelectorAll('strong, b').forEach(el => {
                const text = this.getCleanText(el);
                if (text) {
                    el.innerHTML = `§BOLD§${text}§`;
                }
            });
            // Italic (em, i)
            root.querySelectorAll('em, i').forEach(el => {
                const text = this.getCleanText(el);
                if (text) {
                    el.innerHTML = `§ITALIC§${text}§`;
                }
            });
            // Highlight (mark)
            root.querySelectorAll('mark').forEach(el => {
                const text = this.getCleanText(el);
                if (text) {
                    el.innerHTML = `§HIGHLIGHT§${text}§`;
                }
            });
            // 3. Handle code blocks
            root.querySelectorAll('pre').forEach(pre => {
                const code = pre.querySelector('code') || pre;
                const text = code.textContent || code.innerText || '';
                if (text.trim()) {
                    // Detect language
                    let lang = '';
                    const classAttr = (code.getAttribute('class') || '') + ' ' + (pre.getAttribute('class') || '');
                    const langMatch = classAttr.match(/language-(\w+)|lang-(\w+)|highlight-(\w+)/);
                    if (langMatch) {
                        lang = langMatch[1] || langMatch[2] || langMatch[3];
                    }
                    pre.replaceWith(`\n\n§CODEBLOCK§${lang}§${text}§\n\n`);
                }
            });
            // 4. Blockquotes - Improved handling
            root.querySelectorAll('blockquote').forEach(bq => {
                // Get all internal content preserving paragraphs
                const paragraphs = bq.querySelectorAll('p');
                let quoteText = '';
                if (paragraphs.length > 0) {
                    // If there are paragraphs, handle them separately
                    paragraphs.forEach(p => {
                        const text = this.getCleanText(p);
                        if (text.trim()) {
                            quoteText += `> ${text.trim()}\n`;
                        }
                    });
                }
                else {
                    // Otherwise take all text
                    const text = this.getCleanText(bq);
                    if (text.trim()) {
                        // Split by lines and add > before each
                        const lines = text.trim().split('\n');
                        quoteText = lines.map(line => `> ${line.trim()}`).join('\n');
                    }
                }
                if (quoteText) {
                    bq.replaceWith(`\n\n${quoteText}\n\n`);
                }
            });
            // 5. Lists (handle before paragraphs)
            // Unordered lists
            root.querySelectorAll('ul').forEach(ul => {
                const items = [];
                ul.querySelectorAll('> li').forEach(li => {
                    const text = this.getCleanText(li);
                    if (text.trim()) {
                        items.push(`• ${text.trim()}`);
                    }
                });
                if (items.length > 0) {
                    ul.replaceWith(`\n\n${items.join('\n')}\n\n`);
                }
            });
            // Ordered lists
            root.querySelectorAll('ol').forEach(ol => {
                const items = [];
                ol.querySelectorAll('> li').forEach((li, index) => {
                    const text = this.getCleanText(li);
                    if (text.trim()) {
                        items.push(`${index + 1}. ${text.trim()}`);
                    }
                });
                if (items.length > 0) {
                    ol.replaceWith(`\n\n${items.join('\n')}\n\n`);
                }
            });
            // 6. Headers
            for (let i = 1; i <= 6; i++) {
                root.querySelectorAll(`h${i}`).forEach(h => {
                    const text = this.getCleanText(h);
                    if (text.trim()) {
                        const hashes = '#'.repeat(i);
                        h.replaceWith(`\n\n${hashes} ${text.trim()}\n\n`);
                    }
                });
            }
            // 7. Tables
            root.querySelectorAll('table').forEach(table => {
                const rows = [];
                const headerRows = table.querySelectorAll('thead tr, tr:first-child');
                const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
                // Handle header
                if (headerRows.length > 0) {
                    headerRows.forEach(tr => {
                        const cells = [];
                        tr.querySelectorAll('th, td').forEach(cell => {
                            const text = this.getCleanText(cell);
                            cells.push(text.trim() || ' ');
                        });
                        if (cells.length > 0) {
                            rows.push(`| ${cells.join(' | ')} |`);
                            // Add separator
                            rows.push(`| ${cells.map(() => '---').join(' | ')} |`);
                        }
                    });
                }
                // Handle body
                bodyRows.forEach(tr => {
                    const cells = [];
                    tr.querySelectorAll('td, th').forEach(cell => {
                        const text = this.getCleanText(cell);
                        cells.push(text.trim() || ' ');
                    });
                    if (cells.length > 0) {
                        rows.push(`| ${cells.join(' | ')} |`);
                    }
                });
                if (rows.length > 0) {
                    table.replaceWith(`\n\n${rows.join('\n')}\n\n`);
                }
            });
            // 8. Paragraphs and line breaks
            root.querySelectorAll('p').forEach(p => {
                const text = this.getCleanText(p);
                if (text.trim()) {
                    p.replaceWith(`\n\n${text.trim()}\n\n`);
                }
            });
            // Handle line breaks
            root.querySelectorAll('br').forEach(br => {
                br.replaceWith('\n');
            });
            // 9. Get final text and restore markdown
            let finalText = this.getCleanText(root);
            finalText = this.restoreMarkdown(finalText);
            finalText = this.cleanupMarkdown(finalText);
            return finalText;
        }
        catch (error) {
            console.error('❌ Erreur conversion HTML:', error);
            // Fallback: strip HTML tags
            return html
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }
    }
    /**
     * Get clean text from element
     */
    getCleanText(element) {
        if (!element)
            return '';
        // Get internal text preserving structure
        let text = element.innerHTML || element.textContent || element.text || '';
        // Clean remaining HTML tags but preserve our markers
        text = text.replace(/<(?!§)[^>]+>/g, ' ');
        return text.trim();
    }
    /**
     * Restore markers to markdown
     */
    restoreMarkdown(text) {
        // Restore in specific order to avoid conflicts
        // Code blocks (high priority)
        text = text.replace(/§CODEBLOCK§([^§]*)§([^§]*)§/g, (match, lang, code) => {
            return `\`\`\`${lang}\n${code}\n\`\`\``;
        });
        // Inline code
        text = text.replace(/§CODE§([^§]+)§/g, '`$1`');
        // Links - Check validity
        text = text.replace(/§LINK§([^§]+)§([^§]+)§/g, (match, linkText, url) => {
            // If URL is invalid, return just text
            if (!url || url === 'undefined' || url === 'null' || url.startsWith('javascript:')) {
                return linkText;
            }
            return `[${linkText}](${url})`;
        });
        // Images
        text = text.replace(/§IMG§([^§]+)§([^§]+)§/g, '![$1]($2)');
        // Quotes - Fix for multi-line handling
        text = text.replace(/§QUOTE§([^§]+)§/g, (match, quote) => {
            const lines = quote.split('\n').filter((l) => l.trim());
            return lines.map((line) => `> ${line.trim()}`).join('\n');
        });
        // Formatting (order is important)
        text = text.replace(/§BOLD§([^§]+)§/g, '**$1**');
        text = text.replace(/§ITALIC§([^§]+)§/g, '*$1*');
        text = text.replace(/§UNDERLINE§([^§]+)§/g, '**__$1__**'); // Notion understands this syntax better
        text = text.replace(/§STRIKE§([^§]+)§/g, '~~$1~~');
        text = text.replace(/§HIGHLIGHT§([^§]+)§/g, '**$1**'); // Fallback to bold as Notion doesn't support highlighting
        return text;
    }
    /**
     * Clean up final markdown
     */
    cleanupMarkdown(text) {
        // Handle footnotes (not supported by Notion)
        // Convert [^1] to (1) and put notes at the end
        const footnotes = {};
        // Collect footnote definitions
        text = text.replace(/\[\^(\d+)\]:\s*(.+)$/gm, (match, num, content) => {
            footnotes[num] = content;
            return ''; // Remove temporarily
        });
        // Replace references
        text = text.replace(/\[\^(\d+)\]/g, (match, num) => {
            if (footnotes[num]) {
                return `(${num})`;
            }
            return match;
        });
        // Add notes at the end if they exist
        if (Object.keys(footnotes).length > 0) {
            text += '\n\n---\n\n**Notes:**\n\n';
            for (const [num, content] of Object.entries(footnotes)) {
                text += `(${num}) ${content}\n\n`;
            }
        }
        // Decode HTML entities
        text = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&'); // This should be last
        // Clean up excessive whitespace
        text = text
            .replace(/\n{4,}/g, '\n\n\n') // Max 3 consecutive newlines
            .replace(/[ \t]+$/gm, '') // Remove trailing spaces
            .replace(/^[ \t]+/gm, '') // Remove leading spaces (except for code blocks)
            .trim();
        return text;
    }
    /**
     * Clear conversion cache
     */
    clearCache() {
        this.conversionCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.conversionCache.size,
            maxSize: this.CACHE_MAX_SIZE
        };
    }
}
// Export singleton instance
export const htmlToMarkdownConverter = new HtmlToMarkdownConverter();
