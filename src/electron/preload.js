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
  
  // Refresh app handler
  onRefreshApp: (callback) => {
    ipcRenderer.on('refresh-app', callback);
  },
  
  // Événements
  on: (channel, callback) => {
    const validChannels = ['clipboard-update', 'shortcut-triggered', 'refresh-app'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  removeAllListeners: (channel) => {
    const validChannels = ['clipboard-update', 'shortcut-triggered', 'refresh-app'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});