// packages/core-shared/src/types/file-upload.types.ts

import { FileIntegrationType } from './history.types';

/**
 * Types de fichiers supportés
 */
export type SupportedFileType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

/**
 * Configuration d'upload de fichier
 */
export interface FileUploadOptions {
  notionToken: string;
  maxFileSize?: number;             // Défaut: 20MB
  retryAttempts?: number;           // Défaut: 3
  generateUniqueName?: boolean;     // Défaut: true
  integrationType?: FileIntegrationType; // Défaut: 'file_upload'
  
  // Options pour embed
  embedOptions?: {
    caption?: string;
    width?: number;
    height?: number;
    showPreview?: boolean;
  };
  
  // Options pour external
  externalOptions?: {
    cdnUrl?: string;
    publicUrl?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Résultat d'upload de fichier
 */
export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  url?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadTime: number;               // Temps d'upload en ms
  error?: string;
  
  // Metadata Notion
  notionFileId?: string;
  notionUrl?: string;
  expiresAt?: number;               // Pour les URLs temporaires Notion
  
  // Metadata pour external
  externalUrl?: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Informations sur un fichier avant upload
 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;                     // MIME type
  lastModified: number;
  fileType: SupportedFileType;
  
  // Preview/thumbnail
  preview?: string;                 // Data URL pour preview
  thumbnailUrl?: string;
  
  // Validation
  isValid: boolean;
  validationErrors?: string[];
  
  // Metadata
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number;                // Pour audio/video en secondes
}

/**
 * Configuration de validation des fichiers
 */
export interface FileValidationConfig {
  maxSize: number;                  // En bytes
  allowedTypes: string[];           // MIME types autorisés
  allowedExtensions: string[];      // Extensions autorisées
  
  // Validation spécifique par type
  imageConfig?: {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
    allowedFormats?: string[];      // jpg, png, gif, etc.
  };
  
  videoConfig?: {
    maxDuration?: number;           // En secondes
    allowedFormats?: string[];      // mp4, webm, etc.
  };
  
  audioConfig?: {
    maxDuration?: number;           // En secondes
    allowedFormats?: string[];      // mp3, wav, etc.
  };
}

/**
 * Événements d'upload de fichier
 */
export interface FileUploadEvents {
  'upload:start': (file: FileInfo) => void;
  'upload:progress': (file: FileInfo, progress: number) => void;
  'upload:success': (file: FileInfo, result: FileUploadResult) => void;
  'upload:error': (file: FileInfo, error: Error) => void;
  'upload:retry': (file: FileInfo, attempt: number) => void;
  'validation:error': (file: FileInfo, errors: string[]) => void;
}

/**
 * Bloc Notion créé à partir d'un fichier
 */
export interface NotionFileBlock {
  type: 'file' | 'image' | 'video' | 'audio' | 'embed';
  content: {
    url?: string;
    file?: {
      url: string;
      expiry_time?: string;
    };
    external?: {
      url: string;
    };
    caption?: Array<{
      type: 'text';
      text: {
        content: string;
      };
    }>;
  };
  
  // Metadata pour le tracking
  metadata?: {
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    uploadTime: number;
    integrationType: FileIntegrationType;
  };
}

/**
 * Statistiques d'upload de fichiers
 */
export interface FileUploadStats {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalSize: number;                // En bytes
  averageUploadTime: number;        // En ms
  
  // Par type de fichier
  byFileType: Record<SupportedFileType, {
    count: number;
    totalSize: number;
    averageUploadTime: number;
    successRate: number;
  }>;
  
  // Par type d'intégration
  byIntegrationType: Record<FileIntegrationType, {
    count: number;
    successRate: number;
    averageUploadTime: number;
  }>;
  
  // Tendances
  uploadsLast24h: number;
  uploadsLast7days: number;
  uploadsLast30days: number;
}