// src/react/src/hooks/useConfig.js
import { useState, useCallback } from 'react';

export function useConfig() {
  const [config, setConfig] = useState({
    notionToken: '',
    onboardingCompleted: false,
    defaultParentPageId: '',
    autoSync: true,
    syncInterval: 30
  });

  // Charger la configuration
  const loadConfig = useCallback(async () => {
    try {
      const response = window.electronAPI?.getConfig
        ? await window.electronAPI.getConfig()
        : null;
      const fromStorage = localStorage.getItem('notion_config');
      const fallback = fromStorage ? JSON.parse(fromStorage) : {};
      const configData = (response?.config) || fallback || {};
      
      // Stocker aussi dans localStorage pour l'accès par l'API service
      localStorage.setItem('notion_config', JSON.stringify(configData));
      
      setConfig(configData);
      return configData;
    } catch (error) {
      console.error('Erreur chargement config:', error);
      
      // Essayer de charger depuis localStorage en fallback
      const stored = localStorage.getItem('notion_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig(parsed);
        return parsed;
      }
      
      return config;
    }
  }, []);

  // Mettre à jour la configuration
  const updateConfig = useCallback(async (updates) => {
    try {
      let success = false;
      if (window.electronAPI?.updateConfig) {
        const response = await window.electronAPI.updateConfig(updates);
        success = !!response?.success;
      } else {
        // Pas d'API Electron: on met à jour localement
        success = true;
      }

      if (!success) throw new Error('Échec de la mise à jour');

      const newConfig = { ...config, ...updates };
      setConfig(newConfig);

      // Mettre à jour localStorage
      localStorage.setItem('notion_config', JSON.stringify(newConfig));

      return newConfig;
    } catch (error) {
      console.error('Erreur mise à jour config:', error);
      throw error;
    }
  }, [config]);

  // Valider un token Notion
  const validateNotionToken = useCallback(async (token) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.verifyToken(token);
        return result; // Retourner l'objet complet avec success/error
      }
      return { success: false, error: 'Electron API non disponible' };
    } catch (error) {
      console.error('Erreur validation token:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Marquer l'onboarding comme complété
  const completeOnboarding = useCallback(async () => {
    try {
      if (window.electronAPI?.completeOnboarding) {
        await window.electronAPI.completeOnboarding();
      }
      await updateConfig({ onboardingCompleted: true });
    } catch (error) {
      console.error('Erreur completion onboarding:', error);
    }
  }, [updateConfig]);

  return {
    config,
    loadConfig,
    updateConfig,
    validateNotionToken,
    completeOnboarding
  };
}