// src/react/src/hooks/usePages.js
import { useState, useEffect, useCallback } from 'react';
import pagesService from '../services/pages';

export function usePages() {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [recentPages, setRecentPages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Charger les pages
  const loadPages = useCallback(async (forceRefresh = false) => {
    setLoading(true);  // Forcer l'affichage du loading
    try {
      // Toujours charger les pages principales
      const response = await pagesService.getPages(forceRefresh);
      const allPages = response.pages || [];
      setPages(allPages);
      
      // Charger les favoris depuis le backend
      const favIds = await pagesService.getFavorites();
      setFavorites(favIds);

      // Charger les pages selon l'onglet actif
      if (activeTab === 'recent') {
        const recentResponse = await pagesService.getRecentPages();
        setRecentPages(recentResponse.pages || []);
        setFilteredPages(recentResponse.pages || []);
      } else if (activeTab === 'suggestions') {
        const suggestionsResponse = await pagesService.getSuggestions();
        setSuggestions(suggestionsResponse.pages || []);
        setFilteredPages(suggestionsResponse.pages || []);
      } else {
        // Pour 'all' et 'favorites', filtrer depuis les pages chargées
        filterPagesByTab(allPages, activeTab, favIds);
      }
    } catch (error) {
      console.error('Erreur chargement pages:', error);
      setPages([]);
      setFilteredPages([]);
    } finally {
      setTimeout(() => setLoading(false), 300);  // Délai pour l'effet visuel
    }
  }, [activeTab]);

  // Filtrer les pages par onglet
  const filterPagesByTab = useCallback((allPages, tab, favIds) => {
    let filtered = [];

    switch (tab) {
      case 'all':
        filtered = allPages;
        break;
      case 'favorites':
        filtered = allPages.filter(page => favIds.includes(page.id));
        break;
      case 'recent':
        // Les pages récentes sont déjà dans recentPages
        filtered = recentPages;
        break;
      case 'suggestions':
        // Les suggestions sont déjà dans suggestions
        filtered = suggestions;
        break;
      default:
        filtered = allPages;
    }

    // Appliquer la recherche si nécessaire
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(page => 
        (page.title || 'Sans titre').toLowerCase().includes(query)
      );
    }

    setFilteredPages(filtered);
  }, [searchQuery, recentPages, suggestions]);

  // Toggle favori avec backend
  const toggleFavorite = useCallback(async (pageId) => {
    try {
      const updatedFavorites = await pagesService.toggleFavorite(pageId);
      setFavorites(updatedFavorites);
      
      // Refilter si on est sur l'onglet favoris
      if (activeTab === 'favorites') {
        filterPagesByTab(pages, activeTab, updatedFavorites);
      }
      
      return updatedFavorites;
    } catch (error) {
      console.error('Erreur toggle favori:', error);
      return favorites;
    }
  }, [activeTab, pages, favorites, filterPagesByTab]);

  // Mettre à jour les pages récentes
  const addToRecent = useCallback((pageId) => {
    pagesService.addToRecent(pageId);
    // Si on est sur l'onglet récent, recharger
    if (activeTab === 'recent') {
      loadPages();
    }
  }, [activeTab, loadPages]);

  useEffect(() => {
    loadPages();
  }, []);

  // Idem pour syncFavorites - le faire seulement sur demande
  /*
  useEffect(() => {
    const syncFavorites = async () => {
      try {
        const synced = await pagesService.syncFavorites();
        setFavorites(synced);
      } catch (error) {
        console.error('Erreur sync favoris:', error);
      }
    };
    
    syncFavorites();
  }, []);
  */

  // Effet pour recharger quand l'onglet change
  useEffect(() => {
    loadPages();
  }, [activeTab]);

  // Effet pour filtrer quand la recherche change
  useEffect(() => {
    if (activeTab === 'recent' || activeTab === 'suggestions') {
      // Pour recent/suggestions, refiltrer les pages déjà chargées
      const pagesToFilter = activeTab === 'recent' ? recentPages : suggestions;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const filtered = pagesToFilter.filter(page => 
          (page.title || 'Sans titre').toLowerCase().includes(query)
        );
        setFilteredPages(filtered);
      } else {
        setFilteredPages(pagesToFilter);
      }
    } else if (pages.length > 0) {
      // Pour all/favorites
      filterPagesByTab(pages, activeTab, favorites);
    }
  }, [searchQuery, pages, activeTab, favorites, recentPages, suggestions, filterPagesByTab]);

  // Recherche asynchrone
  const searchPages = useCallback(async (query) => {
    if (!query) {
      setSearchQuery('');
      return;
    }
    
    setSearchQuery(query);
    
    // Si on est sur recent/suggestions, filtrer localement
    if (activeTab === 'recent' || activeTab === 'suggestions') {
      return; // Le useEffect ci-dessus s'en occupe
    }
    
    // Sinon, faire une recherche serveur
    try {
      const results = await pagesService.searchPages(query);
      setFilteredPages(results);
    } catch (error) {
      console.error('Erreur recherche:', error);
      // Fallback sur filtrage local
      filterPagesByTab(pages, activeTab, favorites);
    }
  }, [activeTab, pages, favorites, filterPagesByTab]);

  return {
    pages,
    filteredPages,
    searchQuery,
    setSearchQuery: searchPages,
    activeTab,
    setActiveTab,
    pagesLoading: loading,
    loadPages,
    favorites,
    toggleFavorite,
    addToRecent,
    recentPages,
    suggestions
  };
}