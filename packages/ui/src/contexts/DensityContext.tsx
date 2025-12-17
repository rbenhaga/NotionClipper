/**
 * 🎯 Density Context - Gestion de la densité UI
 * Permet de basculer entre mode comfortable (64px) et compact (44px)
 * Par défaut: compact en extension, comfortable en app
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type DensityMode = 'comfortable' | 'compact';
export type PlatformMode = 'app' | 'extension';

interface DensityContextValue {
  density: DensityMode;
  platform: PlatformMode;
  setDensity: (density: DensityMode) => void;
  toggleDensity: () => void;
  isCompact: boolean;
}

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

interface DensityProviderProps {
  children: ReactNode;
  defaultDensity?: DensityMode;
  platform?: PlatformMode;
}

const STORAGE_KEY = 'clipper-pro-density';

export function DensityProvider({ 
  children, 
  defaultDensity,
  platform = 'app' 
}: DensityProviderProps) {
  // Déterminer la densité par défaut selon la plateforme
  const getInitialDensity = (): DensityMode => {
    // 1. Vérifier le localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'comfortable' || stored === 'compact') {
        return stored;
      }
    } catch (e) {
      // localStorage non disponible
    }
    
    // 2. Utiliser la prop defaultDensity si fournie
    if (defaultDensity) {
      return defaultDensity;
    }
    
    // 3. Par défaut: compact en extension, comfortable en app
    return platform === 'extension' ? 'compact' : 'comfortable';
  };

  const [density, setDensityState] = useState<DensityMode>(getInitialDensity);

  // Persister le choix
  const setDensity = useCallback((newDensity: DensityMode) => {
    setDensityState(newDensity);
    try {
      localStorage.setItem(STORAGE_KEY, newDensity);
    } catch (e) {
      // Ignore
    }
  }, []);

  const toggleDensity = useCallback(() => {
    setDensity(density === 'comfortable' ? 'compact' : 'comfortable');
  }, [density, setDensity]);

  // Appliquer la classe CSS au root pour les styles globaux
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-density', density);
    root.setAttribute('data-platform', platform);
  }, [density, platform]);

  const value: DensityContextValue = {
    density,
    platform,
    setDensity,
    toggleDensity,
    isCompact: density === 'compact',
  };

  return (
    <DensityContext.Provider value={value}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity(): DensityContextValue {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error('useDensity must be used within a DensityProvider');
  }
  return context;
}

// Hook optionnel qui ne throw pas si hors contexte (pour composants partagés)
export function useDensityOptional(): DensityContextValue | null {
  return useContext(DensityContext) ?? null;
}
