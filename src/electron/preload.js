// src/electron/preload.js

const { contextBridge, ipcRenderer } = require('electron');

// Exposer des APIs sécurisées au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Version de l'app
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Ouvrir un lien externe
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Platform info
  platform: process.platform,
  
  // Contrôles de fenêtre
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // Événements optionnels (seulement si utilisés)
  on: (channel, callback) => {
    const validChannels = ['shortcut-triggered', 'refresh-app'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  removeAllListeners: (channel) => {
    const validChannels = ['shortcut-triggered', 'refresh-app'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  
  // API pour le rafraîchissement de l'app
  onRefreshApp: (callback) => {
    ipcRenderer.on('refresh-app', (event, ...args) => callback(...args));
  }
});