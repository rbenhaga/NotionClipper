// apps/notion-clipper-app/src/electron/ipc/file.ipc.ts
// ✅ CORRECTION: Handler IPC pour l'upload de fichiers

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { ElectronFileService } from '@notion-clipper/core-electron';
import path from 'path';
import fs from 'fs/promises';

let fileService: ElectronFileService | null = null;

export function setupFileIPC(): void {
  console.log('[FILE] Setting up File IPC handlers...');

  /**
   * ✅ Upload un fichier vers Notion avec intégration complète
   */
  ipcMain.handle('file:upload', async (_event: IpcMainInvokeEvent, data: {
    fileName: string;
    fileBuffer: ArrayBuffer;
    caption?: string;
    integrationType?: 'upload' | 'external';
    pageId: string;
    afterBlockId?: string; // 🔥 NOUVEAU: Support des sections TOC
  }) => {
    try {
      console.log(`[FILE-IPC] 🚀 Upload request:`, { 
        fileName: data.fileName, 
        pageId: data.pageId, 
        integrationType: data.integrationType 
      });

      // Obtenir les services depuis main
      const { newFileService, newNotionService } = require('../main');
      
      if (!newFileService) {
        throw new Error('File service not initialized');
      }

      if (!newNotionService) {
        throw new Error('Notion service not initialized');
      }

      if (!data.pageId) {
        throw new Error('Page ID is required for file upload');
      }

      // Convertir le buffer array en Buffer Node.js
      const buffer = Buffer.from(data.fileBuffer);
      console.log(`[FILE-IPC] 📦 Buffer size: ${buffer.length} bytes`);

      // Mapper les paramètres vers la config attendue
      const fileExtension = data.fileName.split('.').pop()?.toLowerCase();
      let fileType: 'file' | 'image' | 'video' = 'file';

      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension || '')) {
        fileType = 'image';
      } else if (['mp4', 'mov', 'webm'].includes(fileExtension || '')) {
        fileType = 'video';
      }

      const config = {
        type: fileType,
        mode: data.integrationType === 'external' ? 'external' : 'upload',
        caption: data.caption
      };

      console.log(`[FILE-IPC] ⚙️ Upload config:`, config);

      // 1️⃣ Upload le fichier et obtenir le bloc Notion
      const uploadResult = await newFileService.uploadFile(
        { fileName: data.fileName, buffer },
        config
      );

      if (!uploadResult.success) {
        console.error(`[FILE-IPC] ❌ Upload failed:`, uploadResult.error);
        return { success: false, error: uploadResult.error };
      }

      console.log(`[FILE-IPC] ✅ File uploaded successfully`);

      // 2️⃣ Envoyer le bloc à la page Notion
      if (uploadResult.block) {
        console.log(`[FILE-IPC] 📄 Appending block to page ${data.pageId}...`);

        // 🔥 NOUVEAU: Log si afterBlockId fourni
        if (data.afterBlockId) {
          console.log(`[FILE-IPC] 📍 Inserting after block: ${data.afterBlockId}`);
        }

        try {
          await newNotionService.appendBlocks(data.pageId, [uploadResult.block], data.afterBlockId);
          console.log(`[FILE-IPC] ✅ Block appended to page successfully`);

          return {
            success: true,
            data: {
              ...uploadResult,
              blockAdded: true
            }
          };
        } catch (appendError: any) {
          console.error(`[FILE-IPC] ❌ Failed to append block to page:`, appendError);
          return {
            success: false,
            error: `File uploaded but failed to add to page: ${appendError.message}`
          };
        }
      } else {
        console.warn(`[FILE-IPC] ⚠️ No block returned from upload`);
        return {
          success: true,
          data: uploadResult,
          warning: 'File uploaded but no block was created'
        };
      }
    } catch (error: any) {
      console.error('[FILE] ❌ Upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  });

  /**
   * ✅ Valider un fichier avant upload
   */
  ipcMain.handle('file:validate', async (_event: IpcMainInvokeEvent, data: {
    filePath: string;
    maxSize?: number;
  }) => {
    try {
      const stats = await fs.stat(data.filePath);
      const maxSize = data.maxSize || 20 * 1024 * 1024; // 20MB par défaut

      if (stats.size > maxSize) {
        return {
          valid: false,
          error: `File too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: ${Math.round(maxSize / 1024 / 1024)}MB)`
        };
      }

      return {
        valid: true,
        size: stats.size
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      };
    }
  });

  /**
   * ✅ Obtenir une preview d'un fichier
   */
  ipcMain.handle('file:preview', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      if (imageExtensions.includes(ext)) {
        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString('base64');
        return {
          success: true,
          preview: `data:image/${ext.substring(1)};base64,${base64}`
        };
      }

      return {
        success: false,
        error: 'Preview not available for this file type'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[FILE] ✅ File IPC handlers registered');
}

// Exporter pour l'initialisation dans main.ts
export default setupFileIPC;