// apps/notion-clipper-app/src/electron/ipc/queue.ipc.ts
import { ipcMain } from 'electron';

// Stockage temporaire en mémoire pour la queue
let queueData: any[] = [];
let queueStats = {
  queued: 0,
  processing: 0,
  failed: 0
};

export function setupQueueIPC() {
  // Obtenir toute la queue
  ipcMain.handle('queue:getAll', async () => {
    try {
      return {
        success: true,
        data: queueData.sort((a, b) => b.timestamp - a.timestamp)
      };
    } catch (error) {
      console.error('Error getting queue:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  });

  // Obtenir les statistiques
  ipcMain.handle('queue:getStats', async () => {
    try {
      // Recalculer les stats à partir des données
      const stats = {
        queued: queueData.filter(item => item.status === 'queued').length,
        processing: queueData.filter(item => item.status === 'processing').length,
        failed: queueData.filter(item => item.status === 'failed').length
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        success: false,
        error: error.message,
        data: queueStats
      };
    }
  });

  // Ajouter un élément à la queue
  ipcMain.handle('queue:add', async (event, item) => {
    try {
      const newItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        status: 'queued',
        ...item
      };
      
      queueData.unshift(newItem);
      
      return {
        success: true,
        data: newItem
      };
    } catch (error) {
      console.error('Error adding to queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Réessayer un élément
  ipcMain.handle('queue:retry', async (event, id) => {
    try {
      const item = queueData.find(q => q.id === id);
      if (!item) {
        return {
          success: false,
          error: 'Item not found'
        };
      }

      // Remettre en queue
      item.status = 'queued';
      item.retryCount = (item.retryCount || 0) + 1;
      item.lastRetry = Date.now();

      return {
        success: true,
        data: item
      };
    } catch (error) {
      console.error('Error retrying queue item:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Supprimer un élément
  ipcMain.handle('queue:remove', async (event, id) => {
    try {
      const index = queueData.findIndex(item => item.id === id);
      if (index === -1) {
        return {
          success: false,
          error: 'Item not found'
        };
      }

      queueData.splice(index, 1);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error removing queue item:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Vider la queue
  ipcMain.handle('queue:clear', async () => {
    try {
      queueData = [];

      return {
        success: true
      };
    } catch (error) {
      console.error('Error clearing queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Démarrer le traitement automatique
  ipcMain.handle('queue:start', async () => {
    try {
      // Simuler le démarrage du traitement
      console.log('Queue processing started');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error starting queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Arrêter le traitement automatique
  ipcMain.handle('queue:stop', async () => {
    try {
      // Simuler l'arrêt du traitement
      console.log('Queue processing stopped');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error stopping queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Vérifier le statut réseau
  ipcMain.handle('queue:networkStatus', async () => {
    try {
      // Simuler la vérification réseau
      return {
        success: true,
        data: {
          isOnline: true,
          lastCheck: Date.now()
        }
      };
    } catch (error) {
      console.error('Error checking network status:', error);
      return {
        success: false,
        error: error.message,
        data: {
          isOnline: false,
          lastCheck: Date.now()
        }
      };
    }
  });

  console.log('✅ Queue IPC handlers registered');
}