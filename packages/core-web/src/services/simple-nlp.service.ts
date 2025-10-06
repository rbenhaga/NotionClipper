/**
 * Simple NLP Service without native dependencies
 * Web-compatible (no Node.js modules)
 */
export class SimpleNLPService {
    /**
     * Extract keywords from text using simple algorithm
     */
    extractKeywords(text: string, limit: number = 5): string[] {
        if (!text || !text.trim()) return [];

        // Tokenize
        const tokens = text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(token => token.length > 3 && !this.isStopword(token));

        // Count frequency
        const frequency: Record<string, number> = {};
        for (const token of tokens) {
            frequency[token] = (frequency[token] || 0) + 1;
        }

        // Sort and return top N
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word]) => word);
    }

    /**
     * Calculate similarity between two texts
     */
    calculateSimilarity(text1: string, text2: string): number {
        const tokens1 = this.tokenize(text1);
        const tokens2 = this.tokenize(text2);

        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Simple sentiment analysis
     */
    analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
        const positiveWords = new Set([
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'love', 'happy', 'best', 'awesome', 'brilliant', 'perfect'
        ]);

        const negativeWords = new Set([
            'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst',
            'hate', 'sad', 'disappointed', 'useless', 'broken', 'wrong'
        ]);

        const tokens = this.tokenize(text);
        let score = 0;

        for (const token of tokens) {
            if (positiveWords.has(token)) score++;
            if (negativeWords.has(token)) score--;
        }

        if (score > 1) return 'positive';
        if (score < -1) return 'negative';
        return 'neutral';
    }

    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(token => token.length > 0);
    }

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