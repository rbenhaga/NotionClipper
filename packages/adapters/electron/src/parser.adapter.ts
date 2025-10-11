/**
 * Parser adapter for Electron
 * Provides parsing capabilities using the new notion-parser package
 */

import type { NotionBlock } from '@notion-clipper/core-shared';
import { parseContent, parseMarkdown, parseCode, parseTable } from '@notion-clipper/core-shared';

export interface ElectronParseOptions {
  contentType?: 'auto' | 'markdown' | 'html' | 'code' | 'table' | 'csv' | 'tsv' | 'url' | 'text';
  color?: string;
  maxBlocks?: number;
  preserveFormatting?: boolean;
  convertLinks?: boolean;
  convertImages?: boolean;
  strictMode?: boolean;
}

export interface ElectronParseResult {
  blocks: NotionBlock[];
  metadata?: {
    detectedType: string;
    confidence: number;
    blockCount: number;
    processingTime: number;
    originalLength: number;
  };
  validation?: {
    isValid: boolean;
    errors: Array<{ code: string; message: string; blockIndex?: number }>;
    warnings: Array<{ code: string; message: string; blockIndex?: number }>;
  };
}

/**
 * Electron Parser Adapter
 * Wraps the notion-parser for use in Electron context with enhanced capabilities
 */
export class ElectronParserAdapter {
  
  /**
   * Parse content with Electron specific options
   */
  async parseContent(content: string, options: ElectronParseOptions = {}): Promise<ElectronParseResult> {
    if (!content?.trim()) {
      return {
        blocks: [],
        metadata: {
          detectedType: 'empty',
          confidence: 1.0,
          blockCount: 0,
          processingTime: 0,
          originalLength: 0
        }
      };
    }

    try {
      // Use the full new parser capabilities
      const result = parseContent(content, {
        contentType: options.contentType || 'auto',
        color: options.color as any,
        maxBlocks: options.maxBlocks || 100, // Higher limit for Electron
        
        detection: {
          enableMarkdownDetection: true,
          enableCodeDetection: true,
          enableTableDetection: true,
          enableUrlDetection: true,
          enableHtmlDetection: true
        },
        
        conversion: {
          preserveFormatting: options.preserveFormatting !== false,
          convertLinks: options.convertLinks !== false,
          convertImages: options.convertImages !== false,
          convertTables: true,
          convertCode: true
        },
        
        formatting: {
          removeEmptyBlocks: true,
          normalizeWhitespace: true,
          maxConsecutiveEmptyLines: 2
        },
        
        validation: {
          strictMode: options.strictMode || false,
          validateRichText: true,
          validateBlockStructure: true,
          maxBlockDepth: 3
        },
        
        includeValidation: true
      }) as any;

      return {
        blocks: result.blocks || [],
        metadata: result.metadata,
        validation: result.validation
      };
    } catch (error) {
      console.error('[ElectronParserAdapter] Parse error:', error);
      
      // Fallback to simple paragraph
      return {
        blocks: [{
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: content }
            }]
          }
        }],
        metadata: {
          detectedType: 'text',
          confidence: 1.0,
          blockCount: 1,
          processingTime: 0,
          originalLength: content.length
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: [{ 
            code: 'FALLBACK_USED', 
            message: 'Used fallback parsing due to error: ' + (error instanceof Error ? error.message : String(error))
          }]
        }
      };
    }
  }



  /**
   * Parse markdown specifically
   */
  async parseMarkdown(content: string, options: Omit<ElectronParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    return parseMarkdown(content, {
      color: options.color as any,
      maxBlocks: options.maxBlocks || 100,
      conversion: {
        preserveFormatting: options.preserveFormatting !== false,
        convertLinks: options.convertLinks !== false,
        convertImages: options.convertImages !== false
      }
    });
  }

  /**
   * Parse code specifically
   */
  async parseCode(content: string, language?: string, options: Omit<ElectronParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    return parseCode(content, language, {
      color: options.color as any,
      maxBlocks: options.maxBlocks || 100
    });
  }

  /**
   * Parse table specifically
   */
  async parseTable(content: string, format: 'csv' | 'tsv' | 'markdown' = 'csv', options: Omit<ElectronParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    return parseTable(content, format, {
      color: options.color as any,
      maxBlocks: options.maxBlocks || 100
    });
  }

  /**
   * Parse file content based on file extension
   */
  async parseFileContent(content: string, filename: string, options: ElectronParseOptions = {}): Promise<ElectronParseResult> {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'c++',
      'c': 'c',
      'cs': 'c#',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'text'
    };

    let contentType: ElectronParseOptions['contentType'] = 'auto';
    let language: string | undefined;

    if (extension) {
      if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'sql', 'css'].includes(extension)) {
        contentType = 'code';
        language = languageMap[extension];
      } else if (extension === 'md') {
        contentType = 'markdown';
      } else if (['csv', 'tsv'].includes(extension)) {
        contentType = extension as 'csv' | 'tsv';
      } else if (extension === 'html') {
        contentType = 'html';
      }
    }

    const result = await this.parseContent(content, {
      ...options,
      contentType
    });

    // Add file metadata
    if (result.metadata) {
      result.metadata = {
        ...result.metadata,
        filename,
        extension,
        language
      } as any;
    }

    return result;
  }

  /**
   * Parse clipboard content with Electron optimizations
   */
  async parseClipboardContent(content: string, contentType?: string): Promise<ElectronParseResult> {
    return this.parseContent(content, {
      contentType: contentType as any || 'auto',
      maxBlocks: 50,
      preserveFormatting: true,
      convertLinks: true,
      convertImages: true // Electron can handle images better
    });
  }

  /**
   * Parse web page content with full capabilities
   */
  async parseWebPageContent(html: string, url?: string, title?: string): Promise<ElectronParseResult> {
    const result = await this.parseContent(html, {
      contentType: 'html',
      maxBlocks: 200, // Higher limit for web pages in Electron
      preserveFormatting: true,
      convertLinks: true,
      convertImages: true
    });

    // Add web page metadata
    if (result.metadata) {
      result.metadata = {
        ...result.metadata,
        sourceUrl: url,
        pageTitle: title,
        timestamp: new Date().toISOString(),
        userAgent: process.versions.electron ? `Electron/${process.versions.electron}` : undefined
      } as any;
    }

    return result;
  }

  /**
   * Batch parse multiple contents
   */
  async parseBatch(contents: Array<{ content: string; options?: ElectronParseOptions }>): Promise<ElectronParseResult[]> {
    const results: ElectronParseResult[] = [];
    
    for (const { content, options } of contents) {
      try {
        const result = await this.parseContent(content, options);
        results.push(result);
      } catch (error) {
        console.error('[ElectronParserAdapter] Batch parse error:', error);
        results.push({
          blocks: [],
          metadata: {
            detectedType: 'error',
            confidence: 0,
            blockCount: 0,
            processingTime: 0,
            originalLength: content.length
          },
          validation: {
            isValid: false,
            errors: [{ code: 'BATCH_PARSE_ERROR', message: error instanceof Error ? error.message : String(error) }],
            warnings: []
          }
        });
      }
    }
    
    return results;
  }
}