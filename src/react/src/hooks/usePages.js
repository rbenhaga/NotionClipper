// src/react/src/hooks/usePages.js
/**
 * Hook pour la gestion des pages Notion
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export function usePages() {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/pages`);
      if (response.data?.pages) {
        setPages(response.data.pages);
        // Extraire les favoris
        const favIds = response.data.pages
          .filter(p => p.favorite)
          .map(p => p.id);
        setFavorites(favIds);
      }
    } catch (error) {
      console.error('Erreur chargement pages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback((pageId) => {
    setFavorites(prev =>
      prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  }, []);

  // Filtrage des pages
  useEffect(() => {
    let filtered = [...pages];

    // Filtrer par recherche
    if (searchQuery) {
      filtered = filtered.filter(page =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrer par onglet
    switch (activeTab) {
      case 'suggested':
        filtered = filtered.filter(page => page.suggested);
        break;
      case 'favorites':
        filtered = filtered.filter(page => favorites.includes(page.id));
        break;
      case 'recent':
        filtered = filtered
          .sort((a, b) => new Date(b.lastEditedTime) - new Date(a.lastEditedTime))
          .slice(0, 10);
        break;
      case 'all':
      default:
        break;
    }

    setFilteredPages(filtered);
  }, [pages, searchQuery, activeTab, favorites]);

  return {
    pages,
    filteredPages,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    loadPages,
    favorites,
    toggleFavorite,
    loading
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