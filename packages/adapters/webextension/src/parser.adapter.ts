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
        // color: options.color as any, // Removed in new architecture
        // ✅ NOUVELLE ARCHITECTURE - Options simplifiées
        useModernParser: true,
        maxLength: (options.maxBlocks || 50) * 1000, // Convert maxBlocks to maxLength estimate
        
        conversion: {
          preserveFormatting: options.preserveFormatting !== false,
          convertLinks: options.convertLinks !== false,
          convertImages: options.convertImages !== false,
          convertTables: true,
          convertCode: true
        },
        
        validation: {
          strictMode: false
        }
      }) as any;

      return {
        blocks: result.blocks || [],
        metadata: result.metadata,
        // validation: result.validation // Removed in new architecture
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
      // color: options.color as any, // Removed in new architecture
      // ✅ NOUVELLE ARCHITECTURE - parseMarkdown uses modern parser by default
      maxLength: (options.maxBlocks || 50) * 1000,
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
      // color: options.color as any, // Removed in new architecture
      // maxBlocks: options.maxBlocks || 50 // Removed in new architecture
    });
  }

  /**
   * Parse table specifically
   */
  async parseTable(content: string, format: 'csv' | 'tsv' | 'markdown' = 'csv', options: Omit<WebExtensionParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    return parseTable(content, format, {
      // color: options.color as any, // Removed in new architecture
      // maxBlocks: options.maxBlocks || 50 // Removed in new architecture
    });
  }

  /**
   * Parse clipboard content with web extension optimizations
   */
  async parseClipboardContent(content: string, contentType?: string): Promise<WebExtensionParseResult> {
    return this.parseContent(content, {
      // ✅ NOUVELLE ARCHITECTURE
      useModernParser: true,
      maxLength: 25000, // Lower limit for clipboard
      conversion: {
        preserveFormatting: true,
        convertLinks: true,
        convertImages: false // Avoid images from clipboard in web extension
      }
    } as any);
  }

  /**
   * Parse web page content
   */
  async parseWebPageContent(html: string, url?: string): Promise<WebExtensionParseResult> {
    const result = await this.parseContent(html, {
      // ✅ NOUVELLE ARCHITECTURE
      useModernParser: true,
      maxLength: 100000,
      conversion: {
        preserveFormatting: true,
        convertLinks: true,
        convertImages: true
      }
    } as any);

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