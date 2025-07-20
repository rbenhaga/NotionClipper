const { ipcMain } = require('electron');
const clipboardService = require('../services/clipboard.service');

function registerClipboardIPC() {
  // Obtenir le contenu
  ipcMain.handle('clipboard:get', async () => {
    try {
      const content = clipboardService.getContent();
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Définir le contenu
  ipcMain.handle('clipboard:set', async (event, data) => {
    try {
      const success = clipboardService.setContent(data.content, data.type);
      return { success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Vider
  ipcMain.handle('clipboard:clear', async () => {
    try {
      clipboardService.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Historique
  ipcMain.handle('clipboard:get-history', async () => {
    try {
      const history = clipboardService.getHistory();
      return { success: true, history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Vider l'historique
  ipcMain.handle('clipboard:clear-history', async () => {
    try {
      clipboardService.clearHistory();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Écouter les changements
  clipboardService.on('content-changed', (content) => {
    // Envoyer à toutes les fenêtres
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('clipboard:changed', content);
    });
  });
}

module.exports = registerClipboardIPC;