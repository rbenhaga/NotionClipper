// apps/notion-clipper-app/src/electron/ipc/history.ipc.ts
import { ipcMain } from 'electron';

// Stockage temporaire en mémoire pour l'historique
let historyData: any[] = [];
let historyStats = {
  total: 0,
  success: 0,
  failed: 0,
  pending: 0,
  totalSize: 0,
  byType: {},
  byPage: {}
};

export function setupHistoryIPC() {
  // Obtenir tout l'historique
  ipcMain.handle('history:getAll', async (event, filter?: any) => {
    try {
      let filteredData = historyData;
      
      if (filter) {
        if (filter.status) {
          filteredData = filteredData.filter(item => item.status === filter.status);
        }
        if (filter.type) {
          filteredData = filteredData.filter(item => item.type === filter.type);
        }
        if (filter.pageId) {
          filteredData = filteredData.filter(item => item.page?.id === filter.pageId);
        }
      }
      
      return {
        success: true,
        data: filteredData.sort((a, b) => b.timestamp - a.timestamp)
      };
    } catch (error) {
      console.error('Error getting history:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  });

  // Obtenir les statistiques
  ipcMain.handle('history:getStats', async () => {
    try {
      // Recalculer les stats à partir des données
      const stats = {
        total: historyData.length,
        success: historyData.filter(item => item.status === 'success').length,
        failed: historyData.filter(item => item.status === 'failed' || item.status === 'error').length,
        pending: historyData.filter(item => item.status === 'pending').length,
        totalSize: historyData.reduce((sum, item) => sum + (item.content?.raw?.length || 0), 0),
        byType: {},
        byPage: {}
      };

      // Calculer par type
      historyData.forEach(item => {
        const type = item.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      // Calculer par page
      historyData.forEach(item => {
        const pageId = item.page?.id || 'unknown';
        stats.byPage[pageId] = (stats.byPage[pageId] || 0) + 1;
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting history stats:', error);
      return {
        success: false,
        error: error.message,
        data: historyStats
      };
    }
  });

  // Ajouter une entrée à l'historique
  ipcMain.handle('history:add', async (event, entry) => {
    try {
      const newEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        ...entry
      };
      
      historyData.unshift(newEntry);
      
      // Limiter à 1000 entrées max
      if (historyData.length > 1000) {
        historyData = historyData.slice(0, 1000);
      }
      
      return {
        success: true,
        data: newEntry
      };
    } catch (error) {
      console.error('Error adding to history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Réessayer une entrée
  ipcMain.handle('history:retry', async (event, id) => {
    try {
      const entry = historyData.find(item => item.id === id);
      if (!entry) {
        return {
          success: false,
          error: 'Entry not found'
        };
      }

      // Simuler un retry (à implémenter selon la logique métier)
      entry.status = 'pending';
      entry.retryCount = (entry.retryCount || 0) + 1;
      entry.lastRetry = Date.now();

      // Simuler un succès après 1 seconde
      setTimeout(() => {
        entry.status = 'success';
      }, 1000);

      return {
        success: true,
        data: entry
      };
    } catch (error) {
      console.error('Error retrying history entry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Supprimer une entrée
  ipcMain.handle('history:delete', async (event, id) => {
    try {
      const index = historyData.findIndex(item => item.id === id);
      if (index === -1) {
        return {
          success: false,
          error: 'Entry not found'
        };
      }

      historyData.splice(index, 1);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting history entry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Vider l'historique
  ipcMain.handle('history:clear', async (event, filter?: any) => {
    try {
      if (filter) {
        // Supprimer seulement les entrées qui correspondent au filtre
        historyData = historyData.filter(item => {
          if (filter.status && item.status === filter.status) return false;
          if (filter.type && item.type === filter.type) return false;
          if (filter.pageId && item.page?.id === filter.pageId) return false;
          return true;
        });
      } else {
        // Vider complètement
        historyData = [];
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error clearing history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('✅ History IPC handlers registered');
}