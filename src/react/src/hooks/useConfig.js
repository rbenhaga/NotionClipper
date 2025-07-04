// src/react/src/hooks/useConfig.js
/**
 * Hook pour la gestion de la configuration
 */

import { useState, useEffect, useCallback } from 'react';
import configService from '../services/config';
import { useApi } from './useApi';

export function useConfig() {
  const [config, setConfig] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [isFirstRun, setIsFirstRun] = useState(false);
  
  const { loading, error, execute: fetchConfig } = useApi(configService.getConfig);
  const { execute: updateConfigApi } = useApi(configService.updateConfig);
  const { execute: fetchPreferences } = useApi(configService.getPreferences);
  const { execute: updatePreferencesApi } = useApi(configService.updatePreferences);

  // Charger la configuration au montage
  useEffect(() => {
    loadConfig();
    loadPreferences();
  }, []);

  // Charger la configuration
  const loadConfig = useCallback(async () => {
    try {
      const response = await fetchConfig();
      setConfig(response.config);
      return response;
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
      return null;
    }
  }, [fetchConfig]);

  // Charger les préférences
  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetchPreferences();
      setPreferences(response.preferences || {});
      return response.preferences;
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
      return {};
    }
  }, [fetchPreferences]);

  // Vérifier le premier lancement
  const checkFirstRun = useCallback(async () => {
    try {
      const response = await configService.getConfig();
      const hasToken = response.config?.notionToken && 
                      !response.config.notionToken.startsWith('****');
      
      setIsFirstRun(!hasToken);
      return !hasToken;
    } catch (error) {
      setIsFirstRun(true);
      return true;
    }
  }, []);

  // Mettre à jour la configuration
  const updateConfig = useCallback(async (newConfig) => {
    try {
      const response = await updateConfigApi(newConfig);
      if (response.success) {
        await loadConfig(); // Recharger la config
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [updateConfigApi, loadConfig]);

  // Mettre à jour les préférences
  const updatePreferences = useCallback(async (newPreferences) => {
    try {
      const merged = { ...preferences, ...newPreferences };
      const response = await updatePreferencesApi(merged);
      if (response.success) {
        setPreferences(merged);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [preferences, updatePreferencesApi]);

  // Réinitialiser la configuration
  const resetConfig = useCallback(async () => {
    try {
      const response = await configService.resetConfig();
      if (response.success) {
        setConfig(null);
        setPreferences({});
        setIsFirstRun(true);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Valider le token Notion
  const validateNotionToken = useCallback(async (token) => {
    return await configService.validateNotionToken(token);
  }, []);

  // Configurer ImgBB
  const setImgBBKey = useCallback(async (key) => {
    return await updateConfig({ imgbbKey: key });
  }, [updateConfig]);

  // Marquer l'onboarding comme complété
  const completeOnboarding = useCallback(async () => {
    return await updatePreferences({ onboardingCompleted: true });
  }, [updatePreferences]);

  return {
    // État
    config,
    preferences,
    isFirstRun,
    loading,
    error,
    
    // Actions
    loadConfig,
    loadPreferences,
    checkFirstRun,
    updateConfig,
    updatePreferences,
    resetConfig,
    validateNotionToken,
    setImgBBKey,
    completeOnboarding,
    
    // Getters
    hasNotionToken: () => config?.notionToken && !config.notionToken.startsWith('****'),
    hasImgBBKey: () => config?.imgbbKey && !config.imgbbKey.startsWith('****'),
    getTheme: () => preferences.theme || 'light',
    getLanguage: () => preferences.language || 'fr',
  };
}

/**
 * Hook pour les mises à jour
 */
export function useUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const { execute: checkUpdates } = useApi(configService.checkUpdates);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      const response = await checkUpdates();
      setUpdateAvailable(response.updateAvailable);
      setUpdateInfo(response);
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error);
    }
  }, [checkUpdates]);

  return {
    updateAvailable,
    updateInfo,
    checkForUpdates
  };
}