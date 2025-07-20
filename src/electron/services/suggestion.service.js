const levenshtein = require('fast-levenshtein');

class SuggestionService {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  getSuggestions(query, pages, maxResults = 10) {
    if (!query || !pages.length) return [];
    const queryLower = query.toLowerCase();
    const cacheKey = `${queryLower}_${pages.length}`;
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    // Calculer les scores
    const scored = pages.map(page => {
      const title = (page.title || '').toLowerCase();
      // Score exact match
      if (title === queryLower) return { page, score: 100 };
      // Score contains
      if (title.includes(queryLower)) return { page, score: 80 };
      // Score Levenshtein
      const distance = levenshtein.get(queryLower, title);
      const score = Math.max(0, 60 - distance * 2);
      return { page, score };
    });
    // Trier et filtrer
    const suggestions = scored
      .filter(item => item.score > 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.page);
    // Mettre en cache
    this.updateCache(cacheKey, suggestions);
    return suggestions;
  }

  updateCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new SuggestionService(); 