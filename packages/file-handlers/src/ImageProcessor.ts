/**
 * ImageProcessor - Service for processing images
 * 
 * Provides methods for generating previews, compressing images,
 * and getting image dimensions.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { ImageDimensions, ImageProcessingOptions, ImageProcessingResult } from './types';
import { FileValidator } from './FileValidator';

export class ImageProcessor {
  /**
   * Generate a preview (base64 data URL) for an image file
   * Requirement 3.1
   */
  static async generatePreview(
    file: File,
    options: { maxWidth?: number; maxHeight?: number } = {}
  ): Promise<string> {
    if (!FileValidator.isImage(file)) {
      throw new Error('File is not an image');
    }

    const { maxWidth = 400, maxHeight = 400 } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // Calculate dimensions preserving aspect ratio
            const { width, height } = ImageProcessor.calculateDimensions(
              img.naturalWidth,
              img.naturalHeight,
              maxWidth,
              maxHeight
            );

            canvas.width = width;
            canvas.height = height;

            // Draw image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
          } catch (error) {
            reject(new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress an image file
   * Requirement 3.2
   */
  static async compress(
    file: File,
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult> {
    if (!FileValidator.isImage(file)) {
      throw new Error('File is not an image');
    }

    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // Calculate dimensions preserving aspect ratio
            const { width, height } = ImageProcessor.calculateDimensions(
              img.naturalWidth,
              img.naturalHeight,
              maxWidth,
              maxHeight
            );

            canvas.width = width;
            canvas.height = height;

            // Draw image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to data URL with compression
            const mimeType = `image/${format}`;
            const dataUrl = canvas.toDataURL(mimeType, quality);

            // Calculate approximate size
            const base64Length = dataUrl.length - `data:${mimeType};base64,`.length;
            const size = Math.ceil(base64Length * 0.75);

            resolve({
              dataUrl,
              width,
              height,
              size
            });
          } catch (error) {
            reject(new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Get image dimensions from a file
   * Requirement 3.4
   */
  static async getDimensions(file: File): Promise<ImageDimensions> {
    if (!FileValidator.isImage(file)) {
      throw new Error('File is not an image');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Resize an image to fit within max dimensions while preserving aspect ratio
   * Requirement 3.3
   */
  static async resize(
    file: File,
    maxWidth: number,
    maxHeight: number,
    options: { quality?: number; format?: 'jpeg' | 'png' | 'webp' } = {}
  ): Promise<ImageProcessingResult> {
    return ImageProcessor.compress(file, {
      maxWidth,
      maxHeight,
      quality: options.quality ?? 0.9,
      format: options.format ?? 'jpeg'
    });
  }

  /**
   * Calculate dimensions that fit within max bounds while preserving aspect ratio
   */
  static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): ImageDimensions {
    // If image is smaller than max, return original dimensions
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    // Calculate scale factor
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const scale = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(originalWidth * scale),
      height: Math.round(originalHeight * scale)
    };
  }

  /**
   * Convert a data URL to a Blob
   */
  static dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Convert a Blob to a data URL
   */
  static blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
      reader.readAsDataURL(blob);
    });
  }
}
