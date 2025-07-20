const { contextBridge, ipcRenderer } = require('electron');

// Liste des canaux autorisés
const ALLOWED_CHANNELS = {
  // Config
  'config:get': true,
  'config:get-value': true,
  'config:save': true,
  'config:set-value': true,
  'config:reset': true,
  'config:export': true,
  'config:import': true,
  
  // Notion
  'notion:initialize': true,
  'notion:test-connection': true,
  'notion:get-pages': true,
  'notion:send': true,
  'notion:create-page': true,
  'notion:search': true,
  
  // Clipboard
  'clipboard:get': true,
  'clipboard:set': true,
  'clipboard:clear': true,
  'clipboard:get-history': true,
  'clipboard:clear-history': true,
  
  // Stats
  'stats:get': true,
  'stats:get-summary': true,
  'stats:get-hourly': true,
  'stats:reset': true,
  'stats:export': true,
  
  // Window
  'window-minimize': true,
  'window-maximize': true,
  'window-close': true,
  'get-app-version': true,
  'open-external': true
};

// API exposée au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: async (channel, data) => {
    if (!ALLOWED_CHANNELS[channel]) {
      throw new Error(`Channel non autorisé: ${channel}`);
    }
    return await ipcRenderer.invoke(channel, data);
  },
  
  on: (channel, callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  platform: process.platform,
  version: process.versions.electron
});