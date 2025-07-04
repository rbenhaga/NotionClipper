// src/react/src/hooks/useConfig.js
/**
 * Hook pour la gestion de la configuration
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export function useConfig() {
  const [config, setConfig] = useState({
    notionToken: '',
    imgbbApiKey: '',
    notionPageId: '',
    notionPageUrl: '',
    onboardingCompleted: false
  });

  const loadConfig = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/config`);
      const configData = response.data.config || response.data;
      setConfig(configData);
      return configData;
    } catch (error) {
      console.error('Erreur chargement config:', error);
      return config;
    }
  }, []);

  const updateConfig = useCallback(async (newConfig) => {
    try {
      await axios.post(`${API_URL}/config`, newConfig);
      setConfig(newConfig);
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      return false;
    }
  }, []);

  return { config, updateConfig, loadConfig };
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