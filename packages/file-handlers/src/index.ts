/**
 * @notion-clipper/file-handlers
 * 
 * File validation and image processing utilities
 * Extracted from NotionClipboardEditor.tsx for modularity and testability
 */

export { FileValidator } from './FileValidator';
export { ImageProcessor } from './ImageProcessor';
export type {
  FileValidationResult,
  FileValidationOptions,
  ImageDimensions,
  ImageProcessingOptions,
  ImageProcessingResult
} from './types';
