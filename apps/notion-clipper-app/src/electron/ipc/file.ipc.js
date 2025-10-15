// apps/notion-clipper-app/src/electron/ipc/file.ipc.js
const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

function registerFileIPC() {
  console.log('[FILE] Registering file IPC handlers...');

  /**
   * Open file picker
   */
  ipcMain.handle('file:pick', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
          },
          {
            name: 'Vidéos',
            extensions: ['mp4', 'webm', 'avi', 'mov']
          },
          {
            name: 'Audio',
            extensions: ['mp3', 'wav', 'ogg', 'flac']
          },
          {
            name: 'Documents',
            extensions: ['pdf', 'doc', 'docx', 'txt', 'md']
          },
          {
            name: 'Archives',
            extensions: ['zip', 'rar', '7z', 'tar', 'gz']
          },
          {
            name: 'Tous les fichiers',
            extensions: ['*']
          }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        fileName,
        fileSize: stats.size
      };
    } catch (error) {
      console.error('[FILE] Error picking file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Upload file
   */
  ipcMain.handle('file:upload', async (event, data) => {
    try {
      const { fileName, fileBuffer, config, pageId } = data;
      const { getFileService, getHistoryService, getQueueService } = require('../main');

      const fileService = getFileService();
      if (!fileService) {
        return {
          success: false,
          error: 'Service not initialized'
        };
      }

      console.log(`[FILE] Uploading ${fileName} to page ${pageId}`);

      // Check if online (simplified - you might want to implement proper network detection)
      const isOnline = true; // TODO: Get actual network status

      if (!isOnline) {
        // Add to queue if offline
        console.log('[FILE] Offline, adding to queue...');
        
        const queueService = getQueueService();
        if (queueService) {
          const queueEntry = await queueService.enqueue({
            pageId,
            content: { fileName, fileBuffer, config },
            options: { type: 'file' }
          });

          return {
            success: true,
            queued: true,
            queueId: queueEntry.id
          };
        }
      }

      // Create temporary file for upload
      const tempPath = path.join(require('os').tmpdir(), fileName);
      await fs.writeFile(tempPath, Buffer.from(fileBuffer));

      // Upload the file
      const uploadResult = await fileService.uploadFile(tempPath, config);

      // Clean up temp file
      await fs.unlink(tempPath).catch(() => {});

      if (!uploadResult.success) {
        return uploadResult;
      }

      // Append block to page if we have one
      if (uploadResult.block) {
        const { getNotionService } = require('../main');
        const notionService = getNotionService();
        
        if (notionService) {
          await notionService.appendBlocks(pageId, [uploadResult.block]);
        }
      }

      // Add to history
      const historyService = getHistoryService();
      if (historyService) {
        await historyService.add({
          timestamp: Date.now(),
          type: config.type,
          content: {
            raw: `File: ${fileName}`,
            preview: `Fichier uploadé : ${fileName}`,
            blocks: uploadResult.block ? [uploadResult.block] : [],
            metadata: uploadResult.metadata
          },
          page: {
            id: pageId,
            title: 'Page', // TODO: Get actual page title
            icon: '📄'
          },
          status: 'success',
          sentAt: Date.now()
        });
      }

      return uploadResult;
    } catch (error) {
      console.error('[FILE] Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Upload from URL
   */
  ipcMain.handle('file:upload-url', async (event, data) => {
    try {
      const { url, config, pageId } = data;
      const { getFileService } = require('../main');

      const fileService = getFileService();
      if (!fileService) {
        return {
          success: false,
          error: 'Service not initialized'
        };
      }

      console.log(`[FILE] Uploading from URL: ${url}`);

      const uploadResult = await fileService.uploadFromUrl(url, config);
      return uploadResult;
    } catch (error) {
      console.error('[FILE] URL upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Validate file before upload
   */
  ipcMain.handle('file:validate', async (event, data) => {
    try {
      const { filePath, maxSize = 20 * 1024 * 1024 } = data;

      const stats = await fs.stat(filePath);

      if (stats.size > maxSize) {
        return {
          valid: false,
          error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
        };
      }

      return {
        valid: true,
        size: stats.size,
        name: path.basename(filePath)
      };
    } catch (error) {
      console.error('[FILE] Validation error:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  });

  console.log('[OK] File IPC handlers registered');
}

module.exports = registerFileIPC;