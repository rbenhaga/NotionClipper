// src/react/src/hooks/usePages.js
import { useState, useEffect, useCallback } from 'react';
import pagesService from '../services/pages';

const calculateSuggestionScore = (page, favorites = [], clipboardContent = '') => {
  let score = 0;
  let debugInfo = {}; // Pour debug si nécessaire
  
  // 1. PERTINENCE DU CONTENU (priorité maximale)
  if (clipboardContent && page.title) {
    const clipboardLower = clipboardContent.toLowerCase().trim();
    const titleLower = (page.title || '').toLowerCase();
    
    // Correspondance exacte du titre
    if (titleLower === clipboardLower) {
      score += 200;
      debugInfo.exactMatch = true;
    }
    // Le titre contient exactement le clipboard
    else if (titleLower.includes(clipboardLower) && clipboardLower.length > 3) {
      score += 100;
      debugInfo.contains = true;
    }
    // Le clipboard contient le titre
    else if (clipboardLower.includes(titleLower) && titleLower.length > 3) {
      score += 80;
      debugInfo.contained = true;
    }
    // Analyse par mots-clés
    else {
      // Mots à ignorer
      const stopWords = new Set([
        'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'pour', 
        'dans', 'avec', 'sans', 'sous', 'sur', 'par', 'vers', 'chez',
        'et', 'ou', 'ni', 'mais', 'donc', 'or', 'car', 'que', 'qui',
        'à', 'au', 'aux', 'ce', 'ces', 'cet', 'cette', 'son', 'sa', 'ses'
      ]);
      
      // Extraire les mots significatifs
      const extractKeywords = (text) => {
        return text
          .toLowerCase()
          .split(/[\s\-_.,;:!?'"()\[\]{}]+/)
          .filter(word => word.length >= 3 && !stopWords.has(word))
          .slice(0, 10); // Limiter pour performance
      };
      
      const clipboardWords = extractKeywords(clipboardLower);
      const titleWords = extractKeywords(titleLower);
      
      // Calculer les correspondances
      let matchCount = 0;
      clipboardWords.forEach(clipWord => {
        titleWords.forEach(titleWord => {
          // Correspondance exacte
          if (clipWord === titleWord) {
            matchCount += 2;
          }
          // Correspondance partielle (au moins 3 caractères en commun)
          else if (clipWord.length >= 4 && titleWord.length >= 4) {
            if (titleWord.includes(clipWord) || clipWord.includes(titleWord)) {
              matchCount += 1;
            }
          }
        });
      });
      
      // Score basé sur le nombre de correspondances
      if (matchCount > 0) {
        score += Math.min(matchCount * 15, 90); // Plafonner à 90
        debugInfo.keywordMatches = matchCount;
      }
    }
  }
  
  // 2. RÉCENCE (facteur secondaire important)
  if (page.last_edited_time || page.last_edited) {
    const lastEdited = new Date(page.last_edited_time || page.last_edited);
    const hoursSinceEdit = (Date.now() - lastEdited) / (1000 * 60 * 60);
    
    if (hoursSinceEdit < 1) {
      score += 40; // Dernière heure
    } else if (hoursSinceEdit < 24) {
      score += 30; // Aujourd'hui
    } else if (hoursSinceEdit < 72) {
      score += 20; // 3 derniers jours
    } else if (hoursSinceEdit < 168) {
      score += 10; // Cette semaine
    } else if (hoursSinceEdit < 720) {
      score += 5; // Ce mois
    }
  }
  
  // 3. FAVORIS (bonus modéré)
  if (favorites.includes(page.id)) {
    score += 15; // Réduit de 40 à 15
  }
  
  // 4. TYPE DE PAGE (bonus mineur)
  if (!page.parent_id || page.parent_type === 'workspace') {
    score += 10; // Pages racines
  }
  
  // 5. PÉNALITÉS
  if (page.archived) score = Math.max(0, score - 100);
  if (page.in_trash) return 0; // Exclure complètement
  
  // Debug (optionnel)
  // if (score > 0) console.log(page.title, score, debugInfo);
  
  return score;
};

export function usePages(initialTab = 'all', clipboardContent = '') {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [recentPages, setRecentPages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  // Ajouter un état pour le contenu du presse-papiers
  const [currentClipboard, setCurrentClipboard] = useState(clipboardContent);
  useEffect(() => {
    setCurrentClipboard(clipboardContent);
  }, [clipboardContent]);

  // Charger les favoris depuis localStorage
  const loadFavorites = useCallback(() => {
    const favIds = pagesService.getFavorites();
    setFavorites(favIds);
    return favIds;
  }, []);

  // Charger toutes les pages
  const loadAllPages = useCallback(async (forceRefresh = false) => {
    try {
      const response = await pagesService.getPages(forceRefresh);
      const allPages = response.pages || [];
      setPages(allPages);
      return allPages;
    } catch (error) {
      console.error('Erreur chargement pages:', error);
      setPages([]);
      return [];
    }
  }, []);

  // Charger les données spécifiques selon l'onglet
  const loadTabData = useCallback(async (tab) => {
    try {
      switch (tab) {
        case 'recent':
          const recentResponse = await pagesService.getRecentPages();
          const recentData = recentResponse.pages || [];
          setRecentPages(recentData);
          return recentData;
        case 'suggested': // Harmonisé avec l'UI
          // Essayer de charger depuis le backend
          try {
            const suggestionsResponse = await pagesService.getSuggestions();
            const suggestionsData = suggestionsResponse.pages || [];
            setSuggestions(suggestionsData);
            return suggestionsData;
          } catch (error) {
            // Si erreur, on utilisera le calcul local
            console.log('Calcul local des suggestions');
            return [];
          }
        default:
          return null;
      }
    } catch (error) {
      console.error(`Erreur chargement ${tab}:`, error);
      return [];
    }
  }, []);

  // Filtrer les pages selon l'onglet et la recherche
  const applyFilter = useCallback((allPages, tab, favIds, search = '', clipboardContentParam = '') => {
    let filtered = [];
    switch (tab) {
      case 'all':
        filtered = allPages;
        break;
      case 'favorites':
        filtered = allPages.filter(page => favIds.includes(page.id));
        break;
      case 'recent':
        filtered = recentPages.length > 0 ? recentPages : allPages.slice(0, 20);
        break;
      case 'suggested':
        // Si on a des suggestions du backend ET qu'elles sont récentes
        if (suggestions.length > 0) {
          filtered = suggestions;
        } else {
          // Calcul local avec limite stricte
          const scoredPages = allPages
            .map(page => ({
              page,
              score: calculateSuggestionScore(page, favIds, clipboardContentParam)
            }))
            .filter(item => item.score > 20) // Seuil minimum de pertinence
            .sort((a, b) => b.score - a.score)
            .slice(0, 15); // Limiter à 15 suggestions max
          
          filtered = scoredPages.map(item => item.page);
          
          // Si pas assez de suggestions pertinentes, ajouter les plus récentes
          if (filtered.length < 5) {
            const recentNotIncluded = allPages
              .filter(p => !filtered.some(f => f.id === p.id))
              .sort((a, b) => 
                new Date(b.last_edited_time || 0) - new Date(a.last_edited_time || 0)
              )
              .slice(0, 5 - filtered.length);
            
            filtered = [...filtered, ...recentNotIncluded];
          }
        }
        break;
      default:
        filtered = allPages;
    }
    // Appliquer la recherche
    if (search && search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(page => 
        (page.title || 'Sans titre').toLowerCase().includes(query) ||
        (page.parent_title || '').toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [recentPages, suggestions]);

  // Fonction principale de chargement
  const loadPages = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const favIds = loadFavorites();
      const allPages = await loadAllPages(forceRefresh);
      if (activeTab === 'recent' || activeTab === 'suggested') {
        await loadTabData(activeTab);
      }
      const filtered = applyFilter(allPages, activeTab, favIds, searchQuery, currentClipboard);
      setFilteredPages(filtered);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setFilteredPages([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, loadFavorites, loadAllPages, loadTabData, applyFilter, currentClipboard]);

  // Effet pour charger quand l'onglet change
  useEffect(() => {
    const updateFilter = async () => {
      setLoading(true);
      try {
        const favIds = loadFavorites();
        if (pages.length > 0) {
          if ((activeTab === 'recent' && recentPages.length === 0) || 
              (activeTab === 'suggested' && suggestions.length === 0)) {
            await loadTabData(activeTab);
          }
          const filtered = applyFilter(pages, activeTab, favIds, searchQuery, currentClipboard);
          setFilteredPages(filtered);
        } else {
          await loadPages();
        }
      } finally {
        setLoading(false);
      }
    };
    updateFilter();
  }, [activeTab]);

  // Effet pour la recherche
  useEffect(() => {
    const favIds = favorites;
    const filtered = applyFilter(pages, activeTab, favIds, searchQuery, currentClipboard);
    setFilteredPages(filtered);
  }, [searchQuery, pages, activeTab, favorites, applyFilter, currentClipboard]);

  // Effet pour recalculer suggestions quand le presse-papiers change
  useEffect(() => {
    if (activeTab === 'suggested' && currentClipboard !== clipboardContent) {
      setCurrentClipboard(clipboardContent);
      const favIds = favorites;
      const filtered = applyFilter(pages, activeTab, favIds, searchQuery, clipboardContent);
      setFilteredPages(filtered);
    }
  }, [clipboardContent, activeTab, pages, favorites, searchQuery, applyFilter]);

  // Toggle favori
  const toggleFavorite = useCallback(async (pageId) => {
    try {
      const updatedFavorites = await pagesService.toggleFavorite(pageId);
      setFavorites(updatedFavorites);
      
      // Refilter si nécessaire
      if (activeTab === 'favorites') {
        const filtered = applyFilter(pages, activeTab, updatedFavorites, searchQuery, currentClipboard);
        setFilteredPages(filtered);
      }
      
      return updatedFavorites;
    } catch (error) {
      console.error('Erreur toggle favori:', error);
      return favorites;
    }
  }, [activeTab, pages, searchQuery, applyFilter, currentClipboard]);

  // Ajouter aux récents
  const addToRecent = useCallback((pageId) => {
    pagesService.addToRecent(pageId);
  }, []);

  // Chargement initial
  useEffect(() => {
    loadPages();
  }, []);

  return {
    pages,
    filteredPages,
    searchQuery,
    setSearchQuery,
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