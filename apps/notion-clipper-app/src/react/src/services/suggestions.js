class SuggestionsService {
  async getHybridSuggestions(clipboardContent, favorites = [], options = {}) {
    const result = await window.electronAPI.getHybridSuggestions({
      clipboardContent,
      favorites,
      useSemantic: options.useSemantic ?? true,
      semanticThreshold: options.semanticThreshold ?? 20
    });
    return {
      suggestions: result.suggestions || [],
      method: result.method || 'lexical'
    };
  }
}

export default new SuggestionsService(); 