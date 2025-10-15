// packages/ui/src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Initial status
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      console.log('🟢 Network is back online');
      setIsOnline(true);
      
      // Notify backend if available
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('queue:set-online-status', true);
        
        // Show notification if was offline
        if (wasOffline) {
          console.log('✅ Connexion rétablie, envoi de la file d\'attente...');
        }
      }
      
      setWasOffline(false);
    };

    const handleOffline = async () => {
      console.log('🔴 Network is offline');
      setIsOnline(false);
      setWasOffline(true);
      
      // Notify backend if available
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('queue:set-online-status', false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}