import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Fonction exposée pour signaler des erreurs réseau depuis l'extérieur
  const reportNetworkError = useCallback(() => {
    if (isOnline) {
      console.log('[NETWORK] 📵 Network error reported by API');
      setIsOnline(false);
      
      // Notifier le backend du changement de statut
      if (window.electronAPI?.invoke) {
        window.electronAPI.invoke('queue:setOnlineStatus', false).catch(console.error);
      }
    }
  }, [isOnline]);

  // Fonction exposée pour signaler une récupération réseau
  const reportNetworkRecovery = useCallback(() => {
    if (!isOnline) {
      console.log('[NETWORK] 🌐 Network recovery reported by API');
      setIsOnline(true);
      
      // Notifier le backend du changement de statut
      if (window.electronAPI?.invoke) {
        window.electronAPI.invoke('queue:setOnlineStatus', true).catch(console.error);
      }
    }
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[NETWORK] 🌐 Browser reports: ONLINE');
      setIsOnline(true);
      
      // Notifier le backend du changement de statut
      if (window.electronAPI?.invoke) {
        window.electronAPI.invoke('queue:setOnlineStatus', true).catch(console.error);
      }
    };

    const handleOffline = () => {
      console.log('[NETWORK] 📵 Browser reports: OFFLINE');
      setIsOnline(false);
      
      // Notifier le backend du changement de statut
      if (window.electronAPI?.invoke) {
        window.electronAPI.invoke('queue:setOnlineStatus', false).catch(console.error);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Log du statut initial seulement
    console.log(`[NETWORK] Initial status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    reportNetworkError,
    reportNetworkRecovery
  };
}