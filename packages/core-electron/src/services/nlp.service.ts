import natural from 'natural';

/**
 * Advanced NLP Service using natural library
 * Electron-only (requires Node.js native modules)
 */
export class NLPService {
    private tokenizer: natural.WordTokenizer;
    private tfidf: natural.TfIdf;

    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.tfidf = new natural.TfIdf();
    }

    /**
     * Extract keywords from text
     */
    extractKeywords(text: string, limit: number = 5): string[] {
        if (!text || !text.trim()) return [];

        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        if (!tokens) return [];

        // Filter stopwords and short words
        const filtered = tokens.filter(token =>
            token.length > 3 &&
            !this.isStopword(token)
        );

        // Count frequency
        const frequency: Record<string, number> = {};
        for (const token of filtered) {
            frequency[token] = (frequency[token] || 0) + 1;
        }

        // Sort by frequency and return top N
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word]) => word);
    }

    /**
     * Calculate similarity between two texts
     */
    calculateSimilarity(text1: string, text2: string): number {
        const tokens1 = this.tokenizer.tokenize(text1.toLowerCase()) || [];
        const tokens2 = this.tokenizer.tokenize(text2.toLowerCase()) || [];

        // Calculate Jaccard similarity
        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }

    /**
     * Simple stopword check
     */
    private isStopword(word: string): boolean {
        const stopwords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        ]);
        return stopwords.has(word);
    }
}