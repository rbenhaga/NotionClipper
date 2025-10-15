// packages/core-shared/src/interfaces/file-upload.interface.ts

import {
  FileUploadOptions,
  FileUploadResult,
  FileInfo,
  FileValidationConfig,
  NotionFileBlock,
  FileUploadStats,
  SupportedFileType
} from '../types/file-upload.types';

/**
 * Interface pour le gestionnaire d'upload de fichiers
 */
export interface IFileUploadHandler {
  /**
   * Uploader un fichier vers Notion
   */
  uploadFile(
    file: File | Buffer,
    options: FileUploadOptions
  ): Promise<FileUploadResult>;

  /**
   * Uploader plusieurs fichiers
   */
  uploadFiles(
    files: (File | Buffer)[],
    options: FileUploadOptions
  ): Promise<FileUploadResult[]>;

  /**
   * Valider un fichier avant upload
   */
  validateFile(file: File | Buffer, config?: FileValidationConfig): Promise<FileInfo>;

  /**
   * Créer un bloc Notion à partir du résultat d'upload
   */
  createBlockFromUpload(
    uploadResult: FileUploadResult,
    integrationType: import('../types/history.types').FileIntegrationType,
    options?: any
  ): Promise<NotionFileBlock>;

  /**
   * Obtenir les informations d'un fichier
   */
  getFileInfo(file: File | Buffer): Promise<FileInfo>;

  /**
   * Générer une preview/thumbnail
   */
  generatePreview(file: File | Buffer): Promise<string | null>; // Data URL

  /**
   * Obtenir les statistiques d'upload
   */
  getUploadStats(): Promise<FileUploadStats>;

  /**
   * Nettoyer les fichiers temporaires
   */
  cleanup(): Promise<void>;
}

/**
 * Interface pour la validation de fichiers
 */
export interface IFileValidator {
  /**
   * Valider un fichier
   */
  validate(file: File | Buffer, config: FileValidationConfig): Promise<{
    isValid: boolean;
    errors: string[];
    warnings?: string[];
  }>;

  /**
   * Valider le type MIME
   */
  validateMimeType(mimeType: string, allowedTypes: string[]): boolean;

  /**
   * Valider l'extension
   */
  validateExtension(fileName: string, allowedExtensions: string[]): boolean;

  /**
   * Valider la taille
   */
  validateSize(size: number, maxSize: number): boolean;

  /**
   * Détecter le type de fichier
   */
  detectFileType(file: File | Buffer): Promise<SupportedFileType>;

  /**
   * Vérifier si le fichier est corrompu
   */
  checkIntegrity(file: File | Buffer): Promise<boolean>;
}

/**
 * Interface pour le processeur de fichiers
 */
export interface IFileProcessor {
  /**
   * Traiter un fichier (compression, conversion, etc.)
   */
  process(file: File | Buffer, options?: {
    compress?: boolean;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    format?: string;
  }): Promise<File | Buffer>;

  /**
   * Générer une thumbnail
   */
  generateThumbnail(file: File | Buffer, options?: {
    width?: number;
    height?: number;
    quality?: number;
  }): Promise<string>; // Data URL

  /**
   * Extraire les métadonnées
   */
  extractMetadata(file: File | Buffer): Promise<{
    dimensions?: { width: number; height: number };
    duration?: number;
    bitrate?: number;
    format?: string;
    [key: string]: any;
  }>;

  /**
   * Optimiser un fichier pour l'upload
   */
  optimize(file: File | Buffer, targetSize?: number): Promise<File | Buffer>;
}

/**
 * Interface pour le gestionnaire de CDN externe
 */
export interface IExternalCDNHandler {
  /**
   * Uploader vers un CDN externe
   */
  upload(file: File | Buffer, options?: {
    folder?: string;
    publicId?: string;
    tags?: string[];
  }): Promise<{
    url: string;
    publicId: string;
    secureUrl: string;
    thumbnailUrl?: string;
    metadata?: any;
  }>;

  /**
   * Supprimer un fichier du CDN
   */
  delete(publicId: string): Promise<boolean>;

  /**
   * Obtenir l'URL d'un fichier
   */
  getUrl(publicId: string, transformations?: any): string;

  /**
   * Obtenir les statistiques d'utilisation
   */
  getUsageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    bandwidth: number;
    requests: number;
  }>;
}