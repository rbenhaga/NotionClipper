// src/react/src/services/pages.js
/**
 * Service pour la gestion des pages Notion
 * Correspond à backend/api/page_routes.py
 */

class PagesService {
  async getPages(forceRefresh = false) {
    const result = await window.electronAPI.getPages(forceRefresh);
    return { pages: result.pages || [] };
  }

  async getRecentPages(limit = 10) {
    const result = await window.electronAPI.getRecentPages(limit);
    return { pages: result.pages || [] };
  }

  async getFavorites() {
    const result = await window.electronAPI.getFavorites();
    return { pages: result.pages || [] };
  }

  async toggleFavorite(pageId) {
    return await window.electronAPI.toggleFavorite(pageId);
  }

  async clearCache() {
    return await window.electronAPI.clearCache();
  }

  async getSuggestions(query) {
    const result = await window.electronAPI.getSuggestions(query);
    return { suggestions: result.suggestions || [] };
  }

  async searchPages(query) {
    const result = await window.electronAPI.searchPages(query);
    return result.pages || [];
  }
}

export default new PagesService();