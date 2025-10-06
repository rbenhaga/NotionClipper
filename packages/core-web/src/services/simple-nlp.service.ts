export class SimpleNLPService {
    extractKeywords(text: string, limit: number = 10): string[] {
        const stopWords = new Set([
            'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but',
            'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be',
            'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must',
            'can', 'to', 'of', 'in', 'for', 'with', 'from', 'by'
        ]);

        const words = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word =>
                word.length > 3 &&
                !stopWords.has(word) &&
                !/^\d+$/.test(word)
            );

        // Compter les occurrences
        const frequency = new Map<string, number>();
        for (const word of words) {
            frequency.set(word, (frequency.get(word) || 0) + 1);
        }

        // Trier par fréquence
        return Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0]);
    }
}