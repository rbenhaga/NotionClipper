// src/react/src/contexts/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AppContext = createContext();

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function AppProvider({ children }) {
  // État global
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [notification, setNotification] = useState(null);
  const [appVersion, setAppVersion] = useState('3.0.0');

  // Gérer la connexion réseau
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Vérifier la connexion backend
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await apiService.checkHealth();
        setIsBackendConnected(health.isHealthy);
      } catch (error) {
        setIsBackendConnected(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Vérifier toutes les 30s

    return () => clearInterval(interval);
  }, []);

  // Gérer le thème
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Récupérer la version si Electron
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getVersion().then(version => {
        setAppVersion(version);
      });
    }
  }, []);

  // Fonctions utilitaires
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const showNotification = (message, type = 'info', duration = 3000) => {
    setNotification({ message, type, id: Date.now() });
    
    if (duration > 0) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };

  const hideNotification = () => setNotification(null);

  const openExternalLink = async (url) => {
    if (window.electronAPI) {
      await window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const refreshApp = () => {
    if (window.electronAPI) {
      window.electronAPI.refreshApp();
    } else {
      window.location.reload();
    }
  };

  const value = {
    // État
    isOnline,
    isBackendConnected,
    isDarkMode,
    notification,
    appVersion,
    
    // Actions
    toggleTheme,
    showNotification,
    hideNotification,
    openExternalLink,
    refreshApp,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}