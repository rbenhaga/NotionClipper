// packages/ui/src/hooks/useWindowPreferences.ts
import { useState, useEffect, useCallback } from 'react';

export interface WindowPreferences {
  isPinned: boolean;
  isMinimalist: boolean;
  opacity?: number;
}

export interface UseWindowPreferencesReturn {
  isPinned: boolean;
  isMinimalist: boolean;
  opacity: number;
  togglePin: () => Promise<void>;
  toggleMinimalist: () => Promise<void>;
  setOpacity: (opacity: number) => Promise<void>;
  loading: boolean;
}

/**
 * Hook pour gérer les préférences de fenêtre
 * - État épinglé (always on top)
 * - Mode minimaliste
 * - Opacité
 */
export function useWindowPreferences(): UseWindowPreferencesReturn {
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimalist, setIsMinimalist] = useState(false);
  const [opacity, setOpacityState] = useState(1.0);
  const [loading, setLoading] = useState(true);

  // Initialiser l'état depuis Electron
  useEffect(() => {
    initializeWindowState();
  }, []);

  const initializeWindowState = useCallback(async () => {
    try {
      setLoading(true);
      
      if (window.electronAPI?.getPinState) {
        const result = await window.electronAPI.getPinState();
        if (result.success) {
          setIsPinned(result.isPinned);
        }
      }

      // Récupérer les préférences depuis localStorage
      const savedPrefs = localStorage.getItem('windowPreferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        // Ne pas restaurer le mode minimaliste automatiquement au démarrage
        // setIsMinimalist(prefs.isMinimalist || false);
        setIsMinimalist(false); // Toujours démarrer en mode normal
        setOpacityState(prefs.opacity || 1.0);
      }
    } catch (error) {
      console.error('[useWindowPreferences] Error initializing:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sauvegarder les préférences
  const savePreferences = useCallback((prefs: Partial<WindowPreferences>) => {
    const current = JSON.parse(localStorage.getItem('windowPreferences') || '{}');
    const updated = { ...current, ...prefs };
    localStorage.setItem('windowPreferences', JSON.stringify(updated));
  }, []);

  // Toggle Pin
  const togglePin = useCallback(async () => {
    try {
      if (window.electronAPI?.togglePin) {
        const result = await window.electronAPI.togglePin();
        if (result.success) {
          setIsPinned(result.isPinned || false);
          savePreferences({ isPinned: result.isPinned || false });
        }
      }
    } catch (error) {
      console.error('[useWindowPreferences] Error toggling pin:', error);
    }
  }, [savePreferences]);

  // Toggle Minimalist - ✅ Nouvelle implémentation avec gestion de position
  const toggleMinimalist = useCallback(async () => {
    try {
      const newMinimalistState = !isMinimalist;
      
      // ✅ Utiliser le nouveau handler IPC qui gère la position
      if (window.electronAPI?.toggleMinimalistMode) {
        const result = await window.electronAPI.toggleMinimalistMode(newMinimalistState);
        if (result) {
          setIsMinimalist(newMinimalistState);
          console.log(`[useWindowPreferences] Minimalist mode: ${newMinimalistState ? 'ON' : 'OFF'}`);
        }
      } else if (window.electronAPI?.setMinimalistSize) {
        // Fallback vers l'ancien handler
        const result = await window.electronAPI.setMinimalistSize(newMinimalistState);
        if (result.success) {
          setIsMinimalist(newMinimalistState);
        }
      }
    } catch (error) {
      console.error('[useWindowPreferences] Error toggling minimalist:', error);
    }
  }, [isMinimalist]);

  // Set Opacity
  const setOpacity = useCallback(async (newOpacity: number) => {
    try {
      if (window.electronAPI?.setOpacity) {
        const result = await window.electronAPI.setOpacity(newOpacity);
        if (result.success) {
          setOpacityState(result.opacity || 1);
          savePreferences({ opacity: result.opacity || 1 });
        }
      }
    } catch (error) {
      console.error('[useWindowPreferences] Error setting opacity:', error);
    }
  }, [savePreferences]);

  return {
    isPinned,
    isMinimalist,
    opacity,
    togglePin,
    toggleMinimalist,
    setOpacity,
    loading
  };
}