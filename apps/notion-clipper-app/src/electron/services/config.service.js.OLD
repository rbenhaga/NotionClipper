const Store = require('electron-store');
const crypto = require('crypto');

class ConfigService {
  constructor() {
    // Initialiser d'abord le store général
    this.generalStore = new Store({
      name: 'notion-clipper-general'
    });

    // Ensuite le store chiffré avec la clé
    this.store = new Store({
      name: 'notion-clipper-config',
      encryptionKey: this.getOrCreateEncryptionKey(),
      schema: {
        notionToken: { type: 'string', default: '' },
        previewPageId: { type: 'string', default: '' },
        theme: { type: 'string', default: 'dark' },
        favorites: { type: 'array', default: [] },
        onboardingCompleted: { type: 'boolean', default: false },
        enablePolling: { type: 'boolean', default: true },
        pollingInterval: { type: 'number', default: 30000 },
        cacheSize: { type: 'number', default: 2000 }
      }
    });
  }

  getOrCreateEncryptionKey() {
    let key = this.generalStore.get('encryptionKey');
    if (!key) {
      // Générer une clé aléatoire
      key = crypto.randomBytes(32).toString('hex');
      this.generalStore.set('encryptionKey', key);
    }
    return key;
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
    return this.get(key);
  }

  getAll() {
    return this.store.store;
  }

  setMultiple(config) {
    Object.entries(config).forEach(([key, value]) => {
      this.set(key, value);
    });
    return this.getAll();
  }

  clear() {
    this.store.clear();
  }

  // Reset complet avec suppression des fichiers
  resetAll() {
    const { app } = require('electron');
    const fs = require('fs');
    const path = require('path');

    try {
      // Vider les stores
      this.store.clear();
      this.generalStore.clear();
    } catch (e) {}

    // Supprimer physiquement les fichiers de config
    try {
      const userDataPath = app.getPath('userData');
      const filesToDelete = [
        'notion-clipper-config.json',
        'notion-clipper-general.json',
        'cache.json',
        'offline_queue.json'
      ];
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(path.join(userDataPath, file));
        } catch (e) {
          // Ignorer si le fichier n'existe pas
        }
      });
    } catch (e) {}

    // Réinitialiser le store chifré avec une nouvelle clé
    const Store = require('electron-store');
    const crypto = require('crypto');
    this.store = new Store({
      name: 'notion-clipper-config',
      encryptionKey: crypto.randomBytes(32).toString('hex'),
      schema: {
        notionToken: { type: 'string', default: '' },
        previewPageId: { type: 'string', default: '' },
        theme: { type: 'string', default: 'dark' },
        favorites: { type: 'array', default: [] },
        onboardingCompleted: { type: 'boolean', default: false },
        enablePolling: { type: 'boolean', default: true },
        pollingInterval: { type: 'number', default: 30000 },
        cacheSize: { type: 'number', default: 2000 }
      }
    });
  }

  // Méthodes spécifiques
  getNotionToken() {
    try {
      const encrypted = this.store.get('notionToken');
      if (!encrypted) return null;
      // Si c'est déjà un token en clair (migration)
      if (encrypted.startsWith('ntn')) {
        return encrypted;
      }
      // Sinon, décrypter
      return this.decrypt(encrypted);
    } catch (error) {
      console.error('Error getting Notion token:', error);
      return null;
    }
  }

  setNotionToken(token) {
    return this.set('notionToken', token);
  }

  isConfigured() {
    const token = this.get('notionToken');
    return token && token.length > 0;
  }

  isFirstRun() {
    return !this.get('onboardingCompleted', false);
  }
}

module.exports = new ConfigService();