// apps/notion-clipper-app/src/electron/ipc/queue.ipc.js
const { ipcMain } = require('electron');

function registerQueueIPC() {
  console.log('[QUEUE] Registering queue IPC handlers...');

  /**
   * Get queue entries
   */
  ipcMain.handle('queue:get', async () => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      const queue = await queueService.getQueue();

      return {
        success: true,
        queue
      };
    } catch (error) {
      console.error('[QUEUE] Error getting queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Get queue statistics
   */
  ipcMain.handle('queue:get-stats', async () => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      const stats = await queueService.getStats();

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('[QUEUE] Error getting stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Add item to queue
   */
  ipcMain.handle('queue:enqueue', async (event, payload, priority = 'normal') => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      const entry = await queueService.enqueue(payload, priority);

      return {
        success: true,
        entry
      };
    } catch (error) {
      console.error('[QUEUE] Error enqueuing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Retry queue entry
   */
  ipcMain.handle('queue:retry', async (event, id) => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      await queueService.retry(id);

      return {
        success: true
      };
    } catch (error) {
      console.error('[QUEUE] Error retrying:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Remove queue entry
   */
  ipcMain.handle('queue:remove', async (event, id) => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      const removed = await queueService.removeEntry(id);

      return {
        success: true,
        removed
      };
    } catch (error) {
      console.error('[QUEUE] Error removing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Clear queue
   */
  ipcMain.handle('queue:clear', async () => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      await queueService.clear();

      return {
        success: true
      };
    } catch (error) {
      console.error('[QUEUE] Error clearing queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Set online status
   */
  ipcMain.handle('queue:set-online-status', async (event, isOnline) => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      queueService.setOnlineStatus(isOnline);

      return {
        success: true
      };
    } catch (error) {
      console.error('[QUEUE] Error setting online status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Start auto processing
   */
  ipcMain.handle('queue:start-auto-process', async () => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      queueService.startAutoProcess();

      return {
        success: true
      };
    } catch (error) {
      console.error('[QUEUE] Error starting auto process:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Stop auto processing
   */
  ipcMain.handle('queue:stop-auto-process', async () => {
    try {
      const { getQueueService } = require('../main');
      const queueService = getQueueService();

      if (!queueService) {
        return {
          success: false,
          error: 'Queue service not initialized'
        };
      }

      queueService.stopAutoProcess();

      return {
        success: true
      };
    } catch (error) {
      console.error('[QUEUE] Error stopping auto process:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[OK] Queue IPC handlers registered');
}

module.exports = registerQueueIPC;