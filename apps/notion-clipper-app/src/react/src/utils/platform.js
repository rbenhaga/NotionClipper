// Utilitaire pour gérer les différences entre environnements

export const getPlatform = () => {
  // Vérifier si on est dans Electron
  if (window.electronAPI?.platform) {
    return window.electronAPI.platform;
  }
  
  // Fallback pour le navigateur
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'darwin';
  if (userAgent.includes('win')) return 'win32';
  return 'linux';
};

export const getShortcutModifier = () => {
  return getPlatform() === 'darwin' ? 'Cmd' : 'Ctrl';
};

export const isElectron = () => {
  return window.electronAPI !== undefined;
};

// Vérifier si une fonctionnalité Electron est disponible
export const hasElectronFeature = (feature) => {
  return window.electronAPI && typeof window.electronAPI[feature] === 'function';
}; 