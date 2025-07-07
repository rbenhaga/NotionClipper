// src/react/src/hooks/useSuggestions.js
import { useState, useCallback, useRef, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [method, setMethod] = useState('lexical');
  
  // Cache local pour éviter les appels répétés
  const cacheRef = useRef({});
  const lastRequestRef = useRef(null);
  
  // Nettoyer le cache après 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      Object.keys(cacheRef.current).forEach(key => {
        if (now - cacheRef.current[key].timestamp > 300000) { // 5 minutes
          delete cacheRef.current[key];
        }
      });
    }, 60000); // Vérifier chaque minute
    
    return () => clearInterval(interval);
  }, []);
  
  const getSuggestions = useCallback(async (clipboardContent, pages, favorites, options = {}) => {
    if (!clipboardContent || !pages || pages.length === 0) {
      setSuggestions([]);
      return [];
    }
    
    // Clé de cache basée sur le contenu
    const cacheKey = `${clipboardContent.substring(0, 100)}_${pages.length}_${favorites.length}`;
    
    // Vérifier le cache local
    if (cacheRef.current[cacheKey] && !options.forceRefresh) {
      const cached = cacheRef.current[cacheKey];
      if (Date.now() - cached.timestamp < 60000) { // Cache valide 1 minute
        setSuggestions(cached.suggestions);
        setMethod(cached.method);
        return cached.suggestions;
      }
    }
    
    // Éviter les requêtes en double
    if (lastRequestRef.current === cacheKey && loading) {
      return suggestions;
    }
    
    lastRequestRef.current = cacheKey;
    setLoading(true);
    
    try {
      // Décider si on doit utiliser l'API ou le calcul local
      const wordCount = clipboardContent.split(/\s+/).length;
      const shouldUseAPI = wordCount >= 10 && pages.length > 50; // Seuils ajustables
      
      let result;
      
      if (shouldUseAPI) {
        // Utiliser l'API pour l'analyse hybride
        const response = await fetch(`${API_URL}/suggestions/hybrid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clipboardContent,
            favorites,
            useSemantic: wordCount >= 20, // Sémantique seulement pour du contenu long
            semanticThreshold: 20
          })
        });
        
        if (!response.ok) {
          throw new Error('Erreur API suggestions');
        }
        
        const data = await response.json();
        
        if (data.fallback) {
          // L'API n'est pas disponible, utiliser le calcul local
          result = calculateLocalSuggestions(clipboardContent, pages, favorites);
        } else {
          // Mapper les suggestions de l'API avec les pages complètes
          const pageMap = new Map(pages.map(p => [p.id, p]));
          result = {
            suggestions: data.suggestions.map(s => pageMap.get(s.id)).filter(Boolean),
            method: data.method
          };
          
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } else {
        // Utiliser le calcul local pour les cas simples
        result = calculateLocalSuggestions(clipboardContent, pages, favorites);
      }
      
      // Mettre en cache
      cacheRef.current[cacheKey] = {
        suggestions: result.suggestions,
        method: result.method,
        timestamp: Date.now()
      };
      
      setSuggestions(result.suggestions);
      setMethod(result.method);
      
      return result.suggestions;
      
    } catch (error) {
      console.error('Erreur suggestions:', error);
      
      // Fallback sur calcul local en cas d'erreur
      const result = calculateLocalSuggestions(clipboardContent, pages, favorites);
      setSuggestions(result.suggestions);
      setMethod('lexical_fallback');
      
      return result.suggestions;
      
    } finally {
      setLoading(false);
    }
  }, [suggestions, loading]);
  
  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);
  
  const getStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/suggestions/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        return data;
      }
    } catch (error) {
      console.error('Erreur récupération stats:', error);
    }
    return null;
  }, []);
  
  return {
    suggestions,
    loading,
    method,
    stats,
    getSuggestions,
    clearCache,
    getStats
  };
}

// Fonction de calcul local (fallback)
function calculateLocalSuggestions(clipboardContent, pages, favorites = []) {
  const suggestions = [];
  const clipboardLower = clipboardContent.toLowerCase();
  
  // Mots significatifs du presse-papiers
  const stopWords = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'pour', 'dans']);
  const clipboardWords = clipboardLower
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  for (const page of pages) {
    let score = 0;
    const pageTitle = (page.title || 'Sans titre').toLowerCase();
    
    // Correspondance exacte
    if (pageTitle === clipboardLower) {
      score += 100;
    }
    // Correspondance partielle
    else if (pageTitle.includes(clipboardLower) || clipboardLower.includes(pageTitle)) {
      score += 60;
    }
    // Correspondance par mots
    else {
      const titleWords = pageTitle.split(/\s+/);
      clipboardWords.forEach(clipWord => {
        if (titleWords.some(titleWord => 
          titleWord.includes(clipWord) || clipWord.includes(titleWord)
        )) {
          score += 10;
        }
      });
    }
    
    // Bonus récence
    if (page.last_edited_time) {
      const hoursSince = (Date.now() - new Date(page.last_edited_time)) / (1000 * 60 * 60);
      if (hoursSince < 24) score += 30;
      else if (hoursSince < 168) score += 20;
      else if (hoursSince < 720) score += 10;
    }
    
    // Bonus favoris
    if (favorites.includes(page.id)) {
      score += 25;
    }
    
    // Bonus page parente
    if (!page.parent_id || page.parent_type === 'workspace') {
      score += 15;
    }
    
    if (score > 0) {
      suggestions.push({ page, score });
    }
  }
  
  // Trier et retourner les meilleures
  suggestions.sort((a, b) => b.score - a.score);
  
  return {
    suggestions: suggestions.slice(0, 30).map(s => s.page),
    method: 'lexical_local'
  };
}