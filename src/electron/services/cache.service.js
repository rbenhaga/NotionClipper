const { LRUCache } = require('lru-cache');  // Import correct
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

class CacheService {
  constructor() {
    // Cache LRU en mémoire
    this.memoryCache = new LRUCache({
      max: 2000,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Base de données SQLite pour persistance
    const dbPath = path.join(app.getPath('userData'), 'notion-cache.db');
    this.db = new Database(dbPath);
    
    this.initDatabase();
    this.loadFromDisk();
  }

  initDatabase() {
    // Table pour les pages
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        hash TEXT NOT NULL,
        last_updated INTEGER NOT NULL
      )
    `);

    // Table pour les métadonnées
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Index pour performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pages_updated 
      ON pages(last_updated)
    `);
  }

  // Charger depuis le disque au démarrage
  loadFromDisk() {
    try {
      const stmt = this.db.prepare('SELECT * FROM pages');
      const pages = stmt.all();
      
      pages.forEach(row => {
        const data = JSON.parse(row.data);
        
        // Nettoyer les pages des propriétés système cachées lors du chargement
        if (data.type === 'page') {
          const cleanPage = {
            id: data.id,
            title: data.title,
            icon: data.icon,
            cover: data.cover,
            url: data.url,
            created_time: data.created_time,
            last_edited_time: data.last_edited_time,
            archived: data.archived,
            properties: data.properties || {},
            parent: data.parent
          };
          
          // Vérifier s'il y a des propriétés suspectes
          const allKeys = Object.keys(data);
          const suspiciousKeys = allKeys.filter(key => 
            key.startsWith('_') || 
            key === 'pvs' || 
            key === 'object' ||
            key === 'type' && typeof data[key] === 'string' && data[key].length === 2
          );
          
          if (suspiciousKeys.length > 0) {
            console.warn(`⚠️ Propriétés suspectes trouvées lors du chargement de la page ${data.id}:`, suspiciousKeys);
            console.warn('Page originale:', JSON.stringify(data, null, 2));
            console.warn('Page nettoyée:', JSON.stringify(cleanPage, null, 2));
          }
          
          this.memoryCache.set(row.id, { ...cleanPage, type: 'page' });
        } else {
          this.memoryCache.set(row.id, data);
        }
      });
      
      console.log(`✅ Loaded ${pages.length} pages from cache (nettoyées des propriétés système cachées)`);
    } catch (error) {
      console.error('Cache load error:', error);
    }
  }

  // Pages
  getPages() {
    const pages = [];
    for (const [id, data] of this.memoryCache.entries()) {
      if (data.type === 'page') {
        pages.push(data);
      }
    }
    return pages;
  }

  setPages(pages) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pages (id, data, hash, last_updated)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((pages) => {
      pages.forEach(page => {
        // S'assurer que seules les propriétés nécessaires sont stockées
        const cleanPage = {
          id: page.id,
          title: page.title,
          icon: page.icon,
          cover: page.cover,
          url: page.url,
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          archived: page.archived,
          properties: page.properties,
          parent: page.parent
        };
        
        const hash = this.calculateHash(cleanPage);
        this.memoryCache.set(page.id, { ...cleanPage, type: 'page' });
        stmt.run(page.id, JSON.stringify(cleanPage), hash, Date.now());
      });
    });

    transaction(pages);
  }

  getPage(pageId) {
    return this.memoryCache.get(pageId);
  }

  // Détecter les changements
  detectChanges(newPages) {
    const currentPages = this.getPages();
    const currentMap = new Map(currentPages.map(p => [p.id, p]));
    const newMap = new Map(newPages.map(p => [p.id, p]));

    const changes = {
      added: [],
      modified: [],
      removed: [],
      hasChanges: false,
      total: 0
    };

    // Pages ajoutées ou modifiées
    newPages.forEach(newPage => {
      const currentPage = currentMap.get(newPage.id);
      
      if (!currentPage) {
        changes.added.push(newPage);
      } else {
        const currentHash = this.calculateHash(currentPage);
        const newHash = this.calculateHash(newPage);
        
        if (currentHash !== newHash) {
          changes.modified.push(newPage);
        }
      }
    });

    // Pages supprimées
    currentPages.forEach(currentPage => {
      if (!newMap.has(currentPage.id)) {
        changes.removed.push(currentPage);
      }
    });

    changes.total = changes.added.length + changes.modified.length + changes.removed.length;
    changes.hasChanges = changes.total > 0;

    return changes;
  }

  // Calculer un hash pour détecter les changements
  calculateHash(data) {
    const content = JSON.stringify({
      title: data.title,
      last_edited_time: data.last_edited_time,
      archived: data.archived
    });
    
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  // Forcer le nettoyage complet du cache
  forceCleanCache() {
    try {
      console.log('🧹 FORÇAGE du nettoyage complet du cache...');
      
      // Vider complètement le cache
      this.memoryCache.clear();
      this.db.exec('DELETE FROM pages');
      this.db.exec('DELETE FROM metadata');
      
      console.log('✅ Cache complètement vidé');
    } catch (error) {
      console.error('❌ Erreur nettoyage forcé du cache:', error);
    }
  }

  // Nettoyer le cache des propriétés système cachées
  cleanCache() {
    try {
      console.log('🧹 Début du nettoyage du cache...');
      const pages = this.getPages();
      console.log(`📄 Pages trouvées dans le cache: ${pages.length}`);
      
      const cleanPages = pages.map(page => {
        // S'assurer que seules les propriétés nécessaires sont conservées
        const cleanPage = {
          id: page.id,
          title: page.title,
          icon: page.icon,
          cover: page.cover,
          url: page.url,
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          archived: page.archived,
          properties: page.properties,
          parent: page.parent
        };
        
        // Vérifier s'il y a des propriétés suspectes
        const allKeys = Object.keys(page);
        const suspiciousKeys = allKeys.filter(key => 
          key.startsWith('_') || 
          key === 'pvs' || 
          key === 'object' ||
          key === 'type' && typeof page[key] === 'string' && page[key].length === 2
        );
        
        if (suspiciousKeys.length > 0) {
          console.warn(`⚠️ Propriétés suspectes trouvées dans la page ${page.id}:`, suspiciousKeys);
          console.warn('Page originale:', JSON.stringify(page, null, 2));
          console.warn('Page nettoyée:', JSON.stringify(cleanPage, null, 2));
        }
        
        return cleanPage;
      });
      
      // Vider le cache et le remplir avec des pages propres
      this.memoryCache.clear();
      this.db.exec('DELETE FROM pages');
      this.setPages(cleanPages);
      
      console.log(`✅ Cache nettoyé: ${cleanPages.length} pages nettoyées`);
    } catch (error) {
      console.error('❌ Erreur nettoyage cache:', error);
    }
  }

  // Général
  get(key) {
    return this.memoryCache.get(key);
  }

  set(key, value) {
    this.memoryCache.set(key, value);
    
    // Persister si c'est une donnée importante
    if (key.startsWith('page:') || key.startsWith('config:')) {
      this.persist(key, value);
    }
  }

  persist(key, value) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO metadata (key, value)
        VALUES (?, ?)
      `);
      stmt.run(key, JSON.stringify(value));
    } catch (error) {
      console.error('Cache persist error:', error);
    }
  }

  clear() {
    this.memoryCache.clear();
    this.db.exec('DELETE FROM pages');
    this.db.exec('DELETE FROM metadata');
  }

  // Stats
  getStats() {
    return {
      size: this.memoryCache.size,
      maxSize: this.memoryCache.max
    };
  }

  getRecentPages(limit = 10) {
    const pages = this.getPages();
    // Trier par date de modification
    return pages
      .sort((a, b) => {
        const dateA = new Date(a.last_edited_time || 0);
        const dateB = new Date(b.last_edited_time || 0);
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  updatePage(pageData) {
    if (!pageData.id) return false;
    // Mettre à jour en mémoire
    this.memoryCache.set(pageData.id, {
      ...pageData,
      type: 'page'
    });
    // Persister
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pages (id, data, hash, last_updated)
      VALUES (?, ?, ?, ?)
    `);
    const hash = this.calculateHash(pageData);
    stmt.run(pageData.id, JSON.stringify(pageData), hash, Date.now());
    return true;
  }

  searchPages(query) {
    if (!query) return [];
    const queryLower = query.toLowerCase();
    const pages = this.getPages();
    return pages.filter(page => {
      const title = (page.title || '').toLowerCase();
      return title.includes(queryLower);
    });
  }
}

module.exports = new CacheService();