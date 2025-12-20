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

// 🔧 FIX: Generate unique request ID for stale request detection
let requestIdCounter = 0;
const generateRequestId = () => ++requestIdCounter;

export function useInfinitePages({ tab, pageSize = 50 }: UseInfinitePagesOptions): UseInfinitePagesReturn {
  // Cache des pages par onglet pour éviter de recharger à chaque changement
  const [pagesByTab, setPagesByTab] = useState<Record<string, NotionPage[]>>({});
  const [loading, setLoading] = useState(false);
  const [hasMoreByTab, setHasMoreByTab] = useState<Record<string, boolean>>({});
  const [cursorByTab, setCursorByTab] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  
  // 🔧 FIX: Track current scopeKey (userId:workspaceId) for isolation
  const [scopeKey, setScopeKey] = useState<string>('');
  const lastScopeKeyRef = useRef<string>('');
  
  // 🔧 FIX: Track latest request ID per tab to ignore stale responses
  const latestRequestIdByTab = useRef<Record<string, number>>({});
  
  // Ref pour éviter les boucles infinies
  const loadingRef = useRef(false);
  const initializedTabs = useRef<Set<string>>(new Set());
  
  // 🔧 FIX P0: Track if we have a valid token before loading
  const [hasToken, setHasToken] = useState(false);

  // Pages actuelles pour l'onglet actif
  const pages = pagesByTab[tab] || [];
  const hasMore = hasMoreByTab[tab] ?? true;
  const cursor = cursorByTab[tab];

  // 🔧 FIX: Clear all state when scope changes (user switch)
  const clearAllState = useCallback(async () => {
    console.log('[useInfinitePages] 🧹 Clearing all state (scope change)');
    setPagesByTab({});
    setCursorByTab({});
    setHasMoreByTab({});
    setError(null);
    initializedTabs.current.clear();
    // Invalidate all pending requests
    latestRequestIdByTab.current = {};
    
    // 🔧 Clear main process Notion cache to prevent stale data
    try {
      await window.electronAPI?.invoke?.('cache:clearNotionCache');
      console.log('[useInfinitePages] ✅ Main process Notion cache cleared');
    } catch (err) {
      console.warn('[useInfinitePages] ⚠️ Failed to clear main process cache:', err);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || loadingRef.current) return;
    
    // 🔧 FIX P0: Don't load if no token
    if (!hasToken) {
      console.log(`[useInfinitePages] ⏭️ Skipping loadMore - no token`);
      return;
    }
    
    // 🔧 CRITICAL: Don't load if scope not ready (prevents global cache pollution)
    if (!scopeKey) {
      console.log(`[useInfinitePages] ⏭️ Skipping loadMore - scope not ready (waiting for workspaceId)`);
      return;
    }

    // 🔧 FIX: Capture scopeKey at request time for stale detection
    const requestScopeKey = scopeKey;
    const requestId = generateRequestId();
    latestRequestIdByTab.current[tab] = requestId;

    console.log(`[useInfinitePages] Loading pages for tab: ${tab}, scope: ${requestScopeKey}, reqId: ${requestId}`);
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let result;

      // 🔧 PROTOCOL: Send scopeKey with every request for main process validation
      const requestOptions = { scopeKey: requestScopeKey };

      // Utiliser les bonnes API selon l'onglet
      switch (tab) {
        case 'favorites':
          result = await window.electronAPI?.getPagesPaginated?.({
            cursor,
            pageSize: 100,
            ...requestOptions
          });
          break;
          
        case 'suggested':
          result = await window.electronAPI?.getHybridSuggestions?.({
            content: '',
            pages: [],
            favorites: []
          });
          if (result && result.success) {
            const suggestionPages = (result.suggestions || []).map((s: any) => ({
              id: s.id,
              title: s.title,
              icon: null,
              last_edited_time: s.last_edited_time,
              parent: null,
              archived: false,
              in_trash: false,
              _suggestion: {
                score: s.score,
                reasons: s.reasons,
                isFavorite: s.isFavorite
              }
            }));
            result = {
              success: true,
              pages: suggestionPages,
              hasMore: false,
              nextCursor: undefined
            };
          }
          break;
          
        case 'recent':
          result = await window.electronAPI?.getRecentPagesPaginated?.({
            cursor,
            limit: 20,
            ...requestOptions
          });
          break;
          
        default: // 'all'
          if (!window.electronAPI?.getPagesPaginated) {
            setError('getPagesPaginated API not available');
            return;
          }
          result = await window.electronAPI.getPagesPaginated({
            cursor,
            pageSize,
            ...requestOptions
          });
          break;
      }

      // 🔧 FIX: Guard against stale responses - ignore if scope or request changed
      if (scopeKey !== requestScopeKey) {
        console.log(`[useInfinitePages] ⏭️ Ignoring stale response - scope changed (${requestScopeKey} → ${scopeKey})`);
        return;
      }
      if (latestRequestIdByTab.current[tab] !== requestId) {
        console.log(`[useInfinitePages] ⏭️ Ignoring stale response - newer request exists for tab ${tab}`);
        return;
      }
      
      if (!result) {
        setError('API not available');
        setHasMoreByTab(prev => ({ ...prev, [tab]: false }));
        return;
      }

      // 🔧 KILL SWITCH: Handle scope errors from main process
      if (result.error === 'SCOPE_NOT_SET' || result.error === 'SCOPE_MISMATCH' || result.error === 'SCOPE_REQUIRED') {
        console.warn(`[useInfinitePages] ⚠️ Main process rejected: ${result.error}`);
        // Don't set error state - this is expected during transitions
        // If SCOPE_REQUIRED, it means we have a bug (should never happen with proper guards)
        if (result.error === 'SCOPE_REQUIRED') {
          console.error('[useInfinitePages] 🐛 BUG: Request sent without scopeKey - this should not happen!');
        }
        // The scope will be set and request retried automatically via useEffect
        return;
      }

      // 🔧 PROTOCOL: Validate response scope matches request scope
      if (result.scopeKey && result.scopeKey !== requestScopeKey) {
        console.log(`[useInfinitePages] ⏭️ Ignoring response - scope mismatch (response: ${result.scopeKey}, expected: ${requestScopeKey})`);
        return;
      }

      if (result.success && result.pages) {
        setPagesByTab(prev => {
          const currentPages = prev[tab] || [];
          const newPages = cursor ? [...currentPages, ...result.pages] : result.pages;
          console.log(`[useInfinitePages] ✅ Updated ${tab}: ${currentPages.length} → ${newPages.length} pages (scope: ${requestScopeKey})`);
          return { ...prev, [tab]: newPages };
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
  }, [tab, cursor, loading, hasMore, pageSize, hasToken, scopeKey]);

  const refresh = useCallback(async () => {
    initializedTabs.current.delete(tab);
    setPagesByTab(prev => ({ ...prev, [tab]: [] }));
    setCursorByTab(prev => ({ ...prev, [tab]: undefined }));
    setHasMoreByTab(prev => ({ ...prev, [tab]: true }));
    setError(null);
    await loadMore();
  }, [tab, loadMore]);

  // 🔧 FIX: Centralized auth check - returns scopeKey (NOTION scope: user+workspace) and hasToken
  const checkAuthState = useCallback(async (): Promise<{ hasToken: boolean; scopeKey: string }> => {
    try {
      const result = await window.electronAPI?.getConfig?.();
      const config = result?.config || {};
      
      const hasValidToken = config.hasNotionToken === true;
      const userId = config.userId || '';
      const workspaceId = config.workspaceId || '';
      
      // 🔧 FIX: Use NOTION scope (user+workspace) for pages cache
      // Pages are workspace-specific, so we need both userId AND workspaceId
      // If workspaceId is not yet known, we wait (don't load pages)
      const newScopeKey = (userId && workspaceId) ? `user:${userId}:ws:${workspaceId}` : '';
      
      console.log(`[useInfinitePages] 🔍 Auth check: token=${hasValidToken ? '✅' : '❌'}, scope=${newScopeKey || 'pending (no workspace)'}`);
      
      // 🔧 FIX: Detect scope change and clear state immediately
      if (newScopeKey !== lastScopeKeyRef.current) {
        console.log(`[useInfinitePages] 🔄 Scope changed: ${lastScopeKeyRef.current || 'none'} → ${newScopeKey || 'none'}`);
        
        // Clear all cached data when user/workspace changes (BEFORE updating refs)
        if (lastScopeKeyRef.current !== '') {
          await clearAllState();
        }
        
        // 🔧 Set scope in main process NotionService for cache isolation
        if (newScopeKey) {
          try {
            await window.electronAPI?.invoke?.('notion:set-scope', newScopeKey);
            console.log(`[useInfinitePages] ✅ Main process scope set: ${newScopeKey}`);
          } catch (err) {
            console.warn('[useInfinitePages] ⚠️ Failed to set main process scope:', err);
          }
        }
        
        lastScopeKeyRef.current = newScopeKey;
        setScopeKey(newScopeKey);
      }
      
      setHasToken(hasValidToken);
      return { hasToken: hasValidToken, scopeKey: newScopeKey };
    } catch (error) {
      console.error('[useInfinitePages] Error checking auth:', error);
      setHasToken(false);
      return { hasToken: false, scopeKey: '' };
    }
  }, [clearAllState]);

  // Check auth on mount
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Load first page when tab changes - only if we have a token
  useEffect(() => {
    if (!hasToken || !scopeKey) return;
    
    // Use scoped key for initialization tracking
    const scopedTabKey = `${scopeKey}:${tab}`;
    if (!initializedTabs.current.has(scopedTabKey)) {
      console.log(`[useInfinitePages] ✅ Loading initial data for ${scopedTabKey}`);
      initializedTabs.current.add(scopedTabKey);
      loadMore();
    }
  }, [tab, loadMore, hasToken, scopeKey]);

  // Listen to auth changes
  useEffect(() => {
    const handleAuthDataChanged = async (event: CustomEvent) => {
      console.log('[useInfinitePages] 🔔 auth-data-changed:', event.detail);
      
      const userId = event.detail?.userId;
      
      if (userId) {
        // User logged in - check auth state (will detect scope change)
        const { hasToken: hasValidToken } = await checkAuthState();
        
        if (hasValidToken) {
          console.log('[useInfinitePages] ✅ Token detected, will reload on next render');
          // State is already cleared by checkAuthState if scope changed
          // loadMore will be triggered by the hasToken/scopeKey useEffect
        }
      } else {
        // User logged out - clear everything
        console.log('[useInfinitePages] 🚪 User logged out');
        setHasToken(false);
        setScopeKey('');
        lastScopeKeyRef.current = '';
        clearAllState();
      }
    };

    const handlePagesLoaded = async (event: any) => {
      const { pages: loadedPages, source } = event.detail || {};
      if (!loadedPages || !Array.isArray(loadedPages)) return;
      
      // 🔧 FIX: Verify scope before applying pages
      const { scopeKey: currentScope } = await checkAuthState();
      if (!currentScope) {
        console.log('[useInfinitePages] ⏭️ Ignoring pages-loaded - no scope');
        return;
      }
      
      console.log(`[useInfinitePages] 📄 Applying ${loadedPages.length} pages from ${source}`);
      setPagesByTab({ [tab]: loadedPages });
      setCursorByTab({ [tab]: undefined });
      setHasMoreByTab({ [tab]: loadedPages.length >= pageSize });
      
      const scopedTabKey = `${currentScope}:${tab}`;
      initializedTabs.current.clear();
      initializedTabs.current.add(scopedTabKey);
    };

    window.addEventListener('auth-data-changed', handleAuthDataChanged as unknown as EventListener);
    window.addEventListener('pages-loaded', handlePagesLoaded as unknown as EventListener);

    if ((window as any).electronAPI?.on) {
      (window as any).electronAPI.on('config:changed', checkAuthState);
    }

    return () => {
      window.removeEventListener('auth-data-changed', handleAuthDataChanged as unknown as EventListener);
      window.removeEventListener('pages-loaded', handlePagesLoaded as unknown as EventListener);
      if ((window as any).electronAPI?.removeListener) {
        (window as any).electronAPI.removeListener('config:changed', checkAuthState);
      }
    };
  }, [checkAuthState, clearAllState, tab, pageSize]);

  return {
    pages,
    loading,
    hasMore,
    loadMore,
    refresh,
    error
  };
}
