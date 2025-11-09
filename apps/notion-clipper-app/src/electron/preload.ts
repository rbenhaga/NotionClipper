import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 🔥 NOUVEAU: Méthode send synchrone pour les événements critiques (drag)
  send: (channel, data) => {
    const validChannels = [
      'bubble:drag-start',
      'bubble:drag-move',
      'bubble:drag-end',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
      return;
    }
    console.error(`Canal IPC send non autorisé: ${channel}`);
    throw new Error(`Canal IPC send non autorisé: ${channel}`);
  },
  
  // Méthode invoke générique (whitelistée)
  invoke: (channel, data) => {
    const validChannels = [
      'clipboard:get',
      'clipboard:set',
      'clipboard:clear',
      'clipboard:get-history',
      'config:get',
      'config:set',
      'config:save',
      'config:get-value',
      'config:set-value',
      'config:reset',
      'config:complete-onboarding',
      'config:verify-token',
      'notion:initialize',
      'notion:reinitialize-service',
      'notion:test-connection',
      'notion:get-pages',
      'notion:get-recent-pages',
      'notion:send',
      'notion:create-page',
      'notion:search',
      'notion:get-page-info',
      'notion:get-database-schema',
      'notion:get-database',
      'notion:startOAuth',
      'notion:validateApiKey',
      'notion:check-auth-status',
      'notion:force-reauth',
      'notion:oauth-callback',
      'notion:oauth-callback-wait',
      'notion:get-page-blocks',
      'notion:invalidate-blocks-cache',
      'notion:get-pages-paginated',
      'notion:get-recent-pages-paginated',
      'page:validate',
      'page:get-recent',
      'page:get-favorites',
      'page:toggle-favorite',
      'page:clear-cache',
      'content:parse',
      'content:upload-image',
      'stats:get',
      'stats:reset',
      'suggestion:get',
      'suggestion:clear-cache',
      'polling:get-status',
      'get-app-version',
      'open-external',
      'window-minimize',
      'window-maximize',
      'window-close',
      'window-toggle-pin',
      'window-get-pin-state',
      'window-set-minimalist-size',
      'window-set-opacity',
      'window-toggle-minimalist',
      'window-save-position',
      'stats:panel',
      
      // 🆕 Auth & Workspace channels
      'auth:initialize',
      'auth:get-user',
      'auth:is-authenticated',
      'auth:start-oauth',
      'auth:handle-callback',
      'auth:sign-in-api-key',
      'auth:sign-out',
      'auth:get-notion-token',
      'auth:get-status',
      
      'workspace:initialize',
      'workspace:get-all',
      'workspace:get-current',
      'workspace:get-default',
      'workspace:switch',
      'workspace:set-default',
      'workspace:update',
      'workspace:remove',
      'workspace:refresh',
      'workspace:get-stats',
      'workspace:clear-cache',
      
      // Multi-workspace internal
      'workspace-internal:add',
      'workspace-internal:get-all',
      'workspace-internal:get-current',
      'workspace-internal:switch',
      'workspace-internal:set-default',
      'workspace-internal:remove',
      'workspace-internal:get-api-key',
      'workspace-internal:get-stats',
      'workspace-internal:validate-api-key',
      'workspace-internal:clear-all',
      'suggestion:hybrid',
      // 🆕 Nouveaux canaux IPC
      'file:pick',
      'file:upload',
      'file:upload-url',
      'file:validate',
      'history:get',
      'history:getAll',
      'history:get-stats',
      'history:getStats',
      'history:add',
      'history:update',
      'history:delete',
      'history:remove',
      'history:clear',
      'history:retry',
      'history:cleanup',
      'queue:get',
      'queue:getAll',
      'queue:get-stats',
      'queue:getStats',
      'queue:enqueue',
      'queue:retry',
      'queue:remove',
      'queue:clear',
      'queue:setOnlineStatus',
      'queue:start-auto-process',
      'queue:stop-auto-process',
      // Cache
      'cache:clear',
      'cache:get',
      'cache:set',
      'cache:delete',
      // Services status
      'services-status',
      
      // Focus Mode channels
      'focus-mode:get-state',
      'focus-mode:enable',
      'focus-mode:disable',
      'focus-mode:toggle',
      'focus-mode:quick-send',
      'focus-mode:upload-files',
      'focus-mode:update-config',
      'focus-mode:update-bubble-position',
      // 🔧 FIX: Focus Mode channels
      'focus-mode:get-intro-state',
      'focus-mode:save-intro-state',
      'focus-mode:reset-intro',
      'focus-mode:show-bubble-after-intro',
      'focus-mode:force-show-bubble',
      'focus-mode:enable-with-bubble',
      'focus-mode:change-page',
      'focus-mode:show-history',
      'focus-mode:set-target-pages', // 🔥 NOUVEAU: Support multi-pages
      
      // Bubble channels
      'bubble:expand-menu',
      'bubble:collapse',
      'bubble:drag-start',
      'bubble:drag-move',
      'bubble:drag-end',
      'bubble:set-mouse-events',
      'bubble:open-menu',
      'bubble:close-menu',
      'bubble:toggle-menu',
      
      // Window channels
      'window:show-main'
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
  validatePageUrl: (url) => ipcRenderer.invoke('config:validate-page', url),
  completeOnboarding: () => ipcRenderer.invoke('config:complete-onboarding'),
  // Alias pour compatibilité
  markOnboardingComplete: () => ipcRenderer.invoke('config:complete-onboarding'),
  // Notion
  initialize: (token) => ipcRenderer.invoke('notion:initialize', token),
  testConnection: () => ipcRenderer.invoke('notion:test-connection'),
  // Health helper combining config + notion test
  checkHealth: async () => {
    try {
      const cfg = await ipcRenderer.invoke('config:get');
      const test = await ipcRenderer.invoke('notion:test-connection');
      const onboardingCompleted = !!cfg?.config?.onboardingCompleted;
      return {
        isHealthy: !!test?.success,
        firstRun: !onboardingCompleted,
        onboardingCompleted
      };
    } catch (error) {
      return {
        isHealthy: false,
        firstRun: true,
        onboardingCompleted: false,
        error: error?.message || String(error)
      };
    }
  },
  getPages: (refresh) => ipcRenderer.invoke('notion:get-pages', refresh),
  sendToNotion: (data) => ipcRenderer.invoke('notion:send', data),
  createPage: (data) => ipcRenderer.invoke('notion:create-page', data),
  searchPages: (query) => ipcRenderer.invoke('notion:search', query),
  getPageInfo: (pageId) => ipcRenderer.invoke('notion:get-page-info', pageId),
  getDatabaseSchema: (databaseId) => ipcRenderer.invoke('notion:get-database-schema', databaseId),
  getDataSourceSchema: (dataSourceId) => ipcRenderer.invoke('notion:get-data-source-schema', dataSourceId),
  getDatabase: (databaseId) => ipcRenderer.invoke('notion:getDatabase', databaseId),
  getPageBlocks: (pageId) => ipcRenderer.invoke('notion:get-page-blocks', pageId),
  
  // ✅ NOUVELLES MÉTHODES PAGINATION
  getPagesPaginated: (options?: { cursor?: string; pageSize?: number }) =>
    ipcRenderer.invoke('notion:get-pages-paginated', options),
  getRecentPagesPaginated: (options?: { cursor?: string; limit?: number }) =>
    ipcRenderer.invoke('notion:get-recent-pages-paginated', options),
  // Pages
  validatePage: (data) => ipcRenderer.invoke('page:validate', data),
  getRecentPages: (limit) => ipcRenderer.invoke('page:get-recent', limit),
  getFavorites: () => ipcRenderer.invoke('page:get-favorites'),
  toggleFavorite: (pageId) => ipcRenderer.invoke('page:toggle-favorite', pageId),
  clearCache: () => ipcRenderer.invoke('page:clear-cache'),
  // Content
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
      'window:hide',
      // 🆕 Nouveaux événements
      'queue:updated',
      'history:updated',
      'oauth:result',
      'invalidate-blocks-cache',
      'pages:progress',
      
      // Focus Mode events
      'focus-mode:enabled',
      'focus-mode:disabled',
      'focus-mode:clip-sent',
      'focus-mode:notification',
      
      // Bubble events
      'bubble:state-change',
      'bubble:size-changed',
      'bubble:drag-state',
      'bubble:position-restored'
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
  // NOUVELLES MÉTHODES WINDOW
  togglePin: () => ipcRenderer.invoke('window-toggle-pin'),
  getPinState: () => ipcRenderer.invoke('window-get-pin-state'),
  setMinimalistSize: (isMinimalist) => ipcRenderer.invoke('window-set-minimalist-size', isMinimalist),
  setOpacity: (opacity) => ipcRenderer.invoke('window-set-opacity', opacity),
  // Panel
  getPanelStats: () => ipcRenderer.invoke('stats:panel'),
  // Suggestions hybrides
  getHybridSuggestions: (data) => ipcRenderer.invoke('suggestion:hybrid', data),

  // 🆕 File APIs
  file: {
    upload: (file, options, pageId) => ipcRenderer.invoke('file:upload', file, options, pageId),
    validate: (file, maxSize) => ipcRenderer.invoke('file:validate', file, maxSize),
    preview: (filePath) => ipcRenderer.invoke('file:preview', filePath)
  },

  // 🆕 History APIs
  history: {
    add: (entry) => ipcRenderer.invoke('history:add', entry),
    getAll: (filter) => ipcRenderer.invoke('history:getAll', filter),
    getStats: () => ipcRenderer.invoke('history:getStats'),
    retry: (id) => ipcRenderer.invoke('history:retry', id),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    remove: (id) => ipcRenderer.invoke('history:remove', id),
    clear: (filter) => ipcRenderer.invoke('history:clear', filter),
    addTest: () => ipcRenderer.invoke('history:addTest')
  },

  // 🆕 Queue APIs
  queue: {
    add: (item) => ipcRenderer.invoke('queue:add', item),
    getAll: () => ipcRenderer.invoke('queue:getAll'),
    getStats: () => ipcRenderer.invoke('queue:getStats'),
    retry: (id) => ipcRenderer.invoke('queue:retry', id),
    remove: (id) => ipcRenderer.invoke('queue:remove', id),
    clear: () => ipcRenderer.invoke('queue:clear'),
    start: () => ipcRenderer.invoke('queue:start'),
    stop: () => ipcRenderer.invoke('queue:stop'),
    networkStatus: () => ipcRenderer.invoke('queue:networkStatus')
  },

  // 🔧 FIX: Focus Mode methods
  focusMode: {
    getState: () => ipcRenderer.invoke('focus-mode:get-state'),
    enable: (page) => ipcRenderer.invoke('focus-mode:enable', page),
    disable: () => ipcRenderer.invoke('focus-mode:disable'),
    toggle: (page) => ipcRenderer.invoke('focus-mode:toggle', page),
    quickSend: () => ipcRenderer.invoke('focus-mode:quick-send'),
    uploadFiles: (files) => ipcRenderer.invoke('focus-mode:upload-files', files),
    updateConfig: (config) => ipcRenderer.invoke('focus-mode:update-config', config),
    updateBubblePosition: (position) => ipcRenderer.invoke('focus-mode:update-bubble-position', position),
    getIntroState: () => ipcRenderer.invoke('focus-mode:get-intro-state'),
    saveIntroState: (hasShown: boolean) => ipcRenderer.invoke('focus-mode:save-intro-state', hasShown),
    resetIntro: () => ipcRenderer.invoke('focus-mode:reset-intro'),
    showBubbleAfterIntro: () => ipcRenderer.invoke('focus-mode:show-bubble-after-intro'),
    setTargetPages: (pages) => ipcRenderer.invoke('focus-mode:set-target-pages', pages) // 🔥 NOUVEAU
  },

  // ✅ Nouveaux handlers pour la gestion de la fenêtre
  toggleMinimalistMode: (isMinimalist) => ipcRenderer.invoke('window-toggle-minimalist', isMinimalist),
  saveWindowPosition: () => ipcRenderer.invoke('window-save-position')
});