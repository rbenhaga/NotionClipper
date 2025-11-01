// packages/ui/src/hooks/utils/useApiWithNetworkDetection.ts
// 🎯 Hook pour intercepter les erreurs réseau et mettre à jour le statut

import { useCallback } from 'react';

interface NetworkStatusReporter {
  reportNetworkError: () => void;
  reportNetworkRecovery: () => void;
}

export function useApiWithNetworkDetection(networkStatus: NetworkStatusReporter) {
  
  // Wrapper pour les appels API qui peut détecter les erreurs réseau
  const apiCall = useCallback(async <T>(
    apiFunction: () => Promise<T>,
    options: {
      onNetworkError?: () => void;
      onSuccess?: () => void;
      silentNetworkErrors?: boolean;
    } = {}
  ): Promise<T> => {
    try {
      const result = await apiFunction();
      
      // Signaler la récupération réseau en cas de succès
      if (options.onSuccess) {
        options.onSuccess();
      } else {
        networkStatus.reportNetworkRecovery();
      }
      
      return result;
    } catch (error: any) {
      // Détecter les erreurs réseau
      const isNetworkError = 
        error?.code === 'ENOTFOUND' ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ETIMEDOUT' ||
        error?.type === 'system' ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.message?.includes('ENOTFOUND');

      if (isNetworkError) {
        console.log('[API] 📵 Network error detected:', error.message);
        
        if (options.onNetworkError) {
          options.onNetworkError();
        } else {
          networkStatus.reportNetworkError();
        }
        
        if (!options.silentNetworkErrors) {
          // Re-throw l'erreur pour que l'appelant puisse la gérer
          throw error;
        }
      } else {
        // Ce n'est pas une erreur réseau, la re-throw
        throw error;
      }
      
      // Si silentNetworkErrors est true, retourner une valeur par défaut
      return null as T;
    }
  }, [networkStatus]);

  // Wrapper spécialisé pour les appels Electron IPC
  const ipcCall = useCallback(async <T>(
    channel: string,
    ...args: any[]
  ): Promise<T | null> => {
    try {
      if (!window.electronAPI?.invoke) {
        throw new Error('Electron API not available');
      }
      
      const result = await window.electronAPI.invoke(channel, ...args);
      return result;
    } catch (error: any) {
      console.warn(`[IPC] ⚠️ IPC call failed for channel "${channel}":`, error.message);
      
      // Pour les erreurs IPC, ne pas affecter le statut réseau
      // mais retourner null pour indiquer l'échec
      return null;
    }
  }, []);

  return {
    apiCall,
    ipcCall
  };
}