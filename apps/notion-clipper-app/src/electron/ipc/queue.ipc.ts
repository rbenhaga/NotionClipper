// apps/notion-clipper-app/src/electron/ipc/queue.ipc.ts
import { ipcMain } from 'electron';

/**
 * Queue IPC Handlers
 * 
 * Uses ElectronQueueService for persistent storage instead of in-memory array.
 * This ensures queue survives app restarts and provides proper offline support.
 */

// 🔧 FIX: Use getter FUNCTION instead of destructuring
// Destructuring `const { newQueueService } = require(...)` captures value at require time,
// which stays null even after reinitialization. The getter function is called each time.
function getQueueService() {
  const { getNewQueueService } = require('../main');
  return getNewQueueService();
}

// 🔧 FIX: Throttle "not initialized" warning to avoid log spam
// The frontend polls queue:getAll frequently, so we only log once per 30 seconds
let lastNotInitializedWarning = 0;
const NOT_INITIALIZED_THROTTLE_MS = 30000;

function logNotInitializedOnce() {
  const now = Date.now();
  if (now - lastNotInitializedWarning > NOT_INITIALIZED_THROTTLE_MS) {
    console.warn('[QUEUE] Queue service not initialized, returning empty (this warning is throttled)');
    lastNotInitializedWarning = now;
  }
}

export function setupQueueIPC() {
  // Obtenir toute la queue
  ipcMain.handle('queue:getAll', async () => {
    try {
      const queueService = getQueueService();
      if (!queueService) {
        logNotInitializedOnce();
        return { success: true, data: [] };
      }
      
      const queue = await queueService.getQueue();
      return {
        success: true,
        data: queue.sort((a: any, b: any) => b.createdAt - a.createdAt)
      };
    } catch (error: any) {
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
      const queueService = getQueueService();
      if (!queueService) {
        return { success: true, data: { queued: 0, processing: 0, failed: 0, total: 0 } };
      }
      
      const stats = await queueService.getStats();
      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      console.error('Error getting queue stats:', error);
      return {
        success: false,
        error: error.message,
        data: { queued: 0, processing: 0, failed: 0, total: 0 }
      };
    }
  });

  // Ajouter un élément à la queue
  ipcMain.handle('queue:add', async (_event, item) => {
    try {
      const queueService = getQueueService();
      if (!queueService) {
        throw new Error('Queue service not initialized');
      }
      
      const entry = await queueService.enqueue({
        pageId: item.pageId,
        content: item.content,
        options: item.options,
        // Store pre-parsed blocks if available for faster retry
        parsedBlocks: item.parsedBlocks,
        sectionId: item.sectionId,
        sectionTitle: item.sectionTitle,
      }, item.priority || 'normal');
      
      console.log(`[QUEUE] ✅ Added item to queue: ${entry.id}`);
      
      return {
        success: true,
        data: entry
      };
    } catch (error: any) {
      console.error('Error adding to queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Réessayer un élément
  ipcMain.handle('queue:retry', async (_event, id) => {
    try {
      const queueService = getQueueService();
      if (!queueService) {
        throw new Error('Queue service not initialized');
      }
      
      await queueService.retry(id);
      console.log(`[QUEUE] 🔄 Retrying item: ${id}`);
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error retrying queue item:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Supprimer un élément
  ipcMain.handle('queue:remove', async (_event, id) => {
    try {
      const queueService = getQueueService();
      if (!queueService) {
        throw new Error('Queue service not initialized');
      }
      
      const removed = await queueService.removeEntry(id);
      
      if (!removed) {
        return {
          success: false,
          error: 'Item not found'
        };
      }
      
      console.log(`[QUEUE] 🗑️ Removed item: ${id}`);
      
      return {
        success: true
      };
    } catch (error: any) {
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
      const queueService = getQueueService();
      if (!queueService) {
        return { success: true };
      }
      
      await queueService.clear();
      console.log('[QUEUE] 🧹 Queue cleared');
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error clearing queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 🆕 Mettre à jour le statut réseau du queue service
  ipcMain.handle('queue:setOnlineStatus', async (_event, isOnline: boolean) => {
    try {
      // 🔧 FIX: Use the helper function (consistent with other handlers)
      const queueService = getQueueService();
      if (!queueService) {
        throw new Error('Queue service not initialized');
      }

      console.log(`[QUEUE] 🌐 Network status changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

      queueService.setOnlineStatus(isOnline);

      // Si on est maintenant en ligne, déclencher le traitement
      if (isOnline) {
        console.log('[QUEUE] 🚀 Back online, triggering queue processing...');
        queueService.processQueue();
      }

      return { success: true };
    } catch (error: any) {
      console.error('[QUEUE] ❌ Error setting online status:', error);
      return { success: false, error: error.message };
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