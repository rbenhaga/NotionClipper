// src/react/src/hooks/useApi.js
/**
 * Hook générique pour les appels API avec gestion d'état
 */

import { useState, useCallback } from 'react';

export function useApi(apiFunction) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Une erreur est survenue';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
}

/**
 * Hook pour les requêtes avec retry automatique
 */
export function useApiWithRetry(apiFunction, maxRetries = 3, retryDelay = 1000) {
  const [retryCount, setRetryCount] = useState(0);
  const api = useApi(apiFunction);

  const executeWithRetry = useCallback(async (...args) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        setRetryCount(i);
        const result = await api.execute(...args);
        setRetryCount(0);
        return result;
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }
    
    setRetryCount(0);
    throw lastError;
  }, [api, maxRetries, retryDelay]);

  return {
    ...api,
    retryCount,
    execute: executeWithRetry
  };
}

/**
 * Hook pour le polling d'une API
 */
export function useApiPolling(apiFunction, interval = 5000, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const startPolling = useCallback(async (...args) => {
    if (isPolling) return;
    
    setIsPolling(true);
    
    const poll = async () => {
      if (!enabled || !isPolling) return;
      
      try {
        setLoading(true);
        const result = await apiFunction(...args);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message || 'Erreur lors du polling');
      } finally {
        setLoading(false);
      }
    };

    // Premier appel immédiat
    await poll();

    // Polling régulier
    const intervalId = setInterval(poll, interval);

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [apiFunction, interval, enabled, isPolling]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    data,
    loading,
    error,
    isPolling,
    startPolling,
    stopPolling
  };
}