// src/react/src/hooks/usePages.js
/**
 * Hook pour la gestion des pages Notion
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import pagesService from '../services/pages';
import { useApi } from './useApi';

export function usePages() {
  const [pages, setPages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recentPages, setRecentPages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, workspace, database, page

  const { loading, error, execute: fetchPages } = useApi(pagesService.getPages);

  // Charger les pages au montage
  useEffect(() => {
    loadPages();
    loadFavorites();
    loadRecentPages();
  }, []);

  // Charger les pages
  const loadPages = useCallback(async (forceRefresh = false) => {
    try {
      const response = await fetchPages(forceRefresh);
      setPages(response.pages || []);
      return response.pages;
    } catch (error) {
      console.error('Erreur lors du chargement des pages:', error);
      return [];
    }
  }, [fetchPages]);

  // Charger les favoris
  const loadFavorites = useCallback(() => {
    const favs = pagesService.getFavorites();
    setFavorites(favs);
  }, []);

  // Charger les pages récentes
  const loadRecentPages = useCallback(() => {
    const recent = pagesService.getRecentPages();
    setRecentPages(recent);
  }, []);

  // Rafraîchir les pages
  const refreshPages = useCallback(async () => {
    return await loadPages(true);
  }, [loadPages]);

  // Basculer favori
  const toggleFavorite = useCallback((pageId) => {
    const newFavorites = pagesService.toggleFavorite(pageId);
    setFavorites(newFavorites);
    return newFavorites.includes(pageId);
  }, []);

  // Ajouter aux pages récentes
  const addToRecent = useCallback((pageId) => {
    pagesService.addToRecent(pageId);
    loadRecentPages();
  }, [loadRecentPages]);

  // Filtrer les pages
  const filteredPages = useMemo(() => {
    let filtered = pages;

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(page => 
        (page.title || '').toLowerCase().includes(query)
      );
    }

    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(page => 
        page.parent_type === filterType
      );
    }

    return filtered;
  }, [pages, searchQuery, filterType]);

  // Pages favorites filtrées
  const favoritePages = useMemo(() => {
    return pages.filter(page => favorites.includes(page.id));
  }, [pages, favorites]);

  // Pages récentes avec infos complètes
  const recentPagesWithInfo = useMemo(() => {
    return recentPages
      .map(pageId => pages.find(p => p.id === pageId))
      .filter(Boolean);
  }, [pages, recentPages]);

  // Pages suggérées (favorites + récentes)
  const suggestedPages = useMemo(() => {
    const suggested = new Map();
    
    // Ajouter les favoris
    favoritePages.forEach(page => {
      suggested.set(page.id, { ...page, reason: 'favorite' });
    });
    
    // Ajouter les récentes
    recentPagesWithInfo.forEach(page => {
      if (!suggested.has(page.id)) {
        suggested.set(page.id, { ...page, reason: 'recent' });
      }
    });
    
    return Array.from(suggested.values());
  }, [favoritePages, recentPagesWithInfo]);

  // Statistiques
  const stats = useMemo(() => ({
    total: pages.length,
    favorites: favoritePages.length,
    recent: recentPagesWithInfo.length,
    byType: {
      workspace: pages.filter(p => p.parent_type === 'workspace').length,
      database: pages.filter(p => p.parent_type === 'database').length,
      page: pages.filter(p => p.parent_type === 'page').length,
    }
  }), [pages, favoritePages, recentPagesWithInfo]);

  return {
    // État
    pages,
    filteredPages,
    favoritePages,
    recentPagesWithInfo,
    suggestedPages,
    favorites,
    loading,
    error,
    stats,
    
    // Filtres
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    
    // Actions
    loadPages,
    refreshPages,
    toggleFavorite,
    addToRecent,
  };
}

/**
 * Hook pour une page spécifique
 */
export function usePage(pageId) {
  const { data, loading, error, execute } = useApi(pagesService.getPageInfo);

  useEffect(() => {
    if (pageId) {
      execute(pageId);
    }
  }, [pageId, execute]);

  return {
    page: data,
    loading,
    error,
    refresh: () => execute(pageId)
  };
}

/**
 * Hook pour la sélection multiple de pages
 */
export function usePageSelection() {
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const toggleSelection = useCallback((pageId) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((pageIds) => {
    setSelectedPages(new Set(pageIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  const isSelected = useCallback((pageId) => {
    return selectedPages.has(pageId);
  }, [selectedPages]);

  return {
    selectedPages: Array.from(selectedPages),
    selectedCount: selectedPages.size,
    multiSelectMode,
    setMultiSelectMode,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}