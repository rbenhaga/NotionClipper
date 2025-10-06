import natural from 'natural';

export class NLPService {
  private tokenizer = new natural.WordTokenizer();

  extractKeywords(text: string): string[] {
    if (!text) return [];
    return this.tokenizer.tokenize(text.toLowerCase()) || [];
  }

  similarity(text1: string, text2: string): number {
    const words1 = new Set(this.extractKeywords(text1));
    const words2 = new Set(this.extractKeywords(text2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}