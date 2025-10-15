// packages/adapters/electron/src/file.adapter.ts

import { dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IFileAdapter {
  pickFile(options?: any): Promise<string | null>;
  readFile(filePath: string): Promise<Buffer>;
  validateFile(filePath: string): Promise<boolean>;
  getFileInfo(filePath: string): Promise<any>;
}

export class ElectronFileAdapter implements IFileAdapter {
  async pickFile(options: any = {}): Promise<string | null> {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
          { name: 'Documents', extensions: ['pdf', 'txt', 'doc', 'docx'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        ...options
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('[FILE ADAPTER] Error picking file:', error);
      throw error;
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      console.error('[FILE ADAPTER] Error reading file:', error);
      throw error;
    }
  }

  async validateFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile() && stats.size > 0;
    } catch (error) {
      return false;
    }
  }

  async getFileInfo(filePath: string): Promise<any> {
    try {
      const stats = await fs.stat(filePath);
      return {
        name: path.basename(filePath),
        size: stats.size,
        extension: path.extname(filePath),
        lastModified: stats.mtime,
        isFile: stats.isFile()
      };
    } catch (error) {
      console.error('[FILE ADAPTER] Error getting file info:', error);
      throw error;
    }
  }
}