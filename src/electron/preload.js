const { contextBridge, ipcRenderer } = require('electron');

// Exposition sécurisée des APIs Electron vers React
contextBridge.exposeInMainWorld('electronAPI', {
  // Contrôles de fenêtre
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'), 
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Informations app
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // Event listeners
  onRefreshApp: (callback) => ipcRenderer.on('refresh-app', callback),
  removeRefreshListener: () => ipcRenderer.removeAllListeners('refresh-app'),
  
  // Platform info
  platform: process.platform,
  isDev: process.argv.includes('--dev')
});

// Logs pour debug
console.log('🔌 Preload script loaded successfully');