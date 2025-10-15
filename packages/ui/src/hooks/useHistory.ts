// packages/ui/src/hooks/useHistory.ts
import { useState, useEffect, useCallback } from 'react';
import type { HistoryEntry, HistoryStats, HistoryFilter } from '@notion-clipper/core-shared';



export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load history
  const loadHistory = useCallback(async (filter?: HistoryFilter) => {
    if (!window.electronAPI) return [];
    
    setLoading(true);
    try {
      const result = await window.electronAPI?.invoke?.('history:get', filter);
      if (result.success) {
        const historyData = result.history || [];
        setHistory(historyData);
        return historyData;
      }
      return [];
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!window.electronAPI) return null;
    
    try {
      const result = await window.electronAPI?.invoke?.('history:get-stats');
      if (result.success) {
        const statsData = result.stats;
        setStats(statsData);
        return statsData;
      }
      return null;
    } catch (error) {
      console.error('Error loading stats:', error);
      return null;
    }
  }, []);

  // Retry entry
  const retry = useCallback(async (entry: HistoryEntry) => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI?.invoke?.('history:retry', entry.id);
      await loadHistory();
    } catch (error) {
      console.error('Error retrying:', error);
    }
  }, [loadHistory]);

  // Delete entry
  const deleteEntry = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI?.invoke?.('history:delete', id);
      setHistory(prev => prev.filter(e => e.id !== id));
      await loadStats();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }, [loadStats]);

  // Clear history
  const clear = useCallback(async () => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI?.invoke?.('history:clear');
      setHistory([]);
      await loadStats();
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }, [loadStats]);

  // Initial load
  useEffect(() => {
    loadHistory();
    loadStats();
  }, [loadHistory, loadStats]);

  return {
    history,
    stats,
    loading,
    loadHistory,
    loadStats,
    retry,
    deleteEntry,
    clear
  };
}