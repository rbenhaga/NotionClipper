// packages/ui/src/hooks/data/useFocusMode.ts
import { useState, useEffect, useCallback } from 'react';

export interface FocusModeState {
  enabled: boolean;
  activePageId: string | null;
  activePageTitle: string | null;
  lastUsedAt: number | null;
  sessionStartTime: number | null;
  clipsSentCount: number;
}

export interface UseFocusModeReturn {
  state: FocusModeState;
  isEnabled: boolean;
  activePage: { id: string | null; title: string | null };
  clipCount: number;
  enable: (page: any) => Promise<void>;
  disable: () => Promise<void>;
  toggle: (page?: any) => Promise<void>;
  quickSend: () => Promise<any>;
  uploadFiles: (files: File[]) => Promise<any>;
  updateConfig: (config: any) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useFocusMode(
  focusModeAPI?: {
    getState: () => Promise<FocusModeState>;
    enable: (page: any) => Promise<void>;
    disable: () => Promise<void>;
    toggle: (page?: any) => Promise<void>;
    quickSend: () => Promise<any>;
    uploadFiles: (files: File[]) => Promise<any>;
    updateConfig: (config: any) => Promise<void>;
  }
): UseFocusModeReturn {
  const [state, setState] = useState<FocusModeState>({
    enabled: false,
    activePageId: null,
    activePageTitle: null,
    lastUsedAt: null,
    sessionStartTime: null,
    clipsSentCount: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // CHARGER L'ÉTAT INITIAL
  // ============================================

  useEffect(() => {
    const loadState = async () => {
      try {
        const api = focusModeAPI || (window as any).electronAPI?.focusMode;
        if (!api) return;
        
        const result = await api.getState();
        if (result) {
          setState(result);
        }
      } catch (err) {
        console.error('Error loading focus mode state:', err);
      }
    };

    loadState();
  }, [focusModeAPI]);

  // ============================================
  // ÉCOUTER LES ÉVÉNEMENTS
  // ============================================

  useEffect(() => {
    const handleEnabled = (_: any, data: any) => {
      setState(prev => ({
        ...prev,
        enabled: true,
        activePageId: data.pageId,
        activePageTitle: data.pageTitle,
        sessionStartTime: Date.now(),
        clipsSentCount: 0
      }));
    };

    const handleDisabled = () => {
      setState({
        enabled: false,
        activePageId: null,
        activePageTitle: null,
        lastUsedAt: null,
        sessionStartTime: null,
        clipsSentCount: 0
      });
    };

    const handleClipSent = (_: any, data: any) => {
      setState(prev => ({
        ...prev,
        clipsSentCount: data.count,
        lastUsedAt: Date.now()
      }));
    };

    const electronAPI = (window as any).electronAPI;
    electronAPI?.on('focus-mode:enabled', handleEnabled);
    electronAPI?.on('focus-mode:disabled', handleDisabled);
    electronAPI?.on('focus-mode:clip-sent', handleClipSent);

    return () => {
      electronAPI?.removeListener('focus-mode:enabled', handleEnabled);
      electronAPI?.removeListener('focus-mode:disabled', handleDisabled);
      electronAPI?.removeListener('focus-mode:clip-sent', handleClipSent);
    };
  }, []);

  // ============================================
  // ACTIONS
  // ============================================

  const enable = useCallback(async (page: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const api = focusModeAPI || (window as any).electronAPI?.focusMode;
      if (!api) throw new Error('Focus mode API not available');
      
      await api.enable(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error enabling focus mode:', err);
    } finally {
      setIsLoading(false);
    }
  }, [focusModeAPI]);

  const disable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const api = focusModeAPI || (window as any).electronAPI?.focusMode;
      if (!api) throw new Error('Focus mode API not available');
      
      await api.disable();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error disabling focus mode:', err);
    } finally {
      setIsLoading(false);
    }
  }, [focusModeAPI]);

  const toggle = useCallback(async (page?: any) => {
    if (state.enabled) {
      await disable();
    } else if (page) {
      await enable(page);
    }
  }, [state.enabled, enable, disable]);

  const quickSend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const api = focusModeAPI || (window as any).electronAPI?.focusMode;
      if (!api) throw new Error('Focus mode API not available');
      
      const result = await api.quickSend();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error sending:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [focusModeAPI]);

  const uploadFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const api = focusModeAPI || (window as any).electronAPI?.focusMode;
      if (!api) throw new Error('Focus mode API not available');
      
      const result = await api.uploadFiles(files);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error uploading files:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [focusModeAPI]);

  const updateConfig = useCallback(async (config: any) => {
    setError(null);
    
    try {
      const api = focusModeAPI || (window as any).electronAPI?.focusMode;
      if (!api) throw new Error('Focus mode API not available');
      
      await api.updateConfig(config);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating config:', err);
    }
  }, [focusModeAPI]);

  // ============================================
  // RETOUR
  // ============================================

  return {
    state,
    isEnabled: state.enabled,
    activePage: {
      id: state.activePageId,
      title: state.activePageTitle
    },
    clipCount: state.clipsSentCount,
    enable,
    disable,
    toggle,
    quickSend,
    uploadFiles,
    updateConfig,
    isLoading,
    error
  };
}