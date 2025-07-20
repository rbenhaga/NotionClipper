// src/react/src/hooks/useConfig.js
import { useState, useCallback } from 'react';
import configService from '../services/config';

export function useConfig() {
  const [config, setConfig] = useState({
    notionToken: '',
    imgbbKey: '',
    onboardingCompleted: false,
    defaultParentPageId: '',
    autoSync: true,
    syncInterval: 30
  });

  // Charger la configuration
  const loadConfig = useCallback(async () => {
    try {
      const response = await configService.getConfig();
      const configData = response.config || {};
      
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
      const response = await configService.updateConfig(updates);
      
      if (response.success) {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        
        // Mettre à jour localStorage
        localStorage.setItem('notion_config', JSON.stringify(newConfig));
        
        return newConfig;
      }
      
      throw new Error('Échec de la mise à jour');
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
        return result; // Retourner l'objet complet, pas juste un boolean
      }
      return { success: false, valid: false, message: 'Electron API non disponible' };
    } catch (error) {
      console.error('Erreur validation token:', error);
      return { success: false, valid: false, message: error.message };
    }
  }, []);

  // Marquer l'onboarding comme complété
  const completeOnboarding = useCallback(async () => {
    try {
      await configService.completeOnboarding();
      const newConfig = { ...config, onboardingCompleted: true };
      setConfig(newConfig);
      localStorage.setItem('notion_config', JSON.stringify(newConfig));
    } catch (error) {
      console.error('Erreur completion onboarding:', error);
    }
  }, [config]);

  return {
    config,
    loadConfig,
    updateConfig,
    validateNotionToken,
    completeOnboarding
  };
}