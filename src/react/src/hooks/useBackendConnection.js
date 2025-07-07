import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = 'http://localhost:5000/api';
const MAX_RETRIES = 10;
const RETRY_DELAY = 1000; // 1 seconde

export function useBackendConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState(null);
  const retryTimeoutRef = useRef(null);
  const isCheckingRef = useRef(false);

  const checkConnection = useCallback(async () => {
    if (isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${API_URL}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          setIsConnected(true);
          setIsConnecting(false);
          setRetryCount(0);
          setError(null);
          return true;
        }
      }
      
      throw new Error('Backend unhealthy');
      
    } catch (err) {
      setIsConnected(false);
      
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        
        // Retry avec délai exponentiel
        const delay = Math.min(RETRY_DELAY * Math.pow(1.5, retryCount), 10000);
        
        retryTimeoutRef.current = setTimeout(() => {
          isCheckingRef.current = false;
          checkConnection();
        }, delay);
        
        setError(`Connexion au backend... (tentative ${retryCount + 1}/${MAX_RETRIES})`);
      } else {
        setIsConnecting(false);
        setError('Impossible de se connecter au backend. Vérifiez qu\'il est démarré.');
      }
      
      return false;
    } finally {
      if (!retryTimeoutRef.current) {
        isCheckingRef.current = false;
      }
    }
  }, [retryCount]);

  // Démarrer la vérification au montage
  useEffect(() => {
    checkConnection();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Vérification périodique une fois connecté
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      checkConnection();
    }, 30000); // Toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, [isConnected, checkConnection]);

  const retry = useCallback(() => {
    setRetryCount(0);
    setIsConnecting(true);
    setError(null);
    checkConnection();
  }, [checkConnection]);

  return {
    isConnected,
    isConnecting,
    error,
    retryCount,
    retry
  };
}