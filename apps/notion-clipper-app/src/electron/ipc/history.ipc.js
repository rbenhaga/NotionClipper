const { ipcMain } = require('electron');

function registerHistoryHandlers() {
  // Ajouter une entrée
  ipcMain.handle('history:add', async (event, entry) => {
    try {
      const { newHistoryService } = require('../main');
      if (!newHistoryService) {
        throw new Error('History service not initialized');
      }
      const result = await newHistoryService.add(entry);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Récupérer toutes les entrées
  ipcMain.handle('history:getAll', async (event, filter) => {
    try {
      const { newHistoryService } = require('../main');
      if (!newHistoryService) {
        throw new Error('History service not initialized');
      }
      const entries = filter ? 
        await newHistoryService.getFiltered(filter) : 
        await newHistoryService.getAll();
      return { success: true, data: entries };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Récupérer les statistiques
  ipcMain.handle('history:getStats', async () => {
    try {
      const { newHistoryService } = require('../main');
      if (!newHistoryService) {
        throw new Error('History service not initialized');
      }
      const stats = await newHistoryService.getStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Retry une entrée
  ipcMain.handle('history:retry', async (event, id) => {
    try {
      const { newHistoryService } = require('../main');
      if (!newHistoryService) {
        throw new Error('History service not initialized');
      }
      // Pour retry, on peut marquer comme pending et laisser la queue s'en occuper
      await newHistoryService.update(id, { status: 'pending' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Supprimer une entrée
  ipcMain.handle('history:delete', async (event, id) => {
    try {
      const { newHistoryService } = require('../main');
      if (!newHistoryService) {
        throw new Error('History service not initialized');
      }
      const result = await newHistoryService.delete(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Vider l'historique
  ipcMain.handle('history:clear', async (event, filter) => {
    try {
      const { newHistoryService } = require('../main');
      if (!newHistoryService) {
        throw new Error('History service not initialized');
      }
      await newHistoryService.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerHistoryHandlers };