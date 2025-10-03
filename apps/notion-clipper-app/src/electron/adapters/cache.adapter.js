const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class ElectronCacheAdapter {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 2000; // Taille max en nombre d'entrées
    this.ttl = options.ttl || 3600000; // TTL par défaut : 1h en ms
    this.cachePath = path.join(app.getPath('userData'), 'cache');
    this.cacheFile = path.join(this.cachePath, 'cache.json');
    this.cache = new Map();
    this.initialized = false;
  }

  // Initialiser le cache (charger depuis le disque)
  async initialize() {
    if (this.initialized) return;

    try {
      // Créer le dossier cache si nécessaire
      await fs.mkdir(this.cachePath, { recursive: true });

      // Charger le cache depuis le fichier
      try {
        const data = await fs.readFile(this.cacheFile, 'utf8');
        const cacheData = JSON.parse(data);
        
        // Restaurer le cache en vérifiant les TTL
        const now = Date.now();
        let loaded = 0;
        let expired = 0;
        
        for (const [key, entry] of Object.entries(cacheData)) {
          if (!entry.expiresAt || entry.expiresAt > now) {
            this.cache.set(key, entry);
            loaded++;
          } else {
            expired++;
          }
        }
        
        console.log(`[OK] Cache loaded: ${loaded} entries (${expired} expired)`);
      } catch (error) {
        // Pas de fichier = cache vide
        console.log('[INFO] Initializing empty cache');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[ERROR] Error initializing cache:', error);
      throw error;
    }
  }

  // Sauvegarder le cache sur disque
  async persist() {
    try {
      const cacheObject = {};
      for (const [key, value] of this.cache.entries()) {
        cacheObject[key] = value;
      }
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheObject, null, 2));
      return true;
    } catch (error) {
      console.error('[ERROR] Error persisting cache:', error);
      return false;
    }
  }

  // Obtenir une valeur
  async get(key) {
    if (!this.initialized) await this.initialize();

    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Vérifier TTL
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      await this.persist();
      return null;
    }

    // Mettre à jour lastAccessed pour LRU
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  // Définir une valeur
  async set(key, value, ttl = this.ttl) {
    if (!this.initialized) await this.initialize();

    const now = Date.now();
    const entry = {
      value,
      createdAt: now,
      lastAccessed: now,
      expiresAt: ttl ? now + ttl : null
    };

    this.cache.set(key, entry);
    
    // Vérifier la taille et nettoyer si nécessaire
    await this.checkSize();
    
    // Sauvegarder (debounced dans une vraie implémentation)
    await this.persist();
    
    return true;
  }

  // Supprimer une valeur
  async remove(key) {
    if (!this.initialized) await this.initialize();

    const deleted = this.cache.delete(key);
    
    if (deleted) {
      await this.persist();
    }
    
    return deleted;
  }

  // Vérifier si une clé existe
  async has(key) {
    if (!this.initialized) await this.initialize();

    const entry = this.cache.get(key);
    
    if (!entry) return false;

    // Vérifier TTL
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      await this.persist();
      return false;
    }

    return true;
  }

  // Effacer tout le cache
  async clear() {
    if (!this.initialized) await this.initialize();

    const size = this.cache.size;
    this.cache.clear();
    await this.persist();
    
    console.log(`[OK] Cache cleared: ${size} entries removed`);
    return true;
  }

  // Obtenir toutes les clés
  async keys() {
    if (!this.initialized) await this.initialize();

    const now = Date.now();
    const validKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!entry.expiresAt || entry.expiresAt > now) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  // Obtenir la taille actuelle du cache
  async size() {
    if (!this.initialized) await this.initialize();

    // Nettoyer les entrées expirées
    await this.cleanup();
    return this.cache.size;
  }

  // Nettoyer les entrées expirées
  async cleanup() {
    if (!this.initialized) await this.initialize();

    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.persist();
      console.log(`[OK] Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  // Vérifier la taille et nettoyer si nécessaire (LRU)
  async checkSize() {
    const currentSize = this.cache.size;

    if (currentSize <= this.maxSize) return;

    // Trier par lastAccessed (moins récent en premier) - LRU
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Supprimer les moins récemment utilisées
    const toRemove = currentSize - this.maxSize;
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    console.log(`[OK] Removed ${toRemove} old cache entries (LRU cleanup)`);
  }

  // Obtenir les stats du cache
  async getStats() {
    if (!this.initialized) await this.initialize();

    const now = Date.now();
    let expired = 0;
    let valid = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expired++;
      } else {
        valid++;
      }
      
      // Estimation de la taille (approximative)
      totalSize += JSON.stringify(entry).length;
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize,
      usage: ((valid / this.maxSize) * 100).toFixed(2) + '%',
      sizeKB: (totalSize / 1024).toFixed(2)
    };
  }

  // Forcer le nettoyage complet (méthode spéciale pour l'ancien système)
  async forceCleanCache() {
    console.log('[INFO] Force cleaning cache...');
    await this.clear();
    
    // Supprimer aussi le fichier sur disque
    try {
      await fs.unlink(this.cacheFile);
      console.log('[OK] Cache file deleted');
    } catch (error) {
      // Fichier n'existe pas, c'est OK
    }
    
    return true;
  }

  // Méthode de compatibilité avec l'ancien système
  async deleteDatabase() {
    console.log('[INFO] Deleting cache database...');
    return await this.forceCleanCache();
  }
}

module.exports = ElectronCacheAdapter;
