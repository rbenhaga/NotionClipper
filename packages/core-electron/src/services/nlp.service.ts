import natural from 'natural';

export class NLPService {
    private tokenizer: natural.WordTokenizer;
    private tfidf: natural.TfIdf;

    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.tfidf = new natural.TfIdf();
    }

    extractKeywords(text: string, limit: number = 10): string[] {
        const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];

        // Filtrer les stop words et mots courts
        const filtered = tokens.filter(token =>
            token.length > 3 && !this.isStopWord(token)
        );

        // Calculer TF-IDF
        this.tfidf.addDocument(filtered);
        const scores = new Map<string, number>();

        filtered.forEach(term => {
            const score = this.tfidf.tfidf(term, 0);
            scores.set(term, score);
        });

        // Trier et retourner les top keywords
        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0]);
    }

    private isStopWord(word: string): boolean {
        const stopWords = new Set([
            'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but',
            'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be',
            'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must',
            'can', 'to', 'of', 'in', 'for', 'with', 'from', 'by'
        ]);
        return stopWords.has(word);
    }
}