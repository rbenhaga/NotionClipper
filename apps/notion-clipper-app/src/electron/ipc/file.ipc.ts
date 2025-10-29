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
   * ✅ Upload un fichier vers Notion
   */
  ipcMain.handle('file:upload', async (_event: IpcMainInvokeEvent, data: {
    filePath: string;
    fileName: string;
    pageId: string;
    options?: {
      type?: 'file' | 'image' | 'video' | 'audio' | 'pdf';
      mode?: 'upload' | 'embed' | 'external';
      caption?: string;
    };
  }) => {
    try {
      console.log('[FILE] Uploading file:', {
        fileName: data.fileName,
        pageId: data.pageId,
        filePath: data.filePath
      });

      // Obtenir les services depuis main
      const { newNotionService, newConfigService, notionAPI, cache } = require('../main');
      
      if (!newNotionService || !newConfigService || !notionAPI || !cache) {
        throw new Error('Services not initialized');
      }

      // Obtenir le token Notion
      const token = await newConfigService.getNotionToken();
      if (!token) {
        throw new Error('Notion token not found');
      }

      // Initialiser le FileService avec les bons paramètres
      if (!fileService) {
        fileService = new ElectronFileService(notionAPI, cache, token);
        console.log('[FILE] FileService initialized');
      }

      // Lire le fichier depuis le système de fichiers
      const fileBuffer = await fs.readFile(data.filePath);

      // Déterminer le type de fichier
      const ext = path.extname(data.fileName).toLowerCase();
      let fileType: 'file' | 'image' | 'video' | 'audio' | 'pdf' = 'file';
      
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        fileType = 'image';
      } else if (['.mp4', '.webm', '.avi', '.mov'].includes(ext)) {
        fileType = 'video';
      } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
        fileType = 'audio';
      } else if (ext === '.pdf') {
        fileType = 'pdf';
      }

      // Upload le fichier avec la bonne signature
      const uploadResult = await fileService.uploadFile(
        { fileName: data.fileName, buffer: fileBuffer },
        {
          type: data.options?.type || fileType,
          mode: data.options?.mode || 'upload',
          caption: data.options?.caption
        }
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      console.log('[FILE] ✅ Upload successful:', uploadResult.url);

      // ✅ Ajouter le bloc à la page si disponible
      if (uploadResult.block && data.pageId) {
        await newNotionService.appendBlocks(data.pageId, [uploadResult.block]);
        console.log('[FILE] ✅ Block added to page');
      }

      return {
        success: true,
        result: uploadResult
      };
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