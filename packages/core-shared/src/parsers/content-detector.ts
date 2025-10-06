import { ClipboardContent } from '../types';

export interface DetectionResult {
    type: 'text' | 'html' | 'image' | 'table' | 'code' | 'url' | 'json' | 'xml' | 'markdown' | 'empty';
    subtype?: string | null;
    confidence: number;
    mimeType?: string;
    metadata?: Record<string, any>;
}

interface DetectionPatterns {
    url: RegExp;
    youtube: RegExp;
    vimeo: RegExp;
    imageExtension: RegExp;
    imageDataUrl: RegExp;
    videoExtension: RegExp;
    audioExtension: RegExp;
    documentExtension: RegExp;
    javascript: RegExp[];
    python: RegExp[];
    java: RegExp[];
    cpp: RegExp[];
    markdownHeader: RegExp;
    markdownList: RegExp;
    markdownBold: RegExp;
    markdownItalic: RegExp;
    markdownLink: RegExp;
    markdownImage: RegExp;
    markdownQuote: RegExp;
    markdownCodeBlock: RegExp;
    markdownTable: RegExp;
    markdownDivider: RegExp;
    markdownCheckbox: RegExp;
    json: RegExp;
    xml: RegExp;
    csv: RegExp;
    tsv: RegExp;
    html: RegExp;
}

export class ContentDetector {
    private readonly patterns: DetectionPatterns;

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

            javascript: [
                /^(function|const|let|var|class|import|export)\s/m,
                /=>\s*{/,
                /console\.log/,
                /require\(['"]/
            ],

            python: [
                /^(def|class|import|from)\s/m,
                /:\s*$/m,
                /print\(/,
                /__init__/
            ],

            java: [
                /^(public|private|protected)\s+(class|interface|enum)/m,
                /System\.out\.println/,
                /^import\s+java\./m
            ],

            cpp: [
                /^#include\s*[<"]/m,
                /std::/,
                /cout\s*<<|cin\s*>>/,
                /^(class|struct|namespace)\s+\w+/m
            ],

            markdownHeader: /^#{1,6}\s+.+$/m,
            markdownList: /^[\*\-\+]\s+.+$/m,
            markdownBold: /\*\*[^*]+\*\*|\__[^_]+\__/,
            markdownItalic: /\*[^*]+\*|\_[^_]+\_/,
            markdownLink: /\[([^\]]+)\]\(([^)]+)\)/,
            markdownImage: /!\[([^\]]*)\]\(([^)]+)\)/,
            markdownQuote: /^>\s+.+$/m,
            markdownCodeBlock: /```[\s\S]*?```|~~~[\s\S]*?~~~/,
            markdownTable: /^\|.+\|$/m,
            markdownDivider: /^[-*_]{3,}$/m,
            markdownCheckbox: /^-\s*\[([ x])\]\s+/m,

            json: /^\s*[\{\[]/,
            xml: /^\s*<\?xml|^\s*<[a-zA-Z]/,
            csv: /^[^,\n]+,[^,\n]+/m,
            tsv: /^[^\t\n]+\t[^\t\n]+/m,
            html: /<\s*([a-z][\w]*)[^>]*>/i
        };
    }

    detect(text: string): DetectionResult {
        if (!text || !text.trim()) {
            return { type: 'empty', confidence: 1 };
        }

        const trimmed = text.trim();

        // URL detection
        if (this.patterns.url.test(trimmed)) {
            return { type: 'url', confidence: 1, metadata: { url: trimmed } };
        }

        // Image detection
        if (this.patterns.imageDataUrl.test(trimmed)) {
            return { type: 'image', subtype: 'base64', confidence: 1 };
        }

        // JSON detection
        if (this.patterns.json.test(trimmed)) {
            try {
                JSON.parse(trimmed);
                return { type: 'json', confidence: 0.95 };
            } catch {
                // Not valid JSON
            }
        }

        // XML detection
        if (this.patterns.xml.test(trimmed)) {
            return { type: 'xml', confidence: 0.85 };
        }

        // HTML detection
        if (this.patterns.html.test(trimmed)) {
            return { type: 'html', confidence: 0.8 };
        }

        // Table detection
        const tableResult = this.detectTable(trimmed);
        if (tableResult) return tableResult;

        // Code detection
        const codeResult = this.detectCode(trimmed);
        if (codeResult) return codeResult;

        // Markdown detection
        const markdownScore = this.calculateMarkdownScore(trimmed);
        if (markdownScore > 0.3) {
            return { type: 'markdown', confidence: markdownScore };
        }

        // Default: text
        return { type: 'text', confidence: 0.5 };
    }

    private calculateMarkdownScore(text: string): number {
        let score = 0;

        if (this.patterns.markdownHeader.test(text)) score += 0.3;
        if (this.patterns.markdownList.test(text)) score += 0.2;
        if (this.patterns.markdownBold.test(text)) score += 0.1;
        if (this.patterns.markdownItalic.test(text)) score += 0.1;
        if (this.patterns.markdownLink.test(text)) score += 0.2;
        if (this.patterns.markdownImage.test(text)) score += 0.2;
        if (this.patterns.markdownCodeBlock.test(text)) score += 0.3;
        if (this.patterns.markdownTable.test(text)) score += 0.3;
        if (this.patterns.markdownQuote.test(text)) score += 0.1;
        if (this.patterns.markdownCheckbox.test(text)) score += 0.2;
        if (this.patterns.markdownDivider.test(text)) score += 0.1;

        return Math.min(score, 1);
    }

    private detectCode(text: string): DetectionResult | null {
        const headerMatches = text.match(/^#{1,6}\s+.+$/gm);
        if (headerMatches && headerMatches.length >= 3) {
            return null;
        }

        const languages = ['javascript', 'python', 'java', 'cpp'] as const;

        for (const lang of languages) {
            const patterns = this.patterns[lang];
            let matches = 0;

            for (const pattern of patterns) {
                if (pattern.test(text)) matches++;
            }

            if (matches >= 2) {
                return { type: 'code', subtype: lang, confidence: 0.8 + (matches * 0.05) };
            }
        }

        return null;
    }

    private detectTable(text: string): DetectionResult | null {
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) return null;

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

export const contentDetector = new ContentDetector();