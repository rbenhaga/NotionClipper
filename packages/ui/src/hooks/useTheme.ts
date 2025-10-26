// packages/ui/src/hooks/useTheme.ts
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface UseThemeReturn {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // Détecter le thème système
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  // Calculer le thème actuel
  const calculateActualTheme = useCallback((currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  }, [getSystemTheme]);

  // Appliquer le thème au DOM avec animation élégante
  const applyTheme = useCallback((themeToApply: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Ajouter une classe de transition pour un effet fluide
      root.style.setProperty('transition', 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1)');
      
      // Appliquer le thème
      if (themeToApply === 'dark') {
        root.classList.add('dark');
        console.log('🌙 Mode sombre activé - classe "dark" ajoutée à <html>');
      } else {
        root.classList.remove('dark');
        console.log('☀️ Mode clair activé - classe "dark" retirée de <html>');
      }
      
      // Retirer la transition après l'animation pour éviter les ralentissements
      setTimeout(() => {
        root.style.removeProperty('transition');
      }, 300);
    }
  }, []);

  // Charger le thème depuis le stockage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (window.electronAPI?.getConfig) {
          const result = await window.electronAPI.getConfig();
          const config = result.success ? result.config : {};
          const savedTheme = config.theme || 'system';
          setThemeState(savedTheme);

          const actual = calculateActualTheme(savedTheme);
          setActualTheme(actual);
          applyTheme(actual);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
        // Fallback sur le thème système
        const systemTheme = getSystemTheme();
        setActualTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    loadTheme();
  }, [calculateActualTheme, applyTheme, getSystemTheme]);

  // Écouter les changements du thème système
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        if (theme === 'system') {
          const newActualTheme = getSystemTheme();
          setActualTheme(newActualTheme);
          applyTheme(newActualTheme);
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, getSystemTheme, applyTheme]);

  // Fonction pour changer le thème
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);

    const newActualTheme = calculateActualTheme(newTheme);
    setActualTheme(newActualTheme);
    applyTheme(newActualTheme);

    // Note: La sauvegarde est gérée par ConfigPanel via onSave
  }, [calculateActualTheme, applyTheme]);

  // Fonction pour basculer entre light et dark
  const toggleTheme = useCallback(() => {
    const newTheme = actualTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [actualTheme, setTheme]);

  return {
    theme,
    actualTheme,
    setTheme,
    toggleTheme
  };
}