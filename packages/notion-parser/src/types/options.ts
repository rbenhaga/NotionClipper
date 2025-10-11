import type { NotionColor } from './notion';

export interface ParseOptions {
  contentType?: 'auto' | 'markdown' | 'html' | 'code' | 'table' | 'csv' | 'tsv' | 'text' | 'url';
  color?: NotionColor;
  maxBlocks?: number;
  maxRichTextLength?: number;
  maxCodeLength?: number;
  defaultLanguage?: string;
  metadata?: Record<string, any>;
}

export interface DetectionOptions {
  enableMarkdownDetection?: boolean;
  enableCodeDetection?: boolean;
  enableTableDetection?: boolean;
  enableUrlDetection?: boolean;
  enableHtmlDetection?: boolean;
}

export interface ConversionOptions {
  preserveFormatting?: boolean;
  convertLinks?: boolean;
  convertImages?: boolean;
  convertTables?: boolean;
  convertCode?: boolean;
}

export interface ValidationOptions {
  strictMode?: boolean;
  validateRichText?: boolean;
  validateBlockStructure?: boolean;
  maxBlockDepth?: number;
}