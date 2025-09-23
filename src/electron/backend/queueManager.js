const fs = require('fs').promises;
const path = require('path');

class QueueManager {
  constructor(dataDir) {
    this.queueFile = path.join(dataDir, 'offline_queue.json');
    this.queue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    this.loadQueue();
  }

  async loadQueue() {
    try {
      const data = await fs.readFile(this.queueFile, 'utf8');
      this.queue = JSON.parse(data);
    } catch (error) {
      this.queue = [];
    }
  }

  async saveQueue() {
    try {
      await fs.writeFile(this.queueFile, JSON.stringify(this.queue, null, 2));
    } catch (error) {
      console.error('Erreur sauvegarde queue:', error);
    }
  }

  async addToQueue(action) {
    const item = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action: action,
      retries: 0,
      status: 'pending'
    };
    this.queue.push(item);
    await this.saveQueue();
    return item.id;
  }

  async processQueue(backend) {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const pendingItems = this.queue.filter(item => item.status === 'pending' && item.retries < this.maxRetries);
    for (const item of pendingItems) {
      try {
        if (item.action.type === 'sendToNotion') {
          await backend.sendToNotion(item.action.pageId, item.action.content, item.action.contentType);
          item.status = 'completed';
          console.log(`✅ File d'attente: item ${item.id} traité`);
        }
      } catch (error) {
        item.retries++;
        item.lastError = error.message;
        if (item.retries >= this.maxRetries) {
          item.status = 'failed';
          console.error(`❌ File d'attente: item ${item.id} échoué après ${this.maxRetries} tentatives`);
        }
      }
    }
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.queue = this.queue.filter(item => {
      if (item.status === 'completed') {
        const itemTime = new Date(item.timestamp).getTime();
        return itemTime > oneDayAgo;
      }
      return true;
    });
    await this.saveQueue();
    this.isProcessing = false;
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      completed: this.queue.filter(i => i.status === 'completed').length,
      failed: this.queue.filter(i => i.status === 'failed').length
    };
  }

  clearCompleted() {
    this.queue = this.queue.filter(i => i.status !== 'completed');
    this.saveQueue();
  }
}

module.exports = QueueManager;


