const { ipcMain } = require('electron');
const queueService = require('../services/queue.service');

function registerQueueIPC() {
  // Obtenir l'historique unifié (queue + historique)
  ipcMain.handle('queue:get-history', async (event, limit = 50) => {
    try {
      const history = queueService.getHistory(limit);
      return { success: true, history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtenir la queue actuelle
  ipcMain.handle('queue:get-queue', async () => {
    try {
      const queue = queueService.getQueue();
      return { success: true, queue };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtenir les stats
  ipcMain.handle('queue:get-stats', async () => {
    try {
      const stats = queueService.getStats();
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Vider la queue
  ipcMain.handle('queue:clear-queue', async () => {
    try {
      await queueService.clearQueue();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Vider l'historique
  ipcMain.handle('queue:clear-history', async () => {
    try {
      await queueService.clearHistory();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Réessayer les envois en échec
  ipcMain.handle('queue:retry-failed', async () => {
    try {
      await queueService.retryFailed();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Événements de la queue
  queueService.on('item-added', (item) => {
    event.sender.send('queue:item-added', item);
  });

  queueService.on('item-sent', (item) => {
    event.sender.send('queue:item-sent', item);
  });

  queueService.on('item-failed', (item) => {
    event.sender.send('queue:item-failed', item);
  });

  queueService.on('queue-processed', () => {
    event.sender.send('queue:processed');
  });
}

module.exports = registerQueueIPC;
