const natural = require('natural');
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

class SuggestionService {
  constructor() {
    this.tfidf = new TfIdf();
    this.cache = new Map();
  }
  getSuggestions(query, pages, options = {}) {
    const {
      limit = 10,
      favorites = [],
      useSemantic = false,
      semanticThreshold = 20
    } = options;
    if (!query || !pages.length) {
      return [];
    }
    // Utiliser cache si disponible
    const cacheKey = `${query}_${pages.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey).slice(0, limit);
    }
    const queryTokens = this.tokenizeText(query);
    const scores = [];
    for (const page of pages) {
      let score = 0;
      const pageTitle = (page.title || '').toLowerCase();
      const queryLower = query.toLowerCase();
      // Score exact
      if (pageTitle === queryLower) {
        score += 100;
      }
      // Score contient
      if (pageTitle.includes(queryLower)) {
        score += 50;
      }
      // Score début
      if (pageTitle.startsWith(queryLower)) {
        score += 30;
      }
      // Score mots
      const titleTokens = this.tokenizeText(pageTitle);
      const commonTokens = queryTokens.filter(t => titleTokens.includes(t));
      score += commonTokens.length * 10;
      // Bonus favori
      if (favorites.includes(page.id)) {
        score += 20;
      }
      // Bonus récence
      if (page.last_edited_time) {
        const daysSinceEdit = this.getDaysSince(page.last_edited_time);
        if (daysSinceEdit < 7) score += 10;
        else if (daysSinceEdit < 30) score += 5;
      }
      if (score > 0) {
        scores.push({ page, score });
      }
    }
    // Trier et limiter
    const suggestions = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    // Mettre en cache
    this.cache.set(cacheKey, suggestions);
    return suggestions;
  }
  tokenizeText(text) {
    return tokenizer.tokenize(text.toLowerCase());
  }
  getDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new SuggestionService(); 