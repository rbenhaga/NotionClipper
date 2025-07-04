// Hook pour gérer les fonctionnalités Electron

import { useEffect, useState } from 'react';
import { isElectron, hasElectronFeature } from '../utils/platform';

export function useElectron() {
  const [isElectronApp, setIsElectronApp] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState({});

  useEffect(() => {
    const checkElectron = () => {
      setIsElectronApp(isElectron());
      
      if (isElectron()) {
        // Vérifier les fonctionnalités disponibles
        const features = {
          minimize: hasElectronFeature('minimize'),
          maximize: hasElectronFeature('maximize'),
          close: hasElectronFeature('close'),
          openExternal: hasElectronFeature('openExternal'),
          getVersion: hasElectronFeature('getVersion')
        };
        setAvailableFeatures(features);
      }
    };

    checkElectron();
  }, []);

  return {
    isElectronApp,
    availableFeatures,
    callElectronAPI: async (method, ...args) => {
      if (window.electronAPI && window.electronAPI[method]) {
        try {
          return await window.electronAPI[method](...args);
        } catch (error) {
          console.error(`Erreur appel Electron API ${method}:`, error);
          return null;
        }
      }
      console.warn(`Méthode Electron ${method} non disponible`);
      return null;
    }
  };
} 