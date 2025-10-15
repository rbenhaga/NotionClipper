// packages/core-shared/src/types/file.types.ts

export interface FileUploadConfig {
  type: 'file' | 'image' | 'video' | 'audio' | 'pdf';
  mode: 'upload' | 'embed' | 'external';
  caption?: string;
}

export interface FileUploadResult {
  success: boolean;
  block?: any; // NotionBlock
  url?: string;
  error?: string;
  metadata?: {
    size: number;
    type: string;
    name: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  size?: number;
  name?: string;
}