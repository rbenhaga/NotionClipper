const { ipcMain } = require('electron');

function registerStatsIPC() {
  console.log('[STATS] Registering stats IPC handlers...');

  ipcMain.handle('stats:get', async () => {
    try {
      const { newStatsService } = require('../main');
      
      if (!newStatsService) {
        throw new Error('StatsService not initialized');
      }

      const stats = await newStatsService.getAll();
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('[ERROR] Error getting stats:', error);
      return {
        success: false,
        error: error.message,
        stats: {}
      };
    }
  });

  ipcMain.handle('stats:get-summary', async () => {
    try {
      const { newStatsService } = require('../main');
      
      if (!newStatsService) {
        throw new Error('StatsService not initialized');
      }

      const summary = await newStatsService.getSummary();
      
      return {
        success: true,
        summary
      };
    } catch (error) {
      console.error('[ERROR] Error getting summary:', error);
      return {
        success: false,
        error: error.message,
        summary: {}
      };
    }
  });

  ipcMain.handle('stats:increment-clips', async () => {
    try {
      const { newStatsService } = require('../main');
      
      if (!newStatsService) {
        throw new Error('StatsService not initialized');
      }

      const count = await newStatsService.incrementClips();
      
      return {
        success: true,
        count
      };
    } catch (error) {
      console.error('[ERROR] Error incrementing clips:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('stats:reset', async () => {
    try {
      const { newStatsService } = require('../main');
      
      if (!newStatsService) {
        throw new Error('StatsService not initialized');
      }

      await newStatsService.reset();
      
      return {
        success: true
      };
    } catch (error) {
      console.error('[ERROR] Error resetting stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('stats:panel', async () => {
    try {
      const { newStatsService } = require('../main');
      
      if (!newStatsService) {
        throw new Error('StatsService not initialized');
      }

      const summary = await newStatsService.getSummary();
      
      return {
        success: true,
        data: summary
      };
    } catch (error) {
      console.error('[ERROR] Error getting panel stats:', error);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  });

  console.log('[OK] Stats IPC handlers registered');
}

module.exports = registerStatsIPC;