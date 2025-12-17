import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced Network Status Hook
 * 
 * Features:
 * - Browser online/offline events (navigator.onLine)
 * - API error detection for network issues
 * - Automatic recovery detection
 * - Debounced status changes to avoid flapping
 * 
 * Note: We rely on browser events and API error reporting instead of
 * external pings to avoid CSP violations in Electron/extension contexts.
 */

// Debounce time to avoid rapid status changes
const STATUS_CHANGE_DEBOUNCE = 2000;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  const statusChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef(0);

  // Notify backend of status change
  const notifyBackend = useCallback((online: boolean) => {
    if (window.electronAPI?.invoke) {
      window.electronAPI.invoke('queue:setOnlineStatus', online).catch(console.error);
    }
  }, []);

  // Debounced status change to avoid flapping
  const setOnlineDebounced = useCallback((online: boolean, immediate = false) => {
    if (statusChangeTimeoutRef.current) {
      clearTimeout(statusChangeTimeoutRef.current);
    }

    if (immediate) {
      setIsOnline(online);
      notifyBackend(online);
      setLastChecked(Date.now());
      return;
    }

    statusChangeTimeoutRef.current = setTimeout(() => {
      setIsOnline(prev => {
        if (prev !== online) {
          console.log(`[NETWORK] ${online ? '🌐' : '📵'} Status changed to: ${online ? 'ONLINE' : 'OFFLINE'}`);
          notifyBackend(online);
        }
        return online;
      });
      setLastChecked(Date.now());
    }, STATUS_CHANGE_DEBOUNCE);
  }, [notifyBackend]);

  // Function exposed to report network errors from API calls
  const reportNetworkError = useCallback(() => {
    console.log('[NETWORK] 📵 Network error reported by API');
    consecutiveFailuresRef.current++;
    
    if (consecutiveFailuresRef.current >= 2) {
      setOnlineDebounced(false, true); // Immediate change on repeated API errors
    }
  }, [setOnlineDebounced]);

  // Function exposed to report network recovery
  const reportNetworkRecovery = useCallback(() => {
    console.log('[NETWORK] 🌐 Network recovery reported by API');
    consecutiveFailuresRef.current = 0;
    setOnlineDebounced(true, true); // Immediate change on recovery
  }, [setOnlineDebounced]);

  // Force check connectivity using navigator.onLine
  const forceCheck = useCallback(async () => {
    console.log('[NETWORK] 🔄 Checking connectivity...');
    const online = navigator.onLine;
    setLastChecked(Date.now());
    
    if (online) {
      consecutiveFailuresRef.current = 0;
      setOnlineDebounced(true);
    } else {
      consecutiveFailuresRef.current = 2;
      setOnlineDebounced(false, true);
    }
  }, [setOnlineDebounced]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[NETWORK] 🌐 Browser reports: ONLINE');
      consecutiveFailuresRef.current = 0;
      setOnlineDebounced(true, true);
    };

    const handleOffline = () => {
      console.log('[NETWORK] 📵 Browser reports: OFFLINE');
      consecutiveFailuresRef.current = 2;
      setOnlineDebounced(false, true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status
    console.log(`[NETWORK] Initial browser status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);
    setLastChecked(Date.now());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (statusChangeTimeoutRef.current) {
        clearTimeout(statusChangeTimeoutRef.current);
      }
    };
  }, [setOnlineDebounced]);

  return {
    isOnline,
    lastChecked,
    reportNetworkError,
    reportNetworkRecovery,
    forceCheck,
  };
}