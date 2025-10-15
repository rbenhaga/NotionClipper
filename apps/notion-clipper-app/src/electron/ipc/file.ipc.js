const { ipcMain } = require('electron');

function registerFileHandlers() {
  // Upload fichier
  ipcMain.handle('file:upload', async (event, { fileName, fileBuffer, caption, integrationType, pageId }) => {
    try {
      const { newFileService } = require('../main');
      if (!newFileService) {
        throw new Error('File service not initialized');
      }
      
      // Convertir le buffer array en Buffer Node.js
      const buffer = Buffer.from(fileBuffer);
      
      // Mapper les paramètres vers la config attendue
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      let fileType = 'file';
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension)) {
        fileType = 'image';
      } else if (['mp4', 'mov', 'webm'].includes(fileExtension)) {
        fileType = 'video';
      } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
        fileType = 'audio';
      } else if (fileExtension === 'pdf') {
        fileType = 'pdf';
      }

      const config = {
        type: fileType,
        mode: integrationType === 'external' ? 'external' : 'upload',
        caption,
        pageId
      };

      console.log(`[IPC] File upload config:`, config);

      const result = await newFileService.uploadFile(
        { fileName, buffer },
        config
      );
      
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

  // Upload depuis URL
  ipcMain.handle('file:upload-url', async (event, { url, caption, integrationType, pageId }) => {
    try {
      const { newFileService } = require('../main');
      if (!newFileService) {
        throw new Error('File service not initialized');
      }
      const result = await newFileService.uploadFromUrl(url, { caption, integrationType, pageId });
      return { success: true, data: result };
    } catch (error) {
      console.error('URL upload error:', error);
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