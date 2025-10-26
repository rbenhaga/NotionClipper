import { useState, useEffect, useCallback } from 'react';

export function useHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async (filter?: any) => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI.history.getAll(filter);
      if (result.success) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI.history.getStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const retry = useCallback(async (id: string) => {
    try {
      const result = await (window as any).electronAPI.history.retry(id);
      if (result.success) {
        await loadHistory();
        await loadStats();
      }
      return result.success;
    } catch (error) {
      console.error('Failed to retry:', error);
      return false;
    }
  }, [loadHistory, loadStats]);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      const result = await (window as any).electronAPI.history.delete(id);
      
      if (result.success) {
        await loadHistory();
        await loadStats();
      }
      return result.success;
    } catch (error) {
      console.error('Failed to delete:', error);
      return false;
    }
  }, [loadHistory, loadStats]);

  const clear = useCallback(async (filter?: any) => {
    try {
      const result = await (window as any).electronAPI.history.clear(filter);
      if (result.success) {
        await loadHistory();
        await loadStats();
      }
      return result.success;
    } catch (error) {
      console.error('Failed to clear:', error);
      return false;
    }
  }, [loadHistory, loadStats]);

  // Charger au montage
  useEffect(() => {
    loadHistory();
    loadStats();
  }, [loadHistory, loadStats]);

  return {
    history,
    stats,
    loading,
    loadHistory,
    retry,
    deleteEntry,
    clear
  };
}