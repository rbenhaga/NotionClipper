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
    return pages.pages.filter(page => (page.title || '').toLowerCase().includes(queryLower));
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
   * Récupère les pages récemment utilisées depuis le backend
   */
  async getRecentPages() {
    return await api.get('/pages/recent');
  }

  /**
   * Récupère les suggestions de pages depuis le backend
   */
  async getSuggestions() {
    return await api.get('/pages/suggestions');
  }

  /**
   * Ajoute une page aux pages récentes (stockage local + notif backend)
   */
  addToRecent(pageId) {
    const stored = localStorage.getItem('notion_recent_pages');
    const recent = stored ? JSON.parse(stored) : [];
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

  /**
   * Synchronise les favoris locaux avec le backend
   */
  async syncFavorites() {
    try {
      // Récupérer les favoris du backend
      const backendFavorites = await this.getFavorites();
      
      // Récupérer les favoris locaux
      const stored = localStorage.getItem('notion_favorites');
      const localFavorites = stored ? JSON.parse(stored) : [];
      
      // Fusionner (union des deux)
      const mergedFavorites = [...new Set([...backendFavorites, ...localFavorites])];
      
      // Sauvegarder la fusion
      if (mergedFavorites.length > 0) {
        await api.post('/config/preferences', {
          favorites: mergedFavorites
        });
        localStorage.setItem('notion_favorites', JSON.stringify(mergedFavorites));
      }
      
      return mergedFavorites;
    } catch (error) {
      console.error('Erreur sync favoris:', error);
      return [];
    }
  }
}

const pagesService = new PagesService();
export default pagesService;