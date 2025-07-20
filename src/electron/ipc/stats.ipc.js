const { ipcMain } = require('electron');
const statsService = require('../services/stats.service');

function registerStatsIPC() {
  // Obtenir toutes les stats
  ipcMain.handle('stats:get', async () => {
    try {
      const stats = statsService.getAllStats();
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtenir un résumé
  ipcMain.handle('stats:get-summary', async () => {
    try {
      const summary = statsService.getSummary();
      return { success: true, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtenir les stats horaires
  ipcMain.handle('stats:get-hourly', async (event, hours = 24) => {
    try {
      const data = statsService.getHourlyData(hours);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Reset stats
  ipcMain.handle('stats:reset', async () => {
    try {
      statsService.reset();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Exporter
  ipcMain.handle('stats:export', async () => {
    try {
      const data = statsService.exportStats();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Importer
  ipcMain.handle('stats:import', async (event, data) => {
    try {
      statsService.importStats(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Écouter les mises à jour
  statsService.on('stat-updated', (data) => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('stats:updated', data);
    });
  });
}

module.exports = registerStatsIPC;