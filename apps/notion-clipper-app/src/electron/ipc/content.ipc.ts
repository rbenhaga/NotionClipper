import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { ElectronParserService } from '@notion-clipper/core-electron';

// Instance du service
let parserService: ElectronParserService | null = null;

interface ContentData {
  pageId: string;
  content: string;
  type?: string;
  options?: Record<string, any>;
}

interface ParseData {
  content: string;
  type?: string;
}

function registerContentIPC(): void {
  console.log('[CONTENT] Registering content IPC handlers...');

  // Initialiser le parser service
  if (!parserService) {
    parserService = new ElectronParserService();
    console.log('[CONTENT] ParserService initialized');
  }

  /**
   * Send content to Notion
   */
  ipcMain.handle('content:send', async (_event: IpcMainInvokeEvent, data: ContentData) => {
    try {
      // Dynamic require to avoid circular dependencies
      const { newNotionService, newStatsService } = require('../main');

      if (!newNotionService) {
        throw new Error('NotionService not initialized');
      }

      console.log('[CONTENT] Sending content to Notion...', {
        pageId: data.pageId,
        contentLength: data.content?.length || 0,
        type: data.type
      });

      // Send content using NotionService
      const result = await newNotionService.sendContent(
        data.pageId,
        data.content,
        data.options || {}
      );

      // Update stats on success
      if (result.success && newStatsService) {
        await newStatsService.incrementClips();
      }

      return result;
    } catch (error: any) {
      console.error('[ERROR] Error sending content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Parse content using ParserService
   */
  ipcMain.handle('content:parse', async (_event: IpcMainInvokeEvent, data: ParseData) => {
    try {
      console.log('[CONTENT] Parsing content...', {
        length: data.content?.length || 0,
        requestedType: data.type
      });

      if (!parserService) {
        throw new Error('Parser service not initialized');
      }

      // Parse content
      const result = await parserService.parse(data.content, (data.type as any) || 'auto');

      return {
        success: true,
        parsed: {
          type: result.type,
          content: data.content,
          blocks: result.blocks,
          metadata: result.metadata
        }
      };
    } catch (error: any) {
      console.error('[ERROR] Error parsing content:', error);
      return {
        success: false,
        error: error.message,
        parsed: {
          type: 'text',
          content: data.content,
          blocks: []
        }
      };
    }
  });

  /**
   * Upload image to external service (if needed)
   */
  ipcMain.handle('content:upload-image', async (_event: IpcMainInvokeEvent, imageData: string) => {
    try {
      // Pour l'instant, on retourne juste l'image en base64
      // Dans une version future, on pourrait uploader vers un service externe

      console.log('[CONTENT] Image upload requested');

      return {
        success: true,
        url: imageData, // Pour l'instant, retourner tel quel
        message: 'Image ready (base64)'
      };
    } catch (error: any) {
      console.error('[ERROR] Error uploading image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[OK] Content IPC handlers registered');
}

export default registerContentIPC;