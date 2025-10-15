const { ipcMain } = require('electron');

function registerFileHandlers() {
  // Upload fichier
  ipcMain.handle('file:upload', async (event, file, options, pageId) => {
    try {
      const { newFileService } = require('../main');
      if (!newFileService) {
        throw new Error('File service not initialized');
      }
      const result = await newFileService.uploadFile(file, options, pageId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }
  });

  // Valider fichier
  ipcMain.handle('file:validate', async (event, file, maxSize) => {
    try {
      const { newFileService } = require('../main');
      if (!newFileService) {
        throw new Error('File service not initialized');
      }
      // Pour l'instant, validation simple
      const validation = {
        valid: file.size <= (maxSize || 20 * 1024 * 1024),
        error: file.size > (maxSize || 20 * 1024 * 1024) ? 'File too large' : null
      };
      return { success: true, data: validation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Preview fichier
  ipcMain.handle('file:preview', async (event, filePath) => {
    try {
      // Pour l'instant, retourner des infos basiques
      const path = require('path');
      const fs = require('fs');
      
      const stats = fs.statSync(filePath);
      const preview = {
        name: path.basename(filePath),
        size: stats.size,
        type: path.extname(filePath),
        lastModified: stats.mtime
      };
      return { success: true, data: preview };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerFileHandlers };