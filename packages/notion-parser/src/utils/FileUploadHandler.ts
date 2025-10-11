import type { NotionBlock } from '../types';
import type { FileUploadOptions } from '../types/options';

export interface FileUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
  metadata?: {
    originalName: string;
    size: number;
    type: string;
    width?: number;
    height?: number;
    duration?: number;
  };
}

/**
 * Gestionnaire d'upload de fichiers vers Notion API native
 */
export class FileUploadHandler {
  private options: FileUploadOptions;

  constructor(options: FileUploadOptions) {
    this.options = {
      maxFileSize: 20 * 1024 * 1024, // 20MB par défaut
      retryAttempts: 3,
      generateUniqueName: false,
      ...options
    };
  }

  /**
   * Upload un fichier vers Notion API native
   */
  async uploadFile(file: File | Blob, filename?: string): Promise<FileUploadResult> {
    try {
      // Validation du fichier
      const validationResult = this.validateFile(file);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Génération du nom unique si nécessaire
      const finalFilename = this.options.generateUniqueName 
        ? this.generateUniqueName(filename || 'file')
        : filename || 'file';

      // Upload vers Notion API native uniquement
      return await this.uploadToNotion(file, finalFilename);
    } catch (error) {
      return {
        success: false,
        error: `Erreur d'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Valide un fichier avant upload
   */
  private validateFile(file: File | Blob): { valid: boolean; error?: string } {
    // Vérifier la taille
    if (file.size > this.options.maxFileSize!) {
      return {
        valid: false,
        error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB > ${(this.options.maxFileSize! / 1024 / 1024).toFixed(1)}MB`
      };
    }

    // Vérifier le type si spécifié
    if (file instanceof File && this.options.allowedTypes) {
      const isAllowed = this.options.allowedTypes.some((allowedType: string) => {
        return file.type === allowedType || file.type.startsWith(allowedType.replace('*', ''));
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `Type de fichier non autorisé: ${file.type}. Types autorisés: ${this.options.allowedTypes.join(', ')}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Génère un nom de fichier unique
   */
  private generateUniqueName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    
    return `${baseName}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Upload vers Notion API native
   */
  private async uploadToNotion(file: File | Blob, filename: string): Promise<FileUploadResult> {
    if (!this.options.notionToken) {
      return {
        success: false,
        error: 'Token Notion manquant'
      };
    }

    try {
      // Étape 1: Créer le FileUpload
      const fileUpload = await this.createNotionFileUpload(file, filename);
      
      // Étape 2: Envoyer le fichier
      await this.sendFileToNotion(fileUpload.id, file, filename);
      
      return {
        success: true,
        url: fileUpload.id, // Utiliser l'ID comme URL
        publicId: fileUpload.id,
        metadata: {
          originalName: filename,
          size: file.size,
          type: file instanceof File ? file.type : 'application/octet-stream'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur upload Notion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Crée un FileUpload dans Notion
   */
  private async createNotionFileUpload(file: File | Blob, filename: string): Promise<any> {
    const response = await fetch('https://api.notion.com/v1/file_uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.options.notionToken}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: filename,
        file_size: file.size,
        mime_type: file instanceof File ? file.type : 'application/octet-stream'
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur création FileUpload: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Envoie le fichier vers Notion
   */
  private async sendFileToNotion(fileUploadId: string, file: File | Blob, filename: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', file, filename);

    const response = await fetch(`https://api.notion.com/v1/file_uploads/${fileUploadId}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.options.notionToken}`,
        'Notion-Version': '2025-09-03'
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Erreur envoi fichier: ${response.status}`);
    }
  }

  /**
   * Crée un bloc Notion depuis un résultat d'upload
   */
  createNotionBlock(blockType: string, uploadResult: FileUploadResult): NotionBlock {
    const baseBlock: any = {
      object: 'block',
      type: blockType
    };

    if (blockType === 'image') {
      baseBlock.image = {
        type: 'file_upload',
        file_upload: {
          id: uploadResult.publicId
        },
        caption: []
      };
    } else if (blockType === 'video') {
      baseBlock.video = {
        type: 'file_upload',
        file_upload: {
          id: uploadResult.publicId
        },
        caption: []
      };
    } else if (blockType === 'audio') {
      baseBlock.audio = {
        type: 'file_upload',
        file_upload: {
          id: uploadResult.publicId
        },
        caption: []
      };
    } else if (blockType === 'file') {
      baseBlock.file = {
        type: 'file_upload',
        file_upload: {
          id: uploadResult.publicId
        },
        caption: []
      };
    }

    return baseBlock as NotionBlock;
  }
}

/**
 * Upload un fichier et parse le résultat
 */
export async function uploadFileAndParse(
  file: File | Blob,
  options: {
    upload: FileUploadOptions;
    parse?: any;
  }
): Promise<{
  uploadResult: FileUploadResult;
  block?: NotionBlock;
  errors?: Error[];
}> {
  try {
    const uploader = new FileUploadHandler(options.upload);
    
    const uploadResult = await uploader.uploadFile(file);
    
    if (!uploadResult.success) {
      return {
        uploadResult,
        errors: [new Error(uploadResult.error || 'Upload failed')]
      };
    }

    // Déterminer le type de bloc
    let blockType = 'file';
    if (file instanceof File) {
      if (file.type.startsWith('image/')) blockType = 'image';
      else if (file.type.startsWith('video/')) blockType = 'video';
      else if (file.type.startsWith('audio/')) blockType = 'audio';
    }

    const block = uploader.createNotionBlock(blockType, uploadResult);

    return {
      uploadResult,
      block
    };
  } catch (error) {
    return {
      uploadResult: { success: false, error: 'Upload failed' },
      errors: [error as Error]
    };
  }
}