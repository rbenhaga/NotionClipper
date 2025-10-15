// packages/ui/src/hooks/useQueue.ts
import { useState, useEffect, useCallback } from 'react';
import type { QueueEntry, QueueStats } from '@notion-clipper/core-shared';

export function useQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load queue
  const loadQueue = useCallback(async () => {
    if (!window.electronAPI) return [];
    
    setLoading(true);
    try {
      const result = await window.electronAPI?.invoke?.('queue:get');
      if (result.success) {
        const queueData = result.queue || [];
        setQueue(queueData);
        return queueData;
      }
      return [];
    } catch (error) {
      console.error('Error loading queue:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!window.electronAPI) return null;
    
    try {
      const result = await window.electronAPI?.invoke?.('queue:get-stats');
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
  const retry = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI?.invoke?.('queue:retry', id);
      await loadQueue();
    } catch (error) {
      console.error('Error retrying:', error);
    }
  }, [loadQueue]);

  // Remove entry
  const remove = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI?.invoke?.('queue:remove', id);
      setQueue(prev => prev.filter(e => e.id !== id));
      await loadStats();
    } catch (error) {
      console.error('Error removing:', error);
    }
  }, [loadStats]);

  // Clear queue
  const clear = useCallback(async () => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI?.invoke?.('queue:clear');
      setQueue([]);
      await loadStats();
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  }, [loadStats]);

  // Listen to queue updates
  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const handleQueueUpdate = () => {
      loadQueue();
      loadStats();
    };

    window.electronAPI?.on?.('queue:updated', handleQueueUpdate);

    return () => {
      window.electronAPI?.removeListener?.('queue:updated', handleQueueUpdate);
    };
  }, [loadQueue, loadStats]);

  // Initial load
  useEffect(() => {
    loadQueue();
    loadStats();
  }, [loadQueue, loadStats]);

  return {
    queue,
    stats,
    loading,
    loadQueue,
    loadStats,
    retry,
    remove,
    clear
  };
}