/**
 * Parser adapter for Electron
 * Provides parsing capabilities using the new notion-parser package
 */

import type { NotionBlock } from '@notion-clipper/core-shared';
import { parseContent, parseMarkdown, parseCode, parseTable, NotionConverter } from '@notion-clipper/core-shared';

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
        // ✅ NOUVELLE ARCHITECTURE
        useModernParser: true,
        maxLength: (options.maxBlocks || 100) * 1000, // Higher limit for Electron
        
        conversion: {
          preserveFormatting: options.preserveFormatting !== false,
          convertLinks: options.convertLinks !== false,
          convertImages: options.convertImages !== false,
          convertTables: true,
          convertCode: true
        },
        
        validation: {
          strictMode: options.strictMode || false
        }
      }) as any;

      return {
        blocks: result.blocks || [],
        metadata: result.metadata,
        // validation: result.validation // Removed in new architecture
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
    const astNodes = parseMarkdown(content);
    const converter = new NotionConverter();
    return converter.convert(astNodes, {
      preserveFormatting: options.preserveFormatting !== false,
      convertLinks: options.convertLinks !== false,
      convertImages: options.convertImages !== false
    });
  }

  /**
   * Parse code specifically
   */
  async parseCode(content: string, language?: string, options: Omit<ElectronParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    const astNodes = parseCode(content, language);
    const converter = new NotionConverter();
    return converter.convert(astNodes);
  }

  /**
   * Parse table specifically
   */
  async parseTable(content: string, format: 'csv' | 'tsv' | 'markdown' = 'csv', options: Omit<ElectronParseOptions, 'contentType'> = {}): Promise<NotionBlock[]> {
    const astNodes = parseTable(content);
    const converter = new NotionConverter();
    return converter.convert(astNodes);
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
      // ✅ NOUVELLE ARCHITECTURE
      useModernParser: true,
      maxLength: 50000,
      conversion: {
        preserveFormatting: true,
        convertLinks: true,
        convertImages: true // Electron can handle images better
      }
    } as any);
  }

  /**
   * Parse web page content with full capabilities
   */
  async parseWebPageContent(html: string, url?: string, title?: string): Promise<ElectronParseResult> {
    const result = await this.parseContent(html, {
      contentType: 'html',
      // ✅ NOUVELLE ARCHITECTURE
      useModernParser: true,
      maxLength: 200000, // Higher limit for web pages in Electron
      conversion: {
        preserveFormatting: true,
        convertLinks: true,
        convertImages: true
      }
    } as any);

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
          // validation removed in new architecture
        });
      }
    }
    
    return results;
  }
}