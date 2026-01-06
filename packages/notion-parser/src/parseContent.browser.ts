/**
 * parseContent - Browser version (zero Node.js dependencies)
 * 
 * This file is resolved via package.json "exports" condition "browser"
 * No legacy parser fallback, no require() calls.
 */
import { ModernParser } from './parsers/ModernParser';
import { NotionConverter } from './converters/NotionConverter';
import { ContentValidator } from './validators/ContentValidator';
import type { NotionBlock } from './types/notion';

export interface ParseContentOptions {
  useModernParser?: boolean; // Ignored in browser version (always modern)
  validation?: {
    skipValidation?: boolean;
    strictMode?: boolean;
  };
  maxLength?: number;
}

export interface ParseContentResult {
  success: boolean;
  blocks: NotionBlock[];
  error?: string;
  metadata?: {
    detectedType: string;
    confidence: number;
    originalLength: number;
    blockCount: number;
    processingTime: number;
    contentType?: string;
    detectionConfidence?: number;
    tokenCount?: number;
    usedFallback?: boolean;
  };
}

/**
 * Browser-only parseContent - always uses ModernParser, no legacy fallback
 */
export function parseContent(
  content: string,
  options: ParseContentOptions = {}
): ParseContentResult {
  const startTime = Date.now();

  try {
    if (typeof content !== 'string') {
      return {
        success: false,
        error: 'Content must be a string',
        blocks: []
      };
    }

    if (!content || !content.trim()) {
      return {
        success: true,
        blocks: [],
        metadata: {
          detectedType: 'empty',
          confidence: 1.0,
          originalLength: content?.length || 0,
          blockCount: 0,
          processingTime: Date.now() - startTime,
          contentType: 'empty'
        }
      };
    }

    const maxLength = options.maxLength || 50000;
    const truncatedContent = content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;

    const modernParser = new ModernParser();
    const ast = modernParser.parse(truncatedContent);

    let validatedAst = ast;
    if (!options.validation?.skipValidation) {
      validatedAst = ast.map(node => {
        const validation = ContentValidator.validate(node);

        if (!validation.valid && options.validation?.strictMode) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        return ContentValidator.sanitize(node);
      });
    }

    const converter = new NotionConverter();
    const blocks = converter.convert(validatedAst);

    return {
      success: true,
      blocks,
      metadata: {
        detectedType: 'markdown',
        confidence: 1.0,
        originalLength: content.length,
        blockCount: blocks.length,
        processingTime: Date.now() - startTime,
        contentType: 'markdown',
        detectionConfidence: 1.0
      }
    };
  } catch (error) {
    return {
      success: false,
      blocks: [],
      error: error instanceof Error ? error.message : 'Parser error',
      metadata: {
        detectedType: 'error',
        confidence: 0,
        originalLength: content?.length || 0,
        blockCount: 0,
        processingTime: Date.now() - startTime
      }
    };
  }
}

// Aliases for compatibility
export function parseContentStrict(
  content: string,
  options: ParseContentOptions = {}
): ParseContentResult {
  return parseContent(content, {
    ...options,
    validation: { ...options.validation, strictMode: true }
  });
}

export function parseMarkdown(
  content: string,
  options: ParseContentOptions = {}
): NotionBlock[] {
  return parseContent(content, options).blocks;
}

export function parseCode(
  content: string,
  language?: string,
  options: ParseContentOptions = {}
): NotionBlock[] {
  return parseContent(content, options).blocks;
}

export function parseTable(
  content: string,
  format: 'csv' | 'tsv' | 'markdown' = 'csv',
  options: ParseContentOptions = {}
): NotionBlock[] {
  return parseContent(content, options).blocks;
}

export function parseAudio(
  content: string,
  options: ParseContentOptions = {}
): NotionBlock[] {
  return parseContent(content, options).blocks;
}
