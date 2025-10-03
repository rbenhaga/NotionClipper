import { useState, useEffect } from 'react';

export function useBackendConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      if (!mounted) return;
      try {
        // Vérifier qu'on est dans Electron
        if (window.electronAPI) {
          const config = await window.electronAPI.getConfig();
          if (mounted) {
            setIsConnected(config.success !== false);
          }
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Connection check error:', error);
        if (mounted) {
          setIsConnected(false);
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkConnection();

    return () => {
      mounted = false;
    };
  }, []);

  return { isConnected, isChecking };
}