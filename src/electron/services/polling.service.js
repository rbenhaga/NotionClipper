const EventEmitter = require('events');
const crypto = require('crypto');

class PollingService extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.thread = null;
    
    // Configuration avec backoff adaptatif
    this.baseInterval = 30000; // 30 secondes
    this.checkInterval = this.baseInterval;
    this.syncInterval = 300000; // 5 minutes pour sync complète
    this.lastSync = 0;
    this.failureCount = 0;
    
    // Cache des checksums pour détecter les changements
    this.pageChecksums = new Map();
    
    // Statistiques du polling
    this.stats = {
      checks_performed: 0,
      changes_detected: 0,
      syncs_completed: 0,
      errors: 0
    };
    
    // Services
    this.notionService = null;
    this.cacheService = null;
    this.statsService = null;
  }

  // Initialiser avec les services
  initialize(notionService, cacheService, statsService) {
    this.notionService = notionService;
    this.cacheService = cacheService;
    this.statsService = statsService;
  }

  // Démarrer le polling
  start() {
    if (!this.running && this.notionService && this.notionService.initialized) {
      this.running = true;
      this._pollLoop();
      console.log('📡 Polling démarré');
    }
  }

  // Arrêter le polling
  stop() {
    if (this.running) {
      this.running = false;
      if (this.pollTimeout) {
        clearTimeout(this.pollTimeout);
        this.pollTimeout = null;
      }
      console.log('⏹️ Polling arrêté');
    }
  }

  // Boucle principale de polling avec backoff
  async _pollLoop() {
    const tick = async () => {
      if (!this.running) return;
      
      try {
        const currentTime = Date.now();
        
        // Vérification rapide des changements
        const hasChanges = await this._quickCheck();
        if (hasChanges) {
          await this._incrementalSync();
        }
        
        // Synchronisation complète périodique
        if (currentTime - this.lastSync > this.syncInterval) {
          await this._fullSync();
          this.lastSync = currentTime;
        }
        
        // Incrémenter les stats
        this.stats.checks_performed++;
        this.statsService.increment('polling_checks');
        
        // Reset backoff on success
        if (this.failureCount > 0) {
          this.failureCount = 0;
          this._adjustInterval();
        }
      } catch (error) {
        console.error('❌ Erreur polling:', error);
        this.stats.errors++;
        this.statsService.recordError(error, 'polling');
        
        // Augmenter le backoff
        this.failureCount++;
        this._adjustInterval();
      } finally {
        if (this.running) {
          this.pollTimeout = setTimeout(tick, this.checkInterval);
        }
      }
    };

    this.pollTimeout = setTimeout(tick, this.checkInterval);
  }

  // Vérification rapide (comme Python _quick_check)
  async _quickCheck() {
    if (!this.notionService.client) return false;
    
    try {
      // Récupérer la page la plus récemment modifiée
      const response = await this.notionService.client.search({
        filter: { property: 'object', value: 'page' },
        page_size: 1,
        sort: { timestamp: 'last_edited_time', direction: 'descending' }
      });
      
      if (response.results && response.results.length > 0) {
        // Formater la page immédiatement pour éviter la transmission de propriétés système cachées
        const formattedPage = this.notionService.formatPage(response.results[0]);
        const currentChecksum = this._calculateChecksum(formattedPage);
        const previousChecksum = this.pageChecksums.get('latest');
        
        if (currentChecksum !== previousChecksum) {
          console.log('Changement détecté:', currentChecksum);
          console.log('Ancien checksum:', previousChecksum);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.stats.errors++;
      return false;
    }
  }

  // Synchronisation incrémentale (comme Python)
  async _incrementalSync() {
    try {
      console.log('🔄 Synchronisation incrémentale...');
      
      // Récupérer les pages récemment modifiées
      const response = await this.notionService.client.search({
        filter: { property: 'object', value: 'page' },
        page_size: 20,
        sort: { timestamp: 'last_edited_time', direction: 'descending' }
      });
      
      if (response.results && response.results.length > 0) {
        const currentPages = this.cacheService.getPages();
        const pageMap = new Map(currentPages.map(p => [p.id, p]));
        
        let changesDetected = 0;
        
        for (const rawPage of response.results) {
          // Formater la page immédiatement pour éviter la transmission de propriétés système cachées
          const formattedPage = this.notionService.formatPage(rawPage);
          const pageId = formattedPage.id;
          const newChecksum = this._calculateChecksum(formattedPage);
          const oldChecksum = this.pageChecksums.get(pageId);
          
          if (newChecksum !== oldChecksum) {
            // Mettre à jour le cache
            pageMap.set(pageId, formattedPage);
            this.pageChecksums.set(pageId, newChecksum);
            changesDetected++;
          }
        }
        
        if (changesDetected > 0) {
          // Sauvegarder dans le cache
          const updatedPages = Array.from(pageMap.values());
          this.cacheService.setPages(updatedPages);
          
          this.stats.changes_detected += changesDetected;
          this.statsService.increment('changes_detected', changesDetected);
          
          // Émettre un événement
          this.emit('pages-changed', {
            type: 'incremental',
            changesCount: changesDetected
          });
          
          console.log(`✅ ${changesDetected} changement(s) détecté(s)`);
        }
      }
    } catch (error) {
      console.error('Erreur sync incrémentale:', error);
      throw error;
    }
  }

  // Synchronisation complète (comme Python)
  async _fullSync() {
    try {
      console.log('🔄 Synchronisation complète...');
      
      // Forcer la récupération de toutes les pages
      const pages = await this.notionService.fetchAllPages(false);
      
      // Recalculer tous les checksums
      this.pageChecksums.clear();
      for (const page of pages) {
        const checksum = this._calculateChecksum(page);
        this.pageChecksums.set(page.id, checksum);
      }
      
      // Checksum global
      if (pages.length > 0) {
        const latestChecksum = this._calculateChecksum(pages[0]);
        this.pageChecksums.set('latest', latestChecksum);
      }
      
      this.stats.syncs_completed++;
      this.statsService.increment('full_syncs');
      
      // Émettre un événement
      this.emit('pages-changed', {
        type: 'full',
        pagesCount: pages.length
      });
      
      console.log(`✅ Sync complète: ${pages.length} pages`);
    } catch (error) {
      console.error('Erreur sync complète:', error);
      throw error;
    }
  }

  // Calculer un checksum SHA-256 (comme Python)
  _calculateChecksum(page) {
    const content = JSON.stringify({
      id: page.id,
      last_edited_time: page.last_edited_time,
      properties: page.properties,
      archived: page.archived
    });
    
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  // Forcer une synchronisation
  forceSync() {
    return this._fullSync();
  }

  // Obtenir les statistiques
  getStats() {
    return {
      running: this.running,
      ...this.stats,
      lastSync: this.lastSync,
      checksumCount: this.pageChecksums.size
    };
  }

  _adjustInterval() {
    if (this.failureCount > 0) {
      this.checkInterval = Math.min(this.baseInterval * Math.pow(2, this.failureCount), 300000);
    } else {
      this.checkInterval = this.baseInterval;
    }
  }
}

module.exports = new PollingService();