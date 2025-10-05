/**
 * Enhanced content detector with TypeScript support
 * Extracted from clipboard.service.js with optimizations from memory
 */
export class ContentDetector {
    constructor() {
        this.patterns = {
            url: /^https?:\/\/[^\s]+$/i,
            youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
            vimeo: /vimeo\.com\/(\d+)/,
            imageExtension: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i,
            imageDataUrl: /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i,
            videoExtension: /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i,
            audioExtension: /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i,
            documentExtension: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|odt)$/i,
            // Code patterns
            javascript: [
                /^(function|const|let|var|class|import|export)\s/m,
                /=>\s*{/,
                /console\.(log|error|warn)/
            ],
            python: [
                /^(def|class|import|from)\s/m,
                /if\s+__name__\s*==/,
                /print\s*\(/
            ],
            java: [
                /^(public|private|protected)\s+(class|interface)/m,
                /System\.out\.println/,
                /import\s+java\./
            ],
            cpp: [
                /^#include\s*[<"]/m,
                /std::/,
                /cout\s*<</
            ],
            // Markdown patterns (improved from memory)
            markdownHeader: /^#{1,6}\s+.+$/m,
            markdownList: /^[\*\-\+]\s+.+$|^\d+\.\s+.+$/m,
            markdownBold: /\*\*[^*\n]+\*\*/,
            markdownItalic: /\*[^*\n]+\*/,
            markdownLink: /\[([^\]]+)\]\(([^)]+)\)/,
            markdownImage: /!\[[^\]]*\]\([^)]+\)/,
            markdownQuote: /^[">]\s+.+$/m,
            markdownCodeBlock: /^```[\w]*\n[\s\S]*?\n```$/m,
            markdownTable: /^\|.+\|$/m,
            markdownDivider: /^---+$/m,
            markdownCheckbox: /^-\s*\[([ x])\]\s+/m,
            json: /^[\s]*[\{\[][\s\S]*[\}\]][\s]*$/,
            xml: /^<\?xml|^<[^>]+>/,
            csv: /^[^,\n]+,[^,\n]+/,
            tsv: /^[^\t\n]+\t[^\t\n]+/,
            html: /<html|<body|<div|<p|<span|<h[1-6]/i
        };
    }
    /**
     * Detect content type with enhanced logic from memory optimizations
     */
    detect(content) {
        if (!content) {
            return { type: 'empty', subtype: null, confidence: 1 };
        }
        // Buffer = image (from memory: Buffer.isBuffer() check first)
        if (Buffer.isBuffer(content)) {
            return { type: 'image', subtype: 'buffer', confidence: 1 };
        }
        if (typeof Blob !== 'undefined' && content instanceof Blob) {
            return { type: 'image', subtype: 'blob', confidence: 0.9 };
        }
        const text = typeof content === 'string' ? content : String(content);
        const trimmed = text.trim();
        // Data URL image
        if (this.patterns.imageDataUrl.test(trimmed)) {
            const mimeMatch = trimmed.match(/^data:image\/([^;]+);base64,/);
            const imageType = mimeMatch ? mimeMatch[1] : 'unknown';
            return {
                type: 'image',
                subtype: 'dataurl',
                mimeType: `image/${imageType}`,
                confidence: 1,
                metadata: {
                    size: trimmed.length,
                    format: imageType
                }
            };
        }
        // URL detection
        if (this.patterns.url.test(trimmed)) {
            return this.detectUrlType(trimmed);
        }
        // Structured data (JSON, XML, HTML)
        const structured = this.detectStructuredData(trimmed);
        if (structured)
            return structured;
        // Markdown BEFORE code (improved from memory)
        const mdScore = this.getMarkdownScore(trimmed);
        if (mdScore > 0.4) { // Threshold lowered from 0.5 to 0.4
            return { type: 'markdown', subtype: null, confidence: mdScore };
        }
        // Code detection
        const code = this.detectCode(trimmed);
        if (code)
            return code;
        // Table detection
        const table = this.detectTable(trimmed);
        if (table)
            return table;
        // Default to text
        return { type: 'text', subtype: 'plain', confidence: 0.5 };
    }
    detectUrlType(url) {
        if (this.patterns.youtube.test(url)) {
            const videoId = url.match(this.patterns.youtube)?.[1];
            return { type: 'url', subtype: 'youtube', confidence: 1, metadata: { videoId } };
        }
        if (this.patterns.vimeo.test(url)) {
            const videoId = url.match(this.patterns.vimeo)?.[1];
            return { type: 'url', subtype: 'vimeo', confidence: 1, metadata: { videoId } };
        }
        if (this.patterns.imageExtension.test(url)) {
            return { type: 'url', subtype: 'image', confidence: 0.95 };
        }
        if (this.patterns.videoExtension.test(url)) {
            return { type: 'url', subtype: 'video', confidence: 0.9 };
        }
        return { type: 'url', subtype: 'generic', confidence: 0.8 };
    }
    detectStructuredData(text) {
        if (typeof text !== 'string' || !text || text.length < 2) {
            return null;
        }
        // JSON
        if (this.patterns.json && this.patterns.json.test(text)) {
            try {
                JSON.parse(text);
                return { type: 'json', subtype: null, confidence: 1 };
            }
            catch {
                // Not valid JSON
            }
        }
        // XML
        if (this.patterns.xml.test(text)) {
            return { type: 'xml', subtype: null, confidence: 0.9 };
        }
        // HTML
        if (this.patterns.html.test(text)) {
            return { type: 'html', subtype: null, confidence: 0.95 };
        }
        return null;
    }
    getMarkdownScore(text) {
        let score = 0;
        const lines = text.split('\n');
        const totalLines = lines.length;
        // Headers
        if (this.patterns.markdownHeader.test(text))
            score += 0.3;
        // Lists
        if (this.patterns.markdownList.test(text))
            score += 0.2;
        // Bold/Italic
        if (this.patterns.markdownBold.test(text))
            score += 0.1;
        if (this.patterns.markdownItalic.test(text))
            score += 0.1;
        // Links
        if (this.patterns.markdownLink.test(text))
            score += 0.2;
        // Images
        if (this.patterns.markdownImage.test(text))
            score += 0.2;
        // Code blocks
        if (this.patterns.markdownCodeBlock.test(text))
            score += 0.3;
        // Tables
        if (this.patterns.markdownTable.test(text))
            score += 0.3;
        // Quotes
        if (this.patterns.markdownQuote.test(text))
            score += 0.1;
        // Checkboxes
        if (this.patterns.markdownCheckbox.test(text))
            score += 0.2;
        // Dividers
        if (this.patterns.markdownDivider.test(text))
            score += 0.1;
        return Math.min(score, 1);
    }
    detectCode(text) {
        const languages = ['javascript', 'python', 'java', 'cpp'];
        for (const lang of languages) {
            const patterns = this.patterns[lang];
            let matches = 0;
            for (const pattern of patterns) {
                if (pattern.test(text))
                    matches++;
            }
            if (matches >= 2) {
                return { type: 'code', subtype: lang, confidence: 0.8 + (matches * 0.05) };
            }
        }
        return null;
    }
    detectTable(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2)
            return null;
        // TSV detection
        if (this.patterns.tsv.test(text)) {
            const tabCounts = lines.map(line => (line.match(/\t/g) || []).length);
            const consistent = tabCounts.every(count => count === tabCounts[0] && count > 0);
            if (consistent) {
                return {
                    type: 'table',
                    subtype: 'tsv',
                    confidence: 0.9,
                    metadata: { delimiter: '\t', columns: tabCounts[0] + 1 }
                };
            }
        }
        // CSV detection
        if (this.patterns.csv.test(text)) {
            const commaCounts = lines.map(line => (line.match(/,/g) || []).length);
            const consistent = commaCounts.every(count => count === commaCounts[0] && count > 0);
            if (consistent) {
                return {
                    type: 'table',
                    subtype: 'csv',
                    confidence: 0.8,
                    metadata: { delimiter: ',', columns: commaCounts[0] + 1 }
                };
            }
        }
        return null;
    }
}
// Export singleton instance
export const contentDetector = new ContentDetector();
