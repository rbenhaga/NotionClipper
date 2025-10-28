import { useState, useEffect, useCallback, useRef } from 'react';

export function useHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ SOLUTION OPTIMALE: useCallback avec dépendances vides pour des fonctions vraiment stables
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
  }, []); // ✅ Aucune dépendance = fonction stable

  const loadStats = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI.history.getStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []); // ✅ Aucune dépendance = fonction stable

  const retry = useCallback(async (id: string) => {
    try {
      const result = await (window as any).electronAPI.history.retry(id);
      if (result.success) {
        // Recharger les données après retry
        setLoading(true);
        try {
          const historyResult = await (window as any).electronAPI.history.getAll();
          if (historyResult.success) {
            setHistory(historyResult.data);
          }
          const statsResult = await (window as any).electronAPI.history.getStats();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        } catch (error) {
          console.error('Failed to reload after retry:', error);
        } finally {
          setLoading(false);
        }
      }
      return result.success;
    } catch (error) {
      console.error('Failed to retry:', error);
      return false;
    }
  }, []); // Suppression des dépendances problématiques

  const deleteEntry = useCallback(async (id: string) => {
    try {
      const result = await (window as any).electronAPI.history.delete(id);
      
      if (result.success) {
        // Recharger les données après suppression
        setLoading(true);
        try {
          const historyResult = await (window as any).electronAPI.history.getAll();
          if (historyResult.success) {
            setHistory(historyResult.data);
          }
          const statsResult = await (window as any).electronAPI.history.getStats();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        } catch (error) {
          console.error('Failed to reload after delete:', error);
        } finally {
          setLoading(false);
        }
      }
      return result.success;
    } catch (error) {
      console.error('Failed to delete:', error);
      return false;
    }
  }, []); // Suppression des dépendances problématiques

  const clear = useCallback(async (filter?: any) => {
    try {
      const result = await (window as any).electronAPI.history.clear(filter);
      if (result.success) {
        // Recharger les données après clear
        setLoading(true);
        try {
          const historyResult = await (window as any).electronAPI.history.getAll();
          if (historyResult.success) {
            setHistory(historyResult.data);
          }
          const statsResult = await (window as any).electronAPI.history.getStats();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        } catch (error) {
          console.error('Failed to reload after clear:', error);
        } finally {
          setLoading(false);
        }
      }
      return result.success;
    } catch (error) {
      console.error('Failed to clear:', error);
      return false;
    }
  }, []); // Suppression des dépendances problématiques

  // Charger au montage
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const historyResult = await (window as any).electronAPI.history.getAll();
        if (historyResult.success) {
          setHistory(historyResult.data);
        }
        const statsResult = await (window as any).electronAPI.history.getStats();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } catch (error) {
        console.error('Failed to load initial history data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []); // Pas de dépendances

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