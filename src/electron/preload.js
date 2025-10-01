const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Méthode invoke générique (whitelistée)
  invoke: (channel, data) => {
    const validChannels = [
      'clipboard:get',
      'clipboard:set',
      'clipboard:clear',
      'clipboard:get-history',
      'config:get',
      'config:save',
      'config:get-value',
      'config:set-value',
      'config:reset',
      'config:complete-onboarding',
      'notion:initialize',
      'notion:test-connection',
      'notion:get-pages',
      'notion:send',
      'notion:create-page',
      'notion:search',
      'notion:get-page-info',
      'notion:get-database-schema',
      'page:create-preview',
      'page:validate',
      'page:get-recent',
      'page:get-favorites',
      'page:toggle-favorite',
      'content:preview-url',
      'content:parse',
      'content:upload-image',
      'stats:get',
      'suggestion:get',
      'suggestion:clear-cache',
      'get-app-version',
      'open-external',
      'window-minimize',
      'window-maximize',
      'window-close',
      'stats:panel',
      'suggestion:hybrid'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    console.error(`Canal IPC non autorisé: ${channel}`);
    throw new Error(`Canal IPC non autorisé: ${channel}`);
  },
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
  getPageInfo: (pageId) => ipcRenderer.invoke('notion:get-page-info', pageId),
  getDatabaseSchema: (databaseId) => ipcRenderer.invoke('notion:get-database-schema', databaseId),
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
  // Clipboard amélioré
  getClipboard: () => ipcRenderer.invoke('clipboard:get'),
  setClipboard: (data) => ipcRenderer.invoke('clipboard:set', data),
  clearClipboard: () => ipcRenderer.invoke('clipboard:clear'),
  getClipboardHistory: () => ipcRenderer.invoke('clipboard:get-history'),
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
      'clipboard:changed',
      'clipboard:cleared',
      'clipboard:error',
      'event:pages-changed',
      'pages:changed',
      'event:sync-status',
      'notion:sync-status',
      'stats:updated',
      'window:show',
      'window:hide'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
    }
  },
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
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