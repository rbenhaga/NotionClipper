/**
 * FileValidator - Service for validating files
 * 
 * Validates files against size limits, allowed MIME types, and image dimensions.
 * Provides utility methods to detect file types (image, PDF, audio, video).
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { FileValidationResult, FileValidationOptions } from './types';

// Common MIME type patterns
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];
const PDF_TYPES = ['application/pdf'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/aac', 'audio/flac'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

export class FileValidator {
  /**
   * Validate a file against the provided options
   * Requirements: 2.1, 2.2, 2.4
   */
  static validate(file: File, options: FileValidationOptions = {}): FileValidationResult {
    const warnings: string[] = [];

    // Check file size (Requirement 2.1)
    if (options.maxSize !== undefined && file.size > options.maxSize) {
      const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
      };
    }

    // Check allowed types (Requirement 2.2)
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const isAllowed = options.allowedTypes.some(type => {
        // Support wildcard patterns like "image/*"
        if (type.endsWith('/*')) {
          const prefix = type.slice(0, -1);
          return file.type.startsWith(prefix);
        }
        return file.type === type;
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `File type "${file.type}" is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
        };
      }
    }

    // Add warning for empty files
    if (file.size === 0) {
      warnings.push('File is empty');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate image dimensions asynchronously
   * Requirements: 2.4
   */
  static async validateImageDimensions(
    file: File,
    maxDimensions: { width: number; height: number }
  ): Promise<FileValidationResult> {
    if (!FileValidator.isImage(file)) {
      return { valid: true }; // Not an image, skip dimension check
    }

    try {
      const dimensions = await FileValidator.getImageDimensions(file);
      
      if (dimensions.width > maxDimensions.width || dimensions.height > maxDimensions.height) {
        return {
          valid: false,
          error: `Image dimensions (${dimensions.width}x${dimensions.height}) exceed maximum allowed (${maxDimensions.width}x${maxDimensions.height})`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to read image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get image dimensions from a file
   */
  static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      if (!FileValidator.isImage(file)) {
        reject(new Error('File is not an image'));
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Check if file is an image
   * Requirement 2.5
   */
  static isImage(file: File): boolean {
    return IMAGE_TYPES.includes(file.type) || file.type.startsWith('image/');
  }

  /**
   * Check if file is a PDF
   * Requirement 2.5
   */
  static isPdf(file: File): boolean {
    return PDF_TYPES.includes(file.type);
  }

  /**
   * Check if file is an audio file
   * Requirement 2.5
   */
  static isAudio(file: File): boolean {
    return AUDIO_TYPES.includes(file.type) || file.type.startsWith('audio/');
  }

  /**
   * Check if file is a video file
   * Requirement 2.5
   */
  static isVideo(file: File): boolean {
    return VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/');
  }

  /**
   * Get human-readable file type category
   */
  static getFileCategory(file: File): 'image' | 'pdf' | 'audio' | 'video' | 'other' {
    if (FileValidator.isImage(file)) return 'image';
    if (FileValidator.isPdf(file)) return 'pdf';
    if (FileValidator.isAudio(file)) return 'audio';
    if (FileValidator.isVideo(file)) return 'video';
    return 'other';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
