// Service API utilisant uniquement IPC Electron
class ElectronAPI {
  constructor() {
    // Vérifier qu'on est dans Electron
    this.isElectron = window.electronAPI !== undefined;
    if (!this.isElectron) {
      console.error('ElectronAPI not available - running outside Electron?');
      // Créer un mock pour le développement
      this.createMockAPI();
    }
  }

  createMockAPI() {
    // Mock pour tests hors Electron
    window.electronAPI = {
      getConfig: async () => ({ success: false, error: 'Not in Electron' }),
      getPages: async () => ({ success: false, pages: [] }),
      // ... autres méthodes
    };
  }

  // Wrapper générique pour les appels IPC
  async invoke(channel, ...args) {
    try {
      const result = await window.electronAPI[channel](...args);
      if (result.success === false && result.error) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      console.error(`IPC Error [${channel}]:`, error);
      throw error;
    }
  }

  // Health check
  async checkHealth() {
    try {
      const config = await this.invoke('getConfig');
      return {
        status: 'healthy',
        isHealthy: true,
        notion_connected: !!config.config?.notionToken,
        firstRun: config.config?.firstRun || false
      };
    } catch (error) {
      return {
        status: 'error',
        isHealthy: false,
        error: error.message
      };
    }
  }

  // Configuration
  async get(endpoint) {
    // Router les anciens endpoints vers IPC
    switch (endpoint) {
      case '/health':
        return await this.checkHealth();
      case '/config':
        const configResult = await this.invoke('getConfig');
        return configResult.config || {};
      case '/pages':
      case '/pages?force_refresh=false':
        const pagesResult = await this.invoke('getPages', false);
        return { pages: pagesResult.pages || [] };
      case '/pages?force_refresh=true':
        const refreshResult = await this.invoke('getPages', true);
        return { pages: refreshResult.pages || [] };
      case '/pages/suggestions':
        return { suggestions: [] }; // Sera géré localement
      default:
        console.warn('Unhandled GET endpoint:', endpoint);
        return {};
    }
  }

  async post(endpoint, data = {}) {
    // Router les anciens endpoints vers IPC
    switch (endpoint) {
      case '/config':
        return await this.invoke('saveConfig', data);
      case '/send':
        return await this.invoke('sendToNotion', data);
      case '/preview/url':
        return await this.invoke('previewUrl', data.url);
      case '/create-preview-page':
        return await this.invoke('createPreviewPage', data.parentPageId);
      case '/validate-notion-page':
        return await this.invoke('validatePage', data);
      default:
        console.warn('Unhandled POST endpoint:', endpoint, data);
        return { success: false };
    }
  }

  // Server-Sent Events replacement
  createEventSource(endpoint) {
    // Simuler EventSource avec IPC
    const mockEventSource = {
      addEventListener: (event, callback) => {
        if (event === 'message') {
          // S'abonner aux événements IPC
          window.electronAPI.subscribe('pages-changed');
          window.electronAPI.on('event:pages-changed', (data) => {
            callback({ data: JSON.stringify(data) });
          });
        }
      },
      close: () => {
        window.electronAPI.unsubscribe('pages-changed');
      }
    };
    return mockEventSource;
  }

  // Garder la compatibilité avec l'ancien code
  async request(endpoint, options = {}) {
    if (options.method === 'POST') {
      return await this.post(endpoint, JSON.parse(options.body || '{}'));
    }
    return await this.get(endpoint);
  }
}

// Créer une instance singleton
const apiService = new ElectronAPI();

export default apiService;