export interface DetectionResult {
    type: 'text' | 'html' | 'image' | 'table' | 'code' | 'url' | 'json' | 'markdown';
    subtype?: string | null;
    confidence: number;
    metadata?: Record<string, any>;
}

export class ContentDetector {
    detect(content: string): DetectionResult {
        if (!content || !content.trim()) {
            return { type: 'text', confidence: 1.0 };
        }

        // URL detection
        if (/^https?:\/\//i.test(content.trim())) {
            return { type: 'url', confidence: 1.0 };
        }

        // Code detection
        if (content.includes('```') || content.startsWith('function') || content.startsWith('class ')) {
            return { type: 'code', confidence: 0.9 };
        }

        // JSON detection
        try {
            JSON.parse(content);
            return { type: 'json', confidence: 1.0 };
        } catch { }

        // Markdown detection
        if (content.match(/^#{1,6}\s/m) || content.includes('**') || content.includes('[](')) {
            return { type: 'markdown', confidence: 0.8 };
        }

        // Table detection
        if (content.includes('|') && content.split('\n').filter(l => l.includes('|')).length > 1) {
            return { type: 'table', confidence: 0.7 };
        }

        return { type: 'text', confidence: 0.5 };
    }
}

export const contentDetector = new ContentDetector();