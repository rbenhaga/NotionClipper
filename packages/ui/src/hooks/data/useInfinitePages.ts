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
  const [lastTokenCheck, setLastTokenCheck] = useState<string>(''); // 🔥 NOUVEAU: Détecter les changements de token
  
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
          console.log(`[useInfinitePages] Calling getPagesPaginated for favorites...`);
          result = await window.electronAPI?.getPagesPaginated?.({
            cursor,
            pageSize: 100 // Charger plus pour avoir assez de pages à filtrer
          });
          console.log(`[useInfinitePages] getPagesPaginated result for favorites:`, result);
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
          console.log(`[useInfinitePages] Calling getPagesPaginated for all pages...`);
          console.log(`[useInfinitePages] electronAPI available:`, !!window.electronAPI);
          console.log(`[useInfinitePages] getPagesPaginated available:`, !!window.electronAPI?.getPagesPaginated);
          
          if (!window.electronAPI?.getPagesPaginated) {
            console.error(`[useInfinitePages] getPagesPaginated is not available!`);
            setError('getPagesPaginated API not available');
            return;
          }
          
          result = await window.electronAPI.getPagesPaginated({
            cursor,
            pageSize
          });
          console.log(`[useInfinitePages] getPagesPaginated result for all:`, result);
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

  // Load first page when tab changes - Version simplifiée qui essaie toujours
  useEffect(() => {
    if (!initializedTabs.current.has(tab)) {
      console.log(`[useInfinitePages] Loading initial data for tab: ${tab}`);
      initializedTabs.current.add(tab);
      loadMore();
    } else {
      console.log(`[useInfinitePages] Using cached data for tab: ${tab} (${pages.length} pages)`);
    }
  }, [tab, loadMore, pages.length]);

  // 🔥 NOUVEAU: Écouter les événements de changement de config au lieu de poller
  useEffect(() => {
    const handleConfigChanged = async (eventData?: any) => {
      try {
        // Récupérer la config actuelle
        const config = await window.electronAPI?.getConfig?.();
        const currentToken = config?.notionToken || config?.notionToken_encrypted || '';
        
        if (currentToken && currentToken !== lastTokenCheck) {
          console.log('[useInfinitePages] 🔄 Token changed, reloading all pages...');
          setLastTokenCheck(currentToken);
          
          // Vider tous les caches et recharger
          setPagesByTab({});
          setCursorByTab({});
          setHasMoreByTab({});
          initializedTabs.current.clear();
          
          // Recharger l'onglet actuel
          setTimeout(() => loadMore(), 100);
        } else if (!currentToken && lastTokenCheck) {
          // Token supprimé (déconnexion)
          console.log('[useInfinitePages] 🚪 Token removed, clearing pages...');
          setLastTokenCheck('');
          setPagesByTab({});
          setCursorByTab({});
          setHasMoreByTab({});
          initializedTabs.current.clear();
        }
      } catch (error) {
        console.error('[useInfinitePages] Error handling config change:', error);
      }
    };

    // Vérifier le token au démarrage
    const checkInitialToken = async () => {
      try {
        const config = await window.electronAPI?.getConfig?.();
        const currentToken = config?.notionToken || config?.notionToken_encrypted || '';
        setLastTokenCheck(currentToken);
      } catch (error) {
        console.error('[useInfinitePages] Error checking initial token:', error);
      }
    };

    checkInitialToken();

    // Écouter les événements de connexion/déconnexion
    if ((window as any).electronAPI?.on) {
      (window as any).electronAPI.on('oauth:success', handleConfigChanged);
      (window as any).electronAPI.on('config:changed', handleConfigChanged);
    }

    // 🔥 NOUVEAU: Écouter l'événement de pages chargées directement
    const handlePagesLoaded = (event: any) => {
      console.log('[useInfinitePages] 📄 Pages loaded event received:', event.detail);
      const { pages, source } = event.detail;
      
      if (pages && Array.isArray(pages)) {
        console.log(`[useInfinitePages] 🔄 Forcing reload with ${pages.length} pages from ${source}`);
        
        // Vider tous les caches et forcer le rechargement
        setPagesByTab({ [tab]: pages });
        setCursorByTab({ [tab]: undefined });
        setHasMoreByTab({ [tab]: pages.length >= pageSize });
        initializedTabs.current.clear();
        initializedTabs.current.add(tab);
        
        // Mettre à jour le token check
        handleConfigChanged();
      }
    };

    const handleTokenChanged = () => {
      console.log('[useInfinitePages] 🔄 Custom token-changed event received');
      handleConfigChanged();
    };

    window.addEventListener('pages-loaded', handlePagesLoaded);
    window.addEventListener('token-changed', handleTokenChanged);

    return () => {
      if ((window as any).electronAPI?.removeListener) {
        (window as any).electronAPI.removeListener('oauth:success', handleConfigChanged);
        (window as any).electronAPI.removeListener('config:changed', handleConfigChanged);
      }
      window.removeEventListener('pages-loaded', handlePagesLoaded);
      window.removeEventListener('token-changed', handleTokenChanged);
    };
  }, [lastTokenCheck, loadMore]);

  return {
    pages,
    loading,
    hasMore,
    loadMore,
    refresh,
    error
  };
}