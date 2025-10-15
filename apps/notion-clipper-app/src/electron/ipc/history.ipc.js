// apps/notion-clipper-app/src/electron/ipc/history.ipc.js
const { ipcMain } = require('electron');

function registerHistoryIPC() {
  console.log('[HISTORY] Registering history IPC handlers...');

  /**
   * Get history entries
   */
  ipcMain.handle('history:get', async (event, filter) => {
    try {
      const { getHistoryService } = require('../main');
      const historyService = getHistoryService();

      if (!historyService) {
        return {
          success: false,
          error: 'History service not initialized'
        };
      }

      const history = filter 
        ? await historyService.getFiltered(filter)
        : await historyService.getAll();

      return {
        success: true,
        history
      };
    } catch (error) {
      console.error('[HISTORY] Error getting history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Get history statistics
   */
  ipcMain.handle('history:get-stats', async () => {
    try {
      const { getHistoryService } = require('../main');
      const historyService = getHistoryService();

      if (!historyService) {
        return {
          success: false,
          error: 'History service not initialized'
        };
      }

      const stats = await historyService.getStats();

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('[HISTORY] Error getting stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Add entry to history
   */
  ipcMain.handle('history:add', async (event, entry) => {
    try {
      const { getHistoryService } = require('../main');
      const historyService = getHistoryService();

      if (!historyService) {
        return {
          success: false,
          error: 'History service not initialized'
        };
      }

      const newEntry = await historyService.add(entry);

      return {
        success: true,
        entry: newEntry
      };
    } catch (error) {
      console.error('[HISTORY] Error adding entry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Update history entry
   */
  ipcMain.handle('history:update', async (event, id, updates) => {
    try {
      const { getHistoryService } = require('../main');
      const historyService = getHistoryService();

      if (!historyService) {
        return {
          success: false,
          error: 'History service not initialized'
        };
      }

      const updatedEntry = await historyService.update(id, updates);

      return {
        success: true,
        entry: updatedEntry
      };
    } catch (error) {
      console.error('[HISTORY] Error updating entry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Delete history entry
   */
  ipcMain.handle('history:delete', async (event, id) => {
    try {
      const { getHistoryService } = require('../main');
      const historyService = getHistoryService();

      if (!historyService) {
        return {
          success: false,
          error: 'History service not initialized'
        };
      }

      const deleted = await historyService.delete(id);

      return {
        success: true,
        deleted
      };
    } catch (error) {
      console.error('[HISTORY] Error deleting entry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Clear all history
   */
  ipcMain.handle('history:clear', async () => {
    try {
      const { getHistoryService } = require('../main');
      const historyService = getHistoryService();

      if (!historyService) {
        return {
          success: false,
          error: 'History service not initialized'
        };
      }

      await historyService.clear();

      return {
        success: true
      };
    } catch (error) {
      console.error('[HISTORY] Error clearing history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Retry history entry
   */
  ipcMain.handle('history:retry', async (event, id) => {
    try {
      const { getHistoryService, getNotionService } = require('../main');
      const historyService = getHistoryService();
      const notionService = getNotionService();

      if (!historyService || !notionService) {
        return {
          success: false,
          error: 'Services not initialized'
        };
      }

      // Get the history entry
      const history = await historyService.getAll();
      const entry = history.find(e => e.id === id);

      if (!entry) {
        return {
          success: false,
          error: 'Entry not found'
        };
      }

      // Update status to sending
      await historyService.update(id, { status: 'sending' });

      try {
        // Retry the operation
        const result = await notionService.sendToNotion({
          pageId: entry.page.id,
          content: entry.content.raw,
          options: {}
        });

        if (result.success) {
          await historyService.update(id, {
            status: 'success',
            sentAt: Date.now(),
            error: undefined
          });
        } else {
          throw new Error(result.error);
        }

        return {
          success: true
        };
      } catch (error) {
        await historyService.update(id, {
          status: 'failed',
          error: error.message
        });

        return {
          success: false,
          error: error.message
        };
      }
    } catch (error) {
      console.error('[HISTORY] Error retrying entry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Cleanup old entries
   */
  ipcMain.handle('history:cleanup', async (event, olderThanDays = 30) => {
    try {
      const { getHistoryService } = require('../main');
      const historyService = getHistoryService();

      if (!historyService) {
        return {
          success: false,
          error: 'History service not initialized'
        };
      }

      const removed = await historyService.cleanup(olderThanDays);

      return {
        success: true,
        removed
      };
    } catch (error) {
      console.error('[HISTORY] Error cleaning up:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[OK] History IPC handlers registered');
}

module.exports = registerHistoryIPC;