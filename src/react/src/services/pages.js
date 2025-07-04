// src/react/src/services/pages.js
/**
 * Service pour la gestion des pages Notion
 * Correspond à backend/api/page_routes.py
 */

import api from './api';

class PagesService {
  /**
   * Récupère toutes les pages
   */
  async getPages(forceRefresh = false) {
    return await api.get('/pages', { force_refresh: forceRefresh });
  }

  /**
   * Récupère les informations détaillées d'une page
   */
  async getPageInfo(pageId) {
    return await api.get(`/pages/${pageId}/info`);
  }

  /**
   * Récupère les bases de données
   */
  async getDatabases() {
    return await api.get('/databases');
  }

  /**
   * Récupère les changements depuis un timestamp
   */
  async getChangesSince(timestamp) {
    return await api.get('/pages/changes', { since: timestamp });
  }

  /**
   * Vide le cache et force une resynchronisation
   */
  async clearCache() {
    return await api.post('/clear_cache');
  }

  /**
   * Recherche des pages par titre
   */
  async searchPages(query) {
    const pages = await this.getPages();
    if (!pages.pages) return [];
    
    const queryLower = query.toLowerCase();
    return pages.pages.filter(page => 
      page.title.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Récupère les pages favorites (stockées localement)
   */
  getFavorites() {
    const stored = localStorage.getItem('notion_favorites');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Ajoute/retire une page des favoris
   */
  toggleFavorite(pageId) {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(pageId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(pageId);
    }
    
    localStorage.setItem('notion_favorites', JSON.stringify(favorites));
    return favorites;
  }

  /**
   * Récupère les pages récemment utilisées
   */
  getRecentPages(limit = 5) {
    const stored = localStorage.getItem('notion_recent_pages');
    const recent = stored ? JSON.parse(stored) : [];
    return recent.slice(0, limit);
  }

  /**
   * Ajoute une page aux pages récentes
   */
  addToRecent(pageId) {
    const recent = this.getRecentPages(20);
    const filtered = recent.filter(id => id !== pageId);
    filtered.unshift(pageId);
    
    localStorage.setItem('notion_recent_pages', JSON.stringify(filtered.slice(0, 20)));
    return filtered;
  }

  /**
   * Groupe les pages par type de parent
   */
  async getPagesByParentType() {
    const response = await this.getPages();
    const pages = response.pages || [];
    
    const grouped = {
      workspace: [],
      database: [],
      page: []
    };
    
    pages.forEach(page => {
      const type = page.parent_type || 'page';
      if (grouped[type]) {
        grouped[type].push(page);
      }
    });
    
    return grouped;
  }
}

const pagesService = new PagesService();
export default pagesService;