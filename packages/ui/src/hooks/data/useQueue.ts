import { useState, useEffect, useCallback } from 'react';

export function useQueue() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI.queue.getAll();
      if (result.success) {
        setQueue(result.data);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI.queue.getStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const retry = useCallback(async (id: string) => {
    try {
      const result = await (window as any).electronAPI.queue.retry(id);
      if (result.success) {
        await loadQueue();
        await loadStats();
      }
      return result.success;
    } catch (error) {
      console.error('Failed to retry:', error);
      return false;
    }
  }, []); // Suppression des dépendances problématiques

  const remove = useCallback(async (id: string) => {
    try {
      const result = await (window as any).electronAPI.queue.remove(id);
      if (result.success) {
        // Recharger les données après suppression
        try {
          const queueResult = await (window as any).electronAPI.queue.getAll();
          if (queueResult.success) {
            setQueue(queueResult.data);
          }
          const statsResult = await (window as any).electronAPI.queue.getStats();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        } catch (error) {
          console.error('Failed to reload after remove:', error);
        }
      }
      return result.success;
    } catch (error) {
      console.error('Failed to remove:', error);
      return false;
    }
  }, []); // Suppression des dépendances problématiques

  const clear = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI.queue.clear();
      if (result.success) {
        // Recharger les données après clear
        try {
          const queueResult = await (window as any).electronAPI.queue.getAll();
          if (queueResult.success) {
            setQueue(queueResult.data);
          }
          const statsResult = await (window as any).electronAPI.queue.getStats();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        } catch (error) {
          console.error('Failed to reload after clear:', error);
        }
      }
      return result.success;
    } catch (error) {
      console.error('Failed to clear:', error);
      return false;
    }
  }, []); // Suppression des dépendances problématiques

  const startProcessing = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI.queue.start();
      if (result.success) {
        setProcessing(true);
      }
      return result.success;
    } catch (error) {
      console.error('Failed to start processing:', error);
      return false;
    }
  }, []);

  const stopProcessing = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI.queue.stop();
      if (result.success) {
        setProcessing(false);
      }
      return result.success;
    } catch (error) {
      console.error('Failed to stop processing:', error);
      return false;
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const queueResult = await (window as any).electronAPI.queue.getAll();
        if (queueResult.success) {
          setQueue(queueResult.data);
        }
        const statsResult = await (window as any).electronAPI.queue.getStats();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } catch (error) {
        console.error('Failed to load initial queue data:', error);
      }
    };
    
    loadInitialData();
    
    // Polling pour mettre à jour la queue
    const interval = setInterval(async () => {
      try {
        const queueResult = await (window as any).electronAPI.queue.getAll();
        if (queueResult.success) {
          setQueue(queueResult.data);
        }
        const statsResult = await (window as any).electronAPI.queue.getStats();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } catch (error) {
        console.error('Failed to poll queue data:', error);
      }
    }, 5000); // Toutes les 5 secondes

    return () => clearInterval(interval);
  }, []); // Pas de dépendances

  return {
    queue,
    stats,
    loading,
    processing,
    loadQueue,
    retry,
    remove,
    clear,
    startProcessing,
    stopProcessing
  };
}