import type { NotionColor } from './notion';

export interface ParseOptions {
  contentType?: 'auto' | 'markdown' | 'html' | 'code' | 'table' | 'csv' | 'tsv' | 'text' | 'url' | 'latex' | 'json';
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
  enableLatexDetection?: boolean;
  enableJsonDetection?: boolean;
  confidenceThreshold?: number;
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
  validateUrls?: boolean;
  validateNestedBlocks?: boolean;
  maxChildrenCount?: number;
  enableDetailedErrors?: boolean;
}

export interface FormattingOptions {
  removeEmptyBlocks?: boolean;
  normalizeWhitespace?: boolean;
  mergeSimilarBlocks?: boolean;
  trimRichText?: boolean;
  enforceBlockLimits?: boolean;
  optimizeStructure?: boolean;
}

export interface ParseContentOptions extends ParseOptions {
  detection?: DetectionOptions;
  conversion?: ConversionOptions;
  validation?: ValidationOptions;
  formatting?: FormattingOptions;
}