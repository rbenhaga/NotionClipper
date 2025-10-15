// packages/notion-parser/src/types/options.ts

export interface FileUploadOptions {
  notionToken: string;
  maxFileSize?: number;
  allowedTypes?: string[];
  retryAttempts?: number;
  generateUniqueName?: boolean;
}