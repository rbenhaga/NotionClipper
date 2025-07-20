// src/react/src/services/pages.js
/**
 * Service pour la gestion des pages Notion
 * Correspond à backend/api/page_routes.py
 */

class PagesService {
  // Méthodes de stockage local pour les favoris
  getFavorites() {
    try {
      const stored = localStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lecture favoris:', error);
      return [];
    }
  }
  addToRecent(pageId) {
    try {
      const recent = this.getRecent();
      const filtered = recent.filter(id => id !== pageId);
      filtered.unshift(pageId);
      localStorage.setItem('recentPages', JSON.stringify(filtered.slice(0, 20)));
    } catch (error) {
      console.error('Erreur ajout récent:', error);
    }
  }
  getRecent() {
    try {
      const stored = localStorage.getItem('recentPages');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }
  // Méthodes IPC
  async getPages(forceRefresh = false) {
    const result = await window.electronAPI.getPages(forceRefresh);
    return { pages: result.pages || [] };
  }
  async getRecentPages(limit = 10) {
    const result = await window.electronAPI.getRecentPages(limit);
    return { pages: result.pages || [] };
  }
  async searchPages(query) {
    const result = await window.electronAPI.searchPages(query);
    return result.pages || [];
  }
  async getSuggestions(query) {
    const result = await window.electronAPI.getSuggestions(query);
    return { suggestions: result.suggestions || [] };
  }
  async toggleFavorite(pageId) {
    return await window.electronAPI.toggleFavorite(pageId);
  }
  async clearCache() {
    return await window.electronAPI.clearCache();
  }
}
export default new PagesService();