const EventEmitter = require('events');

class ElectronPollingAdapter extends EventEmitter {
  constructor(notionService, cacheService) {
    super();
    this.notionService = notionService;
    this.cacheService = cacheService;
    this.interval = null;
    this.isRunning = false;
    this.pollingInterval = 30000; // 30 secondes par défaut
  }

  // Démarrer le polling
  start(intervalMs = 30000) {
    if (this.isRunning) {
      console.log('[POLLING] Already running');
      return;
    }

    this.pollingInterval = intervalMs;
    this.isRunning = true;

    console.log(`[POLLING] Starting with interval: ${intervalMs}ms`);

    // Premier fetch immédiat
    this.poll();

    // Puis polling périodique
    this.interval = setInterval(() => {
      this.poll();
    }, intervalMs);
  }

  // Arrêter le polling
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('[POLLING] Stopped');
  }

  // Effectuer un poll
  async poll() {
    if (!this.notionService || !this.cacheService) {
      console.warn('[POLLING] Services not initialized');
      return;
    }

    try {
      console.log('[POLLING] Fetching pages...');
      
      // TODO: Utiliser notionService pour récupérer les pages
      // const pages = await this.notionService.searchPages();
      
      // Pour l'instant, émettre juste un événement
      this.emit('poll-start');
      
      // Simuler la récupération
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.emit('poll-complete', { 
        success: true, 
        message: 'Polling not fully implemented yet'
      });
      
    } catch (error) {
      console.error('[POLLING] Error:', error);
      this.emit('poll-error', error);
    }
  }

  // Forcer un refresh
  async forceRefresh() {
    console.log('[POLLING] Force refresh');
    await this.poll();
  }

  // Changer l'intervalle
  setInterval(intervalMs) {
    this.pollingInterval = intervalMs;
    
    if (this.isRunning) {
      this.stop();
      this.start(intervalMs);
    }
  }

  // Status
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.pollingInterval
    };
  }
}

module.exports = ElectronPollingAdapter;