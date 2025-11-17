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
  // 🔧 FIX: Ajout des propriétés pour l'intro
  showIntro: boolean;
  closeIntro: () => void;
}

// 🆕 Props pour quota check Focus Mode
export interface FocusModeQuotaCheck {
  onQuotaCheck?: () => Promise<{ canUse: boolean; quotaReached: boolean; remaining?: number }>;
  onQuotaExceeded?: () => void;
  onTrackUsage?: (minutes: number) => Promise<void>; // Track minutes utilisées
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
  },
  quotaOptions?: FocusModeQuotaCheck
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
  
  // 🔧 FIX: États pour la gestion de l'intro
  const [showIntro, setShowIntro] = useState(false);
  const [hasShownIntro, setHasShownIntro] = useState(true); // Par défaut true pour éviter l'affichage

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

    // 🔥 CHARGEMENT UNIQUE au démarrage seulement
    const timer = setTimeout(loadState, 500);

    // 🔥 ÉCOUTER LES ÉVÉNEMENTS au lieu de poller
    const handleFocusModeEnabled = (data: any) => {
      setState(prev => ({ ...prev, enabled: true, ...data }));
    };

    const handleFocusModeDisabled = (data: any) => {
      setState(prev => ({ ...prev, enabled: false, ...data }));
    };

    if ((window as any).electronAPI?.on) {
      (window as any).electronAPI.on('focus-mode:enabled', handleFocusModeEnabled);
      (window as any).electronAPI.on('focus-mode:disabled', handleFocusModeDisabled);
    }

    return () => {
      clearTimeout(timer);
      if ((window as any).electronAPI?.removeListener) {
        (window as any).electronAPI.removeListener('focus-mode:enabled', handleFocusModeEnabled);
        (window as any).electronAPI.removeListener('focus-mode:disabled', handleFocusModeDisabled);
      }
    };
  }, [focusModeAPI]);

  // 🔧 FIX: Charger l'état de l'intro au démarrage
  useEffect(() => {
    const loadIntroState = async () => {
      const api = focusModeAPI || (window as any).electronAPI?.focusMode;
      if (api?.getIntroState) {
        try {
          const { hasShown } = await api.getIntroState();
          setHasShownIntro(hasShown);
        } catch (error) {
          console.error('[FocusMode] Failed to load intro state:', error);
          // 🔥 ARRÊTER LES APPELS EN BOUCLE
          return;
        }
      }
    };

    loadIntroState();
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

      // 🔧 FIX: Afficher l'intro seulement si jamais affichée
      if (!hasShownIntro) {
        setShowIntro(true);
        // Marquer comme affiché immédiatement
        setHasShownIntro(true);
        // Sauvegarder l'état
        const api = focusModeAPI || (window as any).electronAPI?.focusMode;
        if (api?.saveIntroState) {
          api.saveIntroState(true);
        }
      }
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
      // 🔥 Quota check Focus Mode pour FREE tier (60min/mois)
      if (quotaOptions?.onQuotaCheck) {
        console.log('[FocusMode] Vérification quota focus_mode_minutes...');
        const quotaResult = await quotaOptions.onQuotaCheck();

        if (!quotaResult.canUse) {
          console.log('[FocusMode] ❌ Quota focus mode atteint');
          const message = quotaResult.quotaReached
            ? 'Quota Mode Focus atteint ce mois-ci (60min). Passez à Premium pour un usage illimité.'
            : `Plus que ${quotaResult.remaining || 0} minutes de Mode Focus ce mois-ci`;

          setError(message);

          // Afficher modal upgrade si quota atteint
          if (quotaResult.quotaReached && quotaOptions.onQuotaExceeded) {
            quotaOptions.onQuotaExceeded();
          }

          setIsLoading(false);
          return; // Bloquer l'activation
        }
      }

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
  }, [focusModeAPI, quotaOptions]);

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

  // 🔧 FIX: Fonction pour fermer l'intro
  const closeIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  // 🆕 PHASE 3: Time tracking Focus Mode (1min intervals)
  useEffect(() => {
    if (!state.enabled || !quotaOptions?.onTrackUsage) return;

    console.log('[FocusMode] Starting time tracking (1min intervals)');
    let minutesTracked = 0;

    const interval = setInterval(async () => {
      minutesTracked++;
      console.log(`[FocusMode] Tracking usage: ${minutesTracked} minute(s)`);

      try {
        if (quotaOptions?.onTrackUsage) {
          await quotaOptions.onTrackUsage(1); // Track 1 minute
        }
      } catch (error) {
        console.error('[FocusMode] Error tracking usage:', error);
      }
    }, 60000); // Toutes les 60 secondes = 1 minute

    return () => {
      console.log(`[FocusMode] Stopped time tracking (total: ${minutesTracked} min)`);
      clearInterval(interval);
    };
  }, [state.enabled, quotaOptions]);

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
    error,
    // 🔧 FIX: Nouvelles propriétés pour l'intro
    showIntro,
    closeIntro
  };
}