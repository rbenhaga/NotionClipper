import { useState, useEffect } from 'react';



export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      console.log('[NETWORK] 🌐 Network status: ONLINE');
      setIsOnline(true);

      // 🆕 Notifier le queue service que nous sommes en ligne
      if (window.electronAPI?.invoke) {
        try {
          await window.electronAPI.invoke('queue:setOnlineStatus', true);
          console.log('[NETWORK] ✅ Queue service notified: ONLINE');
        } catch (error) {
          console.error('[NETWORK] ❌ Failed to notify queue service:', error);
        }
      }
    };

    const handleOffline = async () => {
      console.log('[NETWORK] 📵 Network status: OFFLINE');
      setIsOnline(false);

      // 🆕 Notifier le queue service que nous sommes hors ligne
      if (window.electronAPI?.invoke) {
        try {
          await window.electronAPI.invoke('queue:setOnlineStatus', false);
          console.log('[NETWORK] ✅ Queue service notified: OFFLINE');
        } catch (error) {
          console.error('[NETWORK] ❌ Failed to notify queue service:', error);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 🆕 Initialiser le statut au montage
    if (window.electronAPI?.invoke) {
      window.electronAPI.invoke('queue:setOnlineStatus', navigator.onLine)
        .then(() => console.log(`[NETWORK] ✅ Initial status set: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`))
        .catch((error: Error) => console.error('[NETWORK] ❌ Failed to set initial status:', error));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}