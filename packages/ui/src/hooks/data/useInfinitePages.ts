import { useState, useCallback, useEffect } from 'react';
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
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      let result;

      if (tab === 'recent' || tab === 'suggested') {
        result = await window.electronAPI?.getRecentPagesPaginated?.({
          cursor,
          limit: tab === 'suggested' ? 5 : 20
        });
      } else {
        result = await window.electronAPI?.getPagesPaginated?.({
          cursor,
          pageSize: tab === 'favorites' ? 20 : pageSize
        });
      }
      
      if (!result) {
        setError('API not available');
        setHasMore(false);
        return;
      }

      if (result.success && result.pages) {
        setPages(prev => cursor ? [...prev, ...result.pages] : result.pages);
        setHasMore(result.hasMore || false);
        setCursor(result.nextCursor);
      } else {
        setError(result.error || 'Failed to load pages');
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading pages:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [tab, cursor, loading, hasMore, pageSize]);

  const refresh = useCallback(async () => {
    setPages([]);
    setCursor(undefined);
    setHasMore(true);
    setError(null);
    await loadMore();
  }, [loadMore]);

  // Load first page when tab changes
  useEffect(() => {
    refresh();
  }, [tab]);

  return {
    pages,
    loading,
    hasMore,
    loadMore,
    refresh,
    error
  };
}