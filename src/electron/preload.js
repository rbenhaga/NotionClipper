const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  getValue: (key) => ipcRenderer.invoke('config:get-value', key),
  setValue: (data) => ipcRenderer.invoke('config:set-value', data),
  resetConfig: () => ipcRenderer.invoke('config:reset'),
  // Onboarding et validation
  verifyToken: (token) => ipcRenderer.invoke('config:verify-token', token),
  createPreviewPageConfig: (parentId) => ipcRenderer.invoke('config:create-preview-page', parentId),
  validatePageUrl: (url) => ipcRenderer.invoke('config:validate-page', url),
  completeOnboarding: () => ipcRenderer.invoke('config:complete-onboarding'),
  // Alias pour compatibilité
  markOnboardingComplete: () => ipcRenderer.invoke('config:complete-onboarding'),
  // Notion
  initialize: (token) => ipcRenderer.invoke('notion:initialize', token),
  testConnection: () => ipcRenderer.invoke('notion:test-connection'),
  getPages: (refresh) => ipcRenderer.invoke('notion:get-pages', refresh),
  sendToNotion: (data) => ipcRenderer.invoke('notion:send', data),
  createPage: (data) => ipcRenderer.invoke('notion:create-page', data),
  searchPages: (query) => ipcRenderer.invoke('notion:search', query),
  // Pages
  createPreviewPage: (parentId) => ipcRenderer.invoke('page:create-preview', parentId),
  validatePage: (data) => ipcRenderer.invoke('page:validate', data),
  getRecentPages: (limit) => ipcRenderer.invoke('page:get-recent', limit),
  getFavorites: () => ipcRenderer.invoke('page:get-favorites'),
  toggleFavorite: (pageId) => ipcRenderer.invoke('page:toggle-favorite', pageId),
  clearCache: () => ipcRenderer.invoke('page:clear-cache'),
  // Content
  previewUrl: (url) => ipcRenderer.invoke('content:preview-url', url),
  parseContent: (data) => ipcRenderer.invoke('content:parse', data),
  uploadImage: (data) => ipcRenderer.invoke('content:upload-image', data),
  // Clipboard
  getClipboard: () => ipcRenderer.invoke('clipboard:get'),
  setClipboard: (data) => ipcRenderer.invoke('clipboard:set', data),
  clearClipboard: () => ipcRenderer.invoke('clipboard:clear'),
  getHistory: () => ipcRenderer.invoke('clipboard:get-history'),
  // Suggestions
  getSuggestions: (query) => ipcRenderer.invoke('suggestion:get', query),
  clearSuggestionCache: () => ipcRenderer.invoke('suggestion:clear-cache'),
  // Stats
  getStats: () => ipcRenderer.invoke('stats:get'),
  getStatsSummary: () => ipcRenderer.invoke('stats:get-summary'),
  resetStats: () => ipcRenderer.invoke('stats:reset'),
  // Events
  subscribe: (event) => ipcRenderer.invoke('events:subscribe', event),
  unsubscribe: (event) => ipcRenderer.invoke('events:unsubscribe', event),
  // Listeners
  on: (channel, callback) => {
    const validChannels = [
      'event:pages-changed',
      'event:clipboard-changed',
      'event:sync-status',
      'stats:updated',
      'window:show',
      'window:hide'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  // App
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  // Window
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  // Panel
  getPanelStats: () => ipcRenderer.invoke('stats:panel'),
  // Suggestions hybrides
  getHybridSuggestions: (data) => ipcRenderer.invoke('suggestion:hybrid', data),
});