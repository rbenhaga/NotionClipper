/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  maxSize?: number; // bytes
  allowedTypes?: string[]; // MIME types
  maxDimensions?: { width: number; height: number };
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Image processing result
 */
export interface ImageProcessingResult {
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}
