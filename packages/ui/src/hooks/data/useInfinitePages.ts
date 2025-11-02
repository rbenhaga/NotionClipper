import { useState, useCallback, useEffect, useRef } from 'react';
import type { NotionPage } from '../../lib/types';

interface UseInfinitePagesOptions {
  tab: 'all' | 'recent' | 'favorites' | 'suggested';
  pageSize?: number;
}

interface UseInfinitePagesReturn {
  pages: NotionPage[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  error: string | null;
}

export function useInfinitePages({ tab, pageSize = 50 }: UseInfinitePagesOptions): UseInfinitePagesReturn {
  // Cache des pages par onglet pour éviter de recharger à chaque changement
  const [pagesByTab, setPagesByTab] = useState<Record<string, NotionPage[]>>({});
  const [loading, setLoading] = useState(false);
  const [hasMoreByTab, setHasMoreByTab] = useState<Record<string, boolean>>({});
  const [cursorByTab, setCursorByTab] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Ref pour éviter les boucles infinies
  const loadingRef = useRef(false);
  const initializedTabs = useRef<Set<string>>(new Set());

  // Pages actuelles pour l'onglet actif
  const pages = pagesByTab[tab] || [];
  const hasMore = hasMoreByTab[tab] ?? true;
  const cursor = cursorByTab[tab];

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || loadingRef.current) return;

    console.log(`[useInfinitePages] Loading more pages for tab: ${tab}, cursor: ${cursor}`);
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let result;

      // Utiliser les bonnes API selon l'onglet
      switch (tab) {
        case 'favorites':
          // Pour les favoris, charger toutes les pages et filtrer côté client
          result = await window.electronAPI?.getPagesPaginated?.({
            cursor,
            pageSize: 100 // Charger plus pour avoir assez de pages à filtrer
          });
          // Le filtrage des favoris se fait dans usePages
          break;
          
        case 'suggested':
          // Pour les suggestions, utiliser l'API de suggestions
          result = await window.electronAPI?.getHybridSuggestions?.({
            content: '',
            pages: [],
            favorites: []
          });
          if (result && result.success) {
            // Convertir les suggestions en format de pages
            const suggestionPages = (result.suggestions || []).map((s: any) => ({
              id: s.id,
              title: s.title,
              icon: null,
              last_edited_time: s.last_edited_time,
              parent: null,
              archived: false,
              in_trash: false,
              // Ajouter les propriétés de suggestion
              _suggestion: {
                score: s.score,
                reasons: s.reasons,
                isFavorite: s.isFavorite
              }
            }));
            
            result = {
              success: true,
              pages: suggestionPages,
              hasMore: false, // Les suggestions sont limitées
              nextCursor: undefined
            };
          }
          break;
          
        case 'recent':
          result = await window.electronAPI?.getRecentPagesPaginated?.({
            cursor,
            limit: 20
          });
          break;
          
        default: // 'all'
          result = await window.electronAPI?.getPagesPaginated?.({
            cursor,
            pageSize
          });
          break;
      }
      
      if (!result) {
        setError('API not available');
        setHasMoreByTab(prev => ({ ...prev, [tab]: false }));
        return;
      }

      if (result.success && result.pages) {
        // Ajouter les nouvelles pages sans réinitialiser la liste
        setPagesByTab(prev => {
          const currentPages = prev[tab] || [];
          const newPages = cursor ? [...currentPages, ...result.pages] : result.pages;
          console.log(`[useInfinitePages] Updated pages count for ${tab}: ${currentPages.length} -> ${newPages.length}`);
          return {
            ...prev,
            [tab]: newPages
          };
        });
        setHasMoreByTab(prev => ({ ...prev, [tab]: result.hasMore || false }));
        setCursorByTab(prev => ({ ...prev, [tab]: result.nextCursor }));
      } else {
        setError(result.error || 'Failed to load pages');
        setHasMoreByTab(prev => ({ ...prev, [tab]: false }));
      }
    } catch (err) {
      console.error('Error loading pages:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setHasMoreByTab(prev => ({ ...prev, [tab]: false }));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [tab, cursor, loading, hasMore, pageSize]);

  const refresh = useCallback(async () => {
    initializedTabs.current.delete(tab);
    setPagesByTab(prev => ({ ...prev, [tab]: [] }));
    setCursorByTab(prev => ({ ...prev, [tab]: undefined }));
    setHasMoreByTab(prev => ({ ...prev, [tab]: true }));
    setError(null);
    await loadMore();
  }, [tab, loadMore]);

  // Load first page when tab changes (seulement si pas déjà initialisé)
  useEffect(() => {
    if (!initializedTabs.current.has(tab)) {
      console.log(`[useInfinitePages] Loading initial data for tab: ${tab}`);
      initializedTabs.current.add(tab);
      loadMore();
    } else {
      console.log(`[useInfinitePages] Using cached data for tab: ${tab} (${pages.length} pages)`);
    }
  }, [tab, loadMore, pages.length]);

  return {
    pages,
    loading,
    hasMore,
    loadMore,
    refresh,
    error
  };
}