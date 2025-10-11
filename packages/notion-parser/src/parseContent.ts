/**
 * API principale pour le parsing de contenu
 */

import { ContentDetector } from './detectors/ContentDetector';
import { MarkdownParser } from './parsers/MarkdownParser';
import { CodeParser } from './parsers/CodeParser';
import { TableParser } from './parsers/TableParser';
import { LatexParser } from './parsers/LatexParser';
import { AudioParser } from './parsers/AudioParser';
import { NotionConverter } from './converters/NotionConverter';
import { BlockFormatter } from './formatters/BlockFormatter';
import { NotionValidator } from './validators/NotionValidator';
import type { 
  NotionBlock, 
  ParseOptions, 
  DetectionOptions, 
  ConversionOptions, 
  ValidationOptions
} from './types';
import type { FormattingOptions } from './formatters/BlockFormatter';
import type { ValidationResult } from './validators/NotionValidator';

export interface ParseContentOptions extends ParseOptions {
  // Detection options
  detection?: DetectionOptions;
  
  // Conversion options
  conversion?: ConversionOptions;
  
  // Validation options
  validation?: ValidationOptions;
  
  // Formatting options
  formatting?: FormattingOptions;
  
  // Skip validation
  skipValidation?: boolean;
  
  // Return validation result
  includeValidation?: boolean;
  
  // Include metadata in result
  includeMetadata?: boolean;
  
  // Error handling strategy
  errorHandling?: {
    onError?: 'throw' | 'return' | 'ignore';
  };
}

export interface ParseContentResult {
  success: boolean;
  blocks: NotionBlock[];
  error?: string;
  validation?: ValidationResult;
  metadata?: {
    detectedType: string;
    confidence: number;
    originalLength: number;
    blockCount: number;
    processingTime: number;
    contentType?: string;
    detectionConfidence?: number;
  };
}

/**
 * Parse le contenu et le convertit en blocs Notion API
 */
export function parseContent(
  content: string, 
  options: ParseContentOptions = {}
): ParseContentResult {
  const startTime = Date.now();
  
  try {
    // Gestion des cas null/undefined/empty
    if (content === null || content === undefined) {
      return {
        success: true,
        blocks: [],
        metadata: {
          detectedType: 'empty',
          confidence: 1.0,
          originalLength: 0,
          blockCount: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
    
    if (!content.trim()) {
      return {
        success: true,
        blocks: [],
        metadata: {
          detectedType: 'empty',
          confidence: 1.0,
          originalLength: content.length,
          blockCount: 0,
          processingTime: Date.now() - startTime
        }
      };
    }

  // 1. Détection du type de contenu
  const detector = new ContentDetector();
  const detectionResult = detector.detect(content, options.detection);
  
  const contentType = options.contentType === 'auto' || !options.contentType 
    ? detectionResult.type 
    : options.contentType;

  // 2. Parsing selon le type détecté
  let parser;
  const parseOptions = {
    ...options,
    contentType,
    metadata: detectionResult.metadata
  };

  switch (contentType) {
    case 'markdown':
      parser = new MarkdownParser(parseOptions);
      break;
    case 'code':
      parser = new CodeParser(parseOptions);
      break;
    case 'table':
    case 'csv':
    case 'tsv':
      parser = new TableParser(parseOptions);
      break;
    case 'latex':
      parser = new LatexParser(parseOptions);
      break;
    case 'json':
      // Pour JSON, on utilise le parser code avec language JSON
      parser = new CodeParser({ ...parseOptions, defaultLanguage: 'json' });
      break;
    case 'html':
      // Pour HTML, on utilise le parser markdown après nettoyage
      parser = new MarkdownParser(parseOptions);
      break;
    case 'url':
      // Pour les URLs, on crée directement des blocs bookmark/media
      return parseUrls(content, options);
    case 'audio':
      parser = new AudioParser(parseOptions);
      break;
    default:
      // Texte simple
      parser = new MarkdownParser(parseOptions);
  }

  // 3. Conversion AST → Notion blocks
  const astNodes = parser.parse(content);
  const converter = new NotionConverter();
  
  // Default conversion options with preserveFormatting enabled
  const conversionOptions = {
    preserveFormatting: true,
    convertLinks: true,
    convertImages: true,
    convertTables: true,
    convertCode: true,
    ...options.conversion
  };
  
  let blocks = converter.convert(astNodes, conversionOptions);

  // 4. Formatage des blocs
  if (options.formatting) {
    const formatter = new BlockFormatter();
    blocks = formatter.format(blocks, options.formatting);
  }

  // 5. Validation
  let validationResult: ValidationResult | undefined;
  if (!options.skipValidation) {
    const validator = new NotionValidator();
    validationResult = validator.validate(blocks, options.validation);
  }

  // 6. Préparation du résultat
  const metadata = {
    detectedType: detectionResult.type,
    confidence: detectionResult.confidence,
    originalLength: content.length,
    blockCount: blocks.length,
    processingTime: Date.now() - startTime,
    contentType: contentType,
    detectionConfidence: detectionResult.confidence
  };

    return {
      success: true,
      blocks,
      validation: validationResult,
      metadata
    };
  } catch (error) {
    return {
      success: false,
      blocks: [],
      error: error instanceof Error ? error.message : 'Unknown parsing error',
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

/**
 * Parse spécialisé pour les URLs
 */
function parseUrls(content: string, _options: ParseContentOptions): ParseContentResult {
  const startTime = Date.now();
  const urls = content.trim().split(/\s+/).filter(line => {
    const urlPattern = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;
    return urlPattern.test(line) && line.includes('.');
  });

  const blocks: NotionBlock[] = urls.map(url => {
    // Déterminer le type de média
    if (isImageUrl(url)) {
      return {
        type: 'image',
        image: {
          type: 'external',
          external: { url },
          caption: []
        }
      };
    }

    if (isVideoUrl(url)) {
      return {
        type: 'video',
        video: {
          type: 'external',
          external: { url }
        }
      };
    }

    if (isAudioUrl(url)) {
      return {
        type: 'audio',
        audio: {
          type: 'external',
          external: { url },
          caption: []
        }
      };
    }

    if (url.toLowerCase().endsWith('.pdf')) {
      return {
        type: 'pdf',
        pdf: {
          type: 'external',
          external: { url },
          caption: []
        }
      };
    }

    // Default: bookmark
    return {
      type: 'bookmark',
      bookmark: {
        url,
        caption: []
      }
    };
  });

  const metadata = {
    detectedType: 'url',
    confidence: 1.0,
    originalLength: content.length,
    blockCount: blocks.length,
    processingTime: Date.now() - startTime,
    contentType: 'url',
    detectionConfidence: 1.0
  };

  return {
    success: true,
    blocks,
    metadata
  };
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url) ||
         /\.(mp4|avi|mov|wmv|webm|mkv)$/i.test(url);
}

function isAudioUrl(url: string): boolean {
  return /soundcloud\.com|spotify\.com|apple\.com\/music|music\.youtube\.com|bandcamp\.com/i.test(url) ||
         /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(url);
}

/**
 * Fonction utilitaire pour parser rapidement du markdown
 */
export function parseMarkdown(content: string, options: Omit<ParseContentOptions, 'contentType'> = {}): NotionBlock[] {
  const result = parseContent(content, { ...options, contentType: 'markdown' });
  return result.blocks;
}

/**
 * Fonction utilitaire pour parser du code
 */
export function parseCode(content: string, language?: string, options: Omit<ParseContentOptions, 'contentType'> = {}): NotionBlock[] {
  const result = parseContent(content, { 
    ...options, 
    contentType: 'code',
    metadata: { language }
  });
  return result.blocks;
}

/**
 * Fonction utilitaire pour parser des tableaux
 */
export function parseTable(content: string, format: 'csv' | 'tsv' | 'markdown' = 'csv', options: Omit<ParseContentOptions, 'contentType'> = {}): NotionBlock[] {
  const result = parseContent(content, { ...options, contentType: format });
  return result.blocks;
}

/**
 * Fonction utilitaire pour parser de l'audio
 */
export function parseAudio(content: string, options: Omit<ParseContentOptions, 'contentType'> = {}): NotionBlock[] {
  const result = parseContent(content, { ...options, contentType: 'audio' });
  return result.blocks;
}