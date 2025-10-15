const { ipcMain } = require('electron');

function registerQueueHandlers() {
  // Ajouter à la queue
  ipcMain.handle('queue:add', async (event, item) => {
    try {
      const { newQueueService } = require('../main');
      if (!newQueueService) {
        throw new Error('Queue service not initialized');
      }
      const result = await newQueueService.enqueue(item, 'normal');
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Récupérer la queue
  ipcMain.handle('queue:getAll', async () => {
    try {
      const { newQueueService } = require('../main');
      if (!newQueueService) {
        throw new Error('Queue service not initialized');
      }
      const items = await newQueueService.getQueue();
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Récupérer les statistiques
  ipcMain.handle('queue:getStats', async () => {
    try {
      const { newQueueService } = require('../main');
      if (!newQueueService) {
        throw new Error('Queue service not initialized');
      }
      const stats = await newQueueService.getStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Retry un item
  ipcMain.handle('queue:retry', async (event, id) => {
    try {
      const { newQueueService } = require('../main');
      if (!newQueueService) {
        throw new Error('Queue service not initialized');
      }
      await newQueueService.retry(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Supprimer un item
  ipcMain.handle('queue:remove', async (event, id) => {
    try {
      const { newQueueService } = require('../main');
      if (!newQueueService) {
        throw new Error('Queue service not initialized');
      }
      const result = await newQueueService.removeEntry(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Vider la queue
  ipcMain.handle('queue:clear', async () => {
    try {
      const { newQueueService } = require('../main');
      if (!newQueueService) {
        throw new Error('Queue service not initialized');
      }
      await newQueueService.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Démarrer le traitement
  ipcMain.handle('queue:start', async () => {
    try {
      const { newQueueService } = require('../main');
      if (!newQueueService) {
        throw new Error('Queue service not initialized');
      }
      newQueueService.startAutoProcess();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Arrêter le traitement
  ipcMain.handle('queue:stop', async () => {
    try {
      const { newQueueService } = require('../main');
      if (!newQueueService) {
        throw new Error('Queue service not initialized');
      }
      newQueueService.stopAutoProcess();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Statut réseau
  ipcMain.handle('queue:networkStatus', async () => {
    try {
      // Utiliser navigator.onLine côté client ou une vérification réseau simple
      const isOnline = true; // Pour l'instant, toujours en ligne
      return { success: true, data: isOnline };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerQueueHandlers };