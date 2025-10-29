const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');

/**
 * Service de gestion de queue et historique des envois
 * Gère les envois hors ligne et l'historique unifié
 */
class QueueService extends EventEmitter {
  constructor() {
    super();

    // Queue des envois en attente
    this.queue = [];

    // Historique complet (succès + en attente)
    this.history = [];

    // État du réseau
    this.isOnline = true;

    // Traitement en cours
    this.processing = false;

    // Chemin de stockage
    this.storagePath = null;

    // Stats
    this.stats = {
      total_queued: 0,
      total_sent: 0,
      total_failed: 0,
      retries: 0
    };
  }

  /**
   * Initialiser le service avec le chemin de stockage
   */
  async initialize() {
    try {
      this.storagePath = path.join(app.getPath('userData'), 'queue.json');
      await this.loadQueue();
      console.log('[QUEUE] ✅ Service initialisé');
    } catch (error) {
      console.error('[QUEUE] ❌ Erreur initialisation:', error);
    }
  }

  /**
   * Charger la queue depuis le disque
   */
  async loadQueue() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const parsed = JSON.parse(data);

      this.queue = parsed.queue || [];
      this.history = parsed.history || [];
      this.stats = parsed.stats || this.stats;

      console.log(`[QUEUE] 📥 Chargé: ${this.queue.length} en attente, ${this.history.length} dans l'historique`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[QUEUE] ❌ Erreur chargement:', error);
      }
    }
  }

  /**
   * Sauvegarder la queue sur le disque
   */
  async saveQueue() {
    try {
      const data = {
        queue: this.queue,
        history: this.history,
        stats: this.stats,
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[QUEUE] ❌ Erreur sauvegarde:', error);
    }
  }

  /**
   * Ajouter un envoi à la queue
   * @param {Object} item - L'envoi à mettre en queue
   * @param {string} item.pageId - ID de la page de destination
   * @param {string} item.content - Contenu à envoyer
   * @param {Object} item.options - Options d'envoi
   * @returns {string} - ID de l'envoi
   */
  async add(item) {
    const queueItem = {
      id: this.generateId(),
      ...item,
      status: this.isOnline ? 'pending' : 'queued',
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null
    };

    // Ajouter à la queue
    this.queue.push(queueItem);

    // Ajouter à l'historique avec le statut "en attente"
    const historyItem = {
      ...queueItem,
      type: 'send',
      timestamp: new Date().toISOString()
    };
    this.history.unshift(historyItem);

    // Limiter l'historique à 1000 entrées
    if (this.history.length > 1000) {
      this.history = this.history.slice(0, 1000);
    }

    this.stats.total_queued++;
    await this.saveQueue();

    console.log(`[QUEUE] ➕ Ajouté à la queue: ${queueItem.id}`);
    this.emit('item-added', queueItem);

    // Traiter immédiatement si en ligne
    if (this.isOnline && !this.processing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Générer un ID unique
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mettre à jour le statut réseau
   * @param {boolean} online - État de la connexion
   */
  setOnlineStatus(online) {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    console.log(`[QUEUE] 🌐 Statut réseau changé: ${online ? 'ONLINE' : 'OFFLINE'}`);

    if (online && wasOffline && this.queue.length > 0) {
      console.log(`[QUEUE] 🚀 Retour en ligne, traitement de ${this.queue.length} élément(s)`);
      this.processQueue();
    }
  }

  /**
   * Traiter la queue
   */
  async processQueue() {
    if (this.processing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`[QUEUE] 🔄 Traitement de la queue (${this.queue.length} élément(s))`);

    while (this.queue.length > 0 && this.isOnline) {
      const item = this.queue[0];

      try {
        console.log(`[QUEUE] 📤 Envoi de ${item.id}...`);

        // Importer le service Notion pour l'envoi
        const notionService = require('./notion.service');

        const result = await notionService.sendToNotion({
          pageId: item.pageId,
          content: item.content,
          options: item.options
        });

        if (result.success) {
          // Succès : retirer de la queue
          this.queue.shift();

          // Mettre à jour l'historique
          const historyIndex = this.history.findIndex(h => h.id === item.id);
          if (historyIndex !== -1) {
            this.history[historyIndex].status = 'success';
            this.history[historyIndex].completedAt = new Date().toISOString();
          }

          this.stats.total_sent++;
          console.log(`[QUEUE] ✅ Envoyé: ${item.id}`);
          this.emit('item-sent', item);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error(`[QUEUE] ❌ Échec envoi ${item.id}:`, error.message);

        item.attempts++;
        item.lastError = error.message;
        this.stats.retries++;

        // Retirer après 3 tentatives
        if (item.attempts >= 3) {
          console.log(`[QUEUE] 🗑️ Abandon après 3 tentatives: ${item.id}`);
          this.queue.shift();

          // Mettre à jour l'historique
          const historyIndex = this.history.findIndex(h => h.id === item.id);
          if (historyIndex !== -1) {
            this.history[historyIndex].status = 'failed';
            this.history[historyIndex].failedAt = new Date().toISOString();
            this.history[historyIndex].error = error.message;
          }

          this.stats.total_failed++;
          this.emit('item-failed', item);
        } else {
          // Remettre en fin de queue pour réessayer plus tard
          this.queue.shift();
          this.queue.push(item);
          console.log(`[QUEUE] 🔄 Remis en queue (tentative ${item.attempts}/3): ${item.id}`);
        }

        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await this.saveQueue();
    }

    this.processing = false;
    console.log('[QUEUE] ✅ Traitement terminé');
    this.emit('queue-processed');
  }

  /**
   * Obtenir l'historique complet
   * @param {number} limit - Nombre max d'éléments
   * @returns {Array} - Historique trié par date
   */
  getHistory(limit = 50) {
    return this.history.slice(0, limit);
  }

  /**
   * Obtenir les éléments en attente
   * @returns {Array} - Queue actuelle
   */
  getQueue() {
    return [...this.queue];
  }

  /**
   * Obtenir les statistiques
   * @returns {Object} - Stats de la queue
   */
  getStats() {
    return {
      ...this.stats,
      queue_length: this.queue.length,
      history_length: this.history.length,
      is_online: this.isOnline,
      is_processing: this.processing
    };
  }

  /**
   * Vider la queue (sans supprimer l'historique)
   */
  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    console.log('[QUEUE] 🗑️ Queue vidée');
    this.emit('queue-cleared');
  }

  /**
   * Vider l'historique
   */
  async clearHistory() {
    this.history = [];
    await this.saveQueue();
    console.log('[QUEUE] 🗑️ Historique vidé');
    this.emit('history-cleared');
  }

  /**
   * Réessayer tous les envois en échec
   */
  async retryFailed() {
    const failedItems = this.history.filter(h => h.status === 'failed');

    for (const item of failedItems) {
      // Réinitialiser et remettre en queue
      const newItem = {
        ...item,
        id: this.generateId(),
        status: 'pending',
        attempts: 0,
        lastError: null
      };

      this.queue.push(newItem);

      // Mettre à jour l'historique
      const historyIndex = this.history.findIndex(h => h.id === item.id);
      if (historyIndex !== -1) {
        this.history[historyIndex].status = 'retrying';
      }
    }

    await this.saveQueue();
    console.log(`[QUEUE] 🔄 ${failedItems.length} envoi(s) remis en queue`);

    if (this.isOnline) {
      this.processQueue();
    }
  }
}

module.exports = new QueueService();
