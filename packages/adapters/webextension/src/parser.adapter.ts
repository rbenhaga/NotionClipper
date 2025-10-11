/**
 * Parser adapter for web extension
 * Provides parsing capabilities using the new notion-parser package
 */

import type { NotionBlock } from '@notion-clipper/core-shared';
import { parseContent, parseMarkdown, parseCode, parseTable } from '@notion-clipper/core-shared';

export interface WebExtensionParseOptions {
  contentType?: 'auto' | 'markdown' | 'html' | 'code' | 'table' | 'csv' | 'tsv' | 'url' | 'text';
  color?: string;
  maxBlocks?: number;
  preserveFormatting?: boolean;
  convertLinks?: boolean;
  convertImages?: boolean;
}

export interface WebExtensionParseResult {
  blocks: NotionBlock[];
  metadata?: {
    detectedType: string;
    confidence: number;
    blockCount: number;
    processingTime: number;
  };
  validation?: {
    isValid: boolean;
    errors: Array<{ code: string; message: string }>;
    warnings: Array<{ code: string; message: string }>;
  };
}

/**
 * Web Extension Parser Adapter
 * Wraps the notion-parser for use in web extension context
 */
export class WebExtensionParserAdapter {
  
  /**
   * Parse content with web extension specific options
   */
  async parseContent(content: string, options: WebExtensionParseOptions = {}): Promise<WebExtensionParseResult> {
    if (!content?.trim()) {
      return {
        blocks: [],
        metadata: {
          detectedType: 'empty',
          confidence: 1.0,
          blockCount: 0,
          processingTime: 0
        }
      };
    }

    try {
      // Use the full new parser capabilities
      const result = parseContent(content, {
        contentType: options.contentType || 'auto',
        color: options.color as any,
        maxBlocks: options.maxBlocks || 50, // Lower limit for web extension
        
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
          maxConsecutiveEmptyLines: 1
        },
        
        validation: {
          strictMode: false,
          validateRichText: true,
          validateBlockStructure: true
        },
        
        includeValidation: true
      }) as any;

      return {
        blocks: result.blocks || [],
        metadata: result.metadata,
        validation: result.validation
      };
    } catch (error) {
      console.error('[WebExtensionParserAdapter] Parse error:', error);
      
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
          processingTime: 0
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
  async parseMarkdown(content: string, options: Omit<WebExtensionParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    return parseMarkdown(content, {
      color: options.color as any,
      maxBlocks: options.maxBlocks || 50,
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
  async parseCode(content: string, language?: string, options: Omit<WebExtensionParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    return parseCode(content, language, {
      color: options.color as any,
      maxBlocks: options.maxBlocks || 50
    });
  }

  /**
   * Parse table specifically
   */
  async parseTable(content: string, format: 'csv' | 'tsv' | 'markdown' = 'csv', options: Omit<WebExtensionParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    return parseTable(content, format, {
      color: options.color as any,
      maxBlocks: options.maxBlocks || 50
    });
  }

  /**
   * Parse clipboard content with web extension optimizations
   */
  async parseClipboardContent(content: string, contentType?: string): Promise<WebExtensionParseResult> {
    return this.parseContent(content, {
      contentType: contentType as any || 'auto',
      maxBlocks: 25, // Even lower limit for clipboard
      preserveFormatting: true,
      convertLinks: true,
      convertImages: false // Avoid images from clipboard in web extension
    });
  }

  /**
   * Parse web page content
   */
  async parseWebPageContent(html: string, url?: string): Promise<WebExtensionParseResult> {
    const result = await this.parseContent(html, {
      contentType: 'html',
      maxBlocks: 100,
      preserveFormatting: true,
      convertLinks: true,
      convertImages: true
    });

    // Add source URL to metadata
    if (result.metadata && url) {
      result.metadata = {
        ...result.metadata,
        sourceUrl: url,
        timestamp: new Date().toISOString()
      } as any;
    }

    return result;
  }
}