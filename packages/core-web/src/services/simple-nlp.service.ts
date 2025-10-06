export class SimpleNLPService {
    extractKeywords(text: string): string[] {
        if (!text) return [];

        return text
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !/^\d+$/.test(word));
    }

    similarity(text1: string, text2: string): number {
        const words1 = new Set(this.extractKeywords(text1));
        const words2 = new Set(this.extractKeywords(text2));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }
}