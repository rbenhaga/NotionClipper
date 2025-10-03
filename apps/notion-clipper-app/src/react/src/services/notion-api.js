// Nouvelle API utilisant IPC au lieu de HTTP
class NotionAPI {
    constructor() {
      this.isElectron = window.electronAPI !== undefined;
    }
  
    // Méthode helper pour les appels IPC
    async invoke(channel, data) {
      if (!this.isElectron) {
        throw new Error('Not running in Electron');
      }
      return await window.electronAPI.invoke(channel, data);
    }
  
    // Configuration
    async getConfig() {
      return await this.invoke('config:get');
    }
  
    async saveConfig(config) {
      return await this.invoke('config:save', config);
    }
  
    // Notion
    async initialize(token) {
      return await this.invoke('notion:initialize', token);
    }
  
    async getPages(forceRefresh = false) {
      return await this.invoke('notion:get-pages', forceRefresh);
    }
  
    async sendToNotion(pageId, content, options = {}) {
      return await this.invoke('notion:send', {
        pageId,
        content,
        options
      });
    }
  
    async createPage(parentId, title, content = null) {
      return await this.invoke('notion:create-page', {
        parentId,
        title,
        content
      });
    }
  
    async searchPages(query) {
      return await this.invoke('notion:search', query);
    }
  
    // Clipboard
    async getClipboard() {
      return await this.invoke('clipboard:get');
    }
  
    async setClipboard(content, type = 'text') {
      return await this.invoke('clipboard:set', { content, type });
    }
  
    async clearClipboard() {
      return await this.invoke('clipboard:clear');
    }
  
    async getClipboardHistory() {
      return await this.invoke('clipboard:get-history');
    }
  
    // Stats
    async getStats() {
      return await this.invoke('stats:get');
    }
  
    // Événements
    onPagesChanged(callback) {
      if (this.isElectron) {
        window.electronAPI.on('notion:pages-changed', callback);
      }
    }
  
    onClipboardChanged(callback) {
      if (this.isElectron) {
        window.electronAPI.on('clipboard:changed', callback);
      }
    }
  
    removeAllListeners(channel) {
      if (this.isElectron) {
        window.electronAPI.removeAllListeners(channel);
      }
    }
  }
  
  export default new NotionAPI();