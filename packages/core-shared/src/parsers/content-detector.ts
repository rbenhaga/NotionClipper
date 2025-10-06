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

    detect(content: string | Buffer | Blob | null | undefined): DetectionResult {
        if (!content) {
            return { type: 'empty', subtype: null, confidence: 1 };
        }

        if (Buffer.isBuffer(content)) {
            return { type: 'image', subtype: 'buffer', confidence: 1 };
        }

        if (typeof Blob !== 'undefined' && content instanceof Blob) {
            return { type: 'image', subtype: 'blob', confidence: 0.9 };
        }

        const text = typeof content === 'string' ? content : String(content);
        const trimmed = text.trim();

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

        if (this.patterns.url.test(trimmed)) {
            return this.detectUrlType(trimmed);
        }

        const structured = this.detectStructuredData(trimmed);
        if (structured) return structured;

        const mdScore = this.getMarkdownScore(trimmed);
        if (mdScore > 0.4) {
            return { type: 'markdown', subtype: null, confidence: mdScore };
        }

        const code = this.detectCode(trimmed);
        if (code) return code;

        const table = this.detectTable(trimmed);
        if (table) return table;

        return { type: 'text', subtype: 'plain', confidence: 0.5 };
    }

    private detectUrlType(url: string): DetectionResult {
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

    private detectStructuredData(text: string): DetectionResult | null {
        if (typeof text !== 'string' || !text || text.length < 2) {
            return null;
        }

        if (this.patterns.json && this.patterns.json.test(text)) {
            try {
                JSON.parse(text);
                return { type: 'json', subtype: null, confidence: 1 };
            } catch { }
        }

        if (this.patterns.xml.test(text)) {
            return { type: 'xml', subtype: null, confidence: 0.9 };
        }

        if (this.patterns.html.test(text)) {
            return { type: 'html', subtype: null, confidence: 0.95 };
        }

        return null;
    }

    private getMarkdownScore(text: string): number {
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