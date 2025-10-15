import type { NotionBlock } from '../types';
import type { FileUploadOptions } from '../types/options';

// 🆕 Import des nouveaux types
export type FileIntegrationType = 'file_upload' | 'embed' | 'external';

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
  // 🆕 Nouvelles propriétés
  fileId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadTime: number;
  notionFileId?: string;
  notionUrl?: string;
  expiresAt?: number;
  externalUrl?: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
}

// 🆕 Options d'intégration étendues
export interface ExtendedFileUploadOptions extends FileUploadOptions {
  integrationType?: FileIntegrationType;
  embedOptions?: {
    caption?: string;
    width?: number;
    height?: number;
    showPreview?: boolean;
  };
  externalOptions?: {
    cdnUrl?: string;
    publicUrl?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Gestionnaire d'upload de fichiers vers Notion API native avec support des intégrations
 */
export class FileUploadHandler {
  private options: ExtendedFileUploadOptions;

  constructor(options: ExtendedFileUploadOptions) {
    if (!options.notionToken) {
      throw new Error('Notion token is required');
    }

    this.options = {
      maxFileSize: 20 * 1024 * 1024, // 20MB par défaut
      retryAttempts: 3,
      generateUniqueName: false,
      integrationType: 'file_upload', // 🆕 Défaut
      ...options
    };
  }

  /**
   * Upload un fichier selon le type d'intégration choisi
   */
  async uploadFile(file: File | Blob, filename?: string): Promise<FileUploadResult> {
    const startTime = Date.now();

    try {
      // Validation du fichier
      const validationResult = this.validateFile(file);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          fileName: filename || 'unknown',
          fileSize: file.size,
          mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
          uploadTime: Date.now() - startTime
        };
      }

      // Génération du nom unique si nécessaire
      const finalFilename = this.options.generateUniqueName
        ? this.generateUniqueName(filename || 'file')
        : filename || 'file';

      // 🆕 Upload selon le type d'intégration
      const integrationType = this.options.integrationType || 'file_upload';

      switch (integrationType) {
        case 'file_upload':
          return await this.uploadToNotion(file, finalFilename, startTime);
        case 'embed':
          return await this.uploadAsEmbed(file, finalFilename, startTime);
        case 'external':
          return await this.uploadAsExternal(file, finalFilename, startTime);
        default:
          throw new Error(`Type d'intégration non supporté: ${integrationType}`);
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur d'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        fileName: filename || 'unknown',
        fileSize: file.size,
        mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
        uploadTime: Date.now() - startTime
      };
    }
  }

  /**
   * Valide un fichier avant upload
   */
  private validateFile(file: File | Blob): { valid: boolean; error?: string } {
    if (!file) {
      return {
        valid: false,
        error: 'File is required'
      };
    }

    // Vérifier la taille
    if (file.size > this.options.maxFileSize!) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${this.options.maxFileSize} bytes`
      };
    }

    // Validation stricte du type
    if (isFilelike(file) && this.options.allowedTypes) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;

      // Map extensions to expected MIME types
      const extensionMimeMap: { [key: string]: string[] } = {
        'jpg': ['image/jpeg'],
        'jpeg': ['image/jpeg'],
        'png': ['image/png'],
        'gif': ['image/gif'],
        'webp': ['image/webp'],
        'mp4': ['video/mp4'],
        'webm': ['video/webm'],
        'mp3': ['audio/mpeg', 'audio/mp3'],
        'wav': ['audio/wav'],
        'ogg': ['audio/ogg'],
        'pdf': ['application/pdf']
      };

      if (extension && extensionMimeMap[extension]) {
        const validMimes = extensionMimeMap[extension];
        if (!validMimes.includes(mimeType)) {
          return {
            valid: false,
            error: `Type de fichier non autorisé: ${mimeType}`
          };
        }
      } else if (!this.options.allowedTypes.includes(mimeType)) {
        return {
          valid: false,
          error: `Type de fichier non autorisé: ${mimeType}`
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
  private async uploadToNotion(file: File | Blob, filename: string, startTime: number): Promise<FileUploadResult> {
    if (!this.options.notionToken) {
      return {
        success: false,
        error: 'Token Notion manquant',
        fileName: filename,
        fileSize: file.size,
        mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
        uploadTime: Date.now() - startTime
      };
    }

    try {
      // Étape 1: Créer le FileUpload
      const fileUpload = await this.createNotionFileUpload(file, filename);

      // Étape 2: Envoyer le fichier
      await this.sendFileToNotion(fileUpload.id, file, filename);

      const uploadTime = Date.now() - startTime;

      return {
        success: true,
        url: fileUpload.id,
        publicId: fileUpload.id,
        fileId: fileUpload.id,
        fileName: filename,
        fileSize: file.size,
        mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
        uploadTime,
        notionFileId: fileUpload.id,
        notionUrl: fileUpload.url,
        expiresAt: fileUpload.expires_at ? new Date(fileUpload.expires_at).getTime() : undefined,
        metadata: {
          originalName: filename,
          size: file.size,
          type: isFilelike(file) ? file.type : 'application/octet-stream'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur upload Notion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        fileName: filename,
        fileSize: file.size,
        mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
        uploadTime: Date.now() - startTime
      };
    }
  }

  /**
   * 🆕 Upload comme embed (intégré dans la page)
   */
  private async uploadAsEmbed(file: File | Blob, filename: string, startTime: number): Promise<FileUploadResult> {
    try {
      // Pour l'embed, on upload d'abord vers Notion puis on crée un embed
      const notionResult = await this.uploadToNotion(file, filename, startTime);

      if (!notionResult.success) {
        return notionResult;
      }

      // Générer une preview si c'est une image
      let thumbnailUrl: string | undefined;
      if (isFilelike(file) && file.type.startsWith('image/')) {
        thumbnailUrl = await this.generateImagePreview(file);
      }

      return {
        ...notionResult,
        thumbnailUrl
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur upload embed: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        fileName: filename,
        fileSize: file.size,
        mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
        uploadTime: Date.now() - startTime
      };
    }
  }

  /**
   * 🆕 Upload comme lien externe (CDN externe)
   */
  private async uploadAsExternal(file: File | Blob, filename: string, startTime: number): Promise<FileUploadResult> {
    try {
      // Pour l'external, on simule un upload vers un CDN externe
      // Dans une vraie implémentation, ceci ferait appel à Cloudinary, AWS S3, etc.

      const externalUrl = this.options.externalOptions?.publicUrl ||
        this.options.externalOptions?.cdnUrl ||
        `https://cdn.example.com/files/${this.generateUniqueName(filename)}`;

      const uploadTime = Date.now() - startTime;

      return {
        success: true,
        url: externalUrl,
        publicId: this.generateUniqueName(filename),
        fileId: this.generateUniqueName(filename),
        fileName: filename,
        fileSize: file.size,
        mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
        uploadTime,
        externalUrl,
        cdnUrl: this.options.externalOptions?.cdnUrl,
        metadata: {
          originalName: filename,
          size: file.size,
          type: isFilelike(file) ? file.type : 'application/octet-stream',
          ...this.options.externalOptions?.metadata
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur upload externe: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        fileName: filename,
        fileSize: file.size,
        mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
        uploadTime: Date.now() - startTime
      };
    }
  }

  /**
   * 🆕 Générer une preview d'image (version Node.js compatible)
   */
  private async generateImagePreview(file: File): Promise<string> {
    // Dans un environnement Node.js, on retourne une URL de placeholder
    // Dans un vrai projet, on utiliserait une librairie comme sharp ou canvas
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f3f4f6"/>
        <text x="100" y="100" text-anchor="middle" dy=".3em" fill="#6b7280">Preview</text>
      </svg>
    `)}`;
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
        mime_type: isFilelike(file) ? file.type : 'application/octet-stream'
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
   * 🆕 Crée un bloc Notion selon le type d'intégration
   */
  createBlockWithIntegration(
    uploadResult: FileUploadResult,
    file: File,
    integrationType: FileIntegrationType
  ): NotionBlock | null {
    if (!uploadResult.success || !uploadResult.url) {
      return null;
    }

    switch (integrationType) {
      case 'file_upload':
        return this.createNotionUploadBlock(uploadResult, file);
      case 'embed':
        return this.createEmbedBlock(uploadResult, file);
      case 'external':
        return this.createExternalBlock(uploadResult, file);
      default:
        return this.createNotionUploadBlock(uploadResult, file);
    }
  }

  /**
   * 🆕 Créer un bloc d'upload Notion natif
   */
  private createNotionUploadBlock(uploadResult: FileUploadResult, file: File): NotionBlock {
    const fileType = file.type.split('/')[0];
    const caption = this.createCaption(this.options.embedOptions?.caption);

    switch (fileType) {
      case 'image':
        return {
          type: 'image',
          image: {
            type: 'file_upload',
            file_upload: {
              id: uploadResult.notionFileId || uploadResult.publicId!
            },
            caption
          }
        };

      case 'video':
        return {
          type: 'video',
          video: {
            type: 'file_upload',
            file_upload: {
              id: uploadResult.notionFileId || uploadResult.publicId!
            },
            caption
          }
        };

      case 'audio':
        return {
          type: 'audio',
          audio: {
            type: 'file_upload',
            file_upload: {
              id: uploadResult.notionFileId || uploadResult.publicId!
            },
            caption
          }
        };

      default:
        return {
          type: 'file',
          file: {
            type: 'file_upload',
            file_upload: {
              id: uploadResult.notionFileId || uploadResult.publicId!
            },
            caption,
            name: file.name
          }
        };
    }
  }

  /**
   * 🆕 Créer un bloc embed
   */
  private createEmbedBlock(uploadResult: FileUploadResult, file: File): NotionBlock {
    const fileType = file.type.split('/')[0];
    const caption = this.createCaption(this.options.embedOptions?.caption);

    // Pour les embeds, on utilise l'URL externe ou l'URL Notion
    const url = uploadResult.externalUrl || uploadResult.notionUrl || uploadResult.url!;

    switch (fileType) {
      case 'image':
        return {
          type: 'image',
          image: {
            type: 'external',
            external: { url },
            caption
          }
        };

      case 'video':
        return {
          type: 'video',
          video: {
            type: 'external',
            external: { url },
            caption
          }
        };

      case 'audio':
        return {
          type: 'audio',
          audio: {
            type: 'external',
            external: { url },
            caption
          }
        };

      default:
        // Pour les autres fichiers, créer un bloc embed générique
        return {
          type: 'embed',
          embed: {
            url,
            caption
          }
        };
    }
  }

  /**
   * 🆕 Créer un bloc de lien externe
   */
  private createExternalBlock(uploadResult: FileUploadResult, file: File): NotionBlock {
    const url = uploadResult.externalUrl || uploadResult.cdnUrl || uploadResult.url!;
    const caption = this.createCaption(this.options.embedOptions?.caption || `📎 ${file.name}`);

    // Pour les liens externes, on crée un bloc de lien avec preview
    return {
      type: 'bookmark',
      bookmark: {
        url,
        caption
      }
    };
  }

  /**
   * 🆕 Créer un caption pour les blocs
   */
  private createCaption(text?: string): Array<{
    type: 'text';
    text: { content: string };
  }> {
    if (!text) return [];

    return [{
      type: 'text',
      text: { content: text }
    }];
  }

  /**
   * Crée un bloc Notion depuis un résultat d'upload (méthode legacy)
   */
  createBlockFromUpload(uploadResult: FileUploadResult, file: File): NotionBlock | null {
    // Utiliser la nouvelle méthode avec le type d'intégration par défaut
    return this.createBlockWithIntegration(
      uploadResult,
      file,
      this.options.integrationType || 'file_upload'
    );
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
 * Utilitaire pour vérifier si un objet a les propriétés d'un File
 * Compatible Node.js et navigateur
 */
function isFilelike(obj: any): obj is File {
  return obj && typeof obj === 'object' && 'name' in obj && 'type' in obj && 'size' in obj;
}

/**
 * 🆕 Upload un fichier avec intégration et parse le résultat
 */
export async function uploadFileAndParse(
  file: File | Blob,
  options: {
    upload: ExtendedFileUploadOptions;
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

    // Créer le bloc selon le type d'intégration
    const integrationType = options.upload.integrationType || 'file_upload';
    let block: NotionBlock | null = null;

    if (isFilelike(file)) {
      block = uploader.createBlockWithIntegration(uploadResult, file, integrationType);
    }

    return {
      uploadResult,
      block: block || undefined
    };
  } catch (error) {
    return {
      uploadResult: {
        success: false,
        error: 'Upload failed',
        fileName: isFilelike(file) ? file.name : 'unknown',
        fileSize: file.size,
        mimeType: isFilelike(file) ? file.type : 'application/octet-stream',
        uploadTime: 0
      },
      errors: [error as Error]
    };
  }
}

/**
 * 🆕 Utilitaire pour valider les options d'upload
 */
export function validateUploadOptions(options: ExtendedFileUploadOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!options.notionToken) {
    errors.push('Token Notion requis');
  }

  if (options.maxFileSize && options.maxFileSize > 20 * 1024 * 1024) {
    errors.push('Taille maximale ne peut pas dépasser 20MB pour Notion');
  }

  if (options.integrationType === 'external' && !options.externalOptions?.publicUrl && !options.externalOptions?.cdnUrl) {
    errors.push('URL publique ou CDN requise pour le type external');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 🆕 Utilitaire pour détecter le type de fichier optimal
 */
export function detectOptimalIntegrationType(file: File): FileIntegrationType {
  const fileSize = file.size;
  const mimeType = file.type;

  // Fichiers très volumineux -> external
  if (fileSize > 15 * 1024 * 1024) {
    return 'external';
  }

  // Images et vidéos -> embed pour une meilleure intégration visuelle
  if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
    return 'embed';
  }

  // Documents et autres -> file_upload
  return 'file_upload';
}