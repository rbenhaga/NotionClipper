/**
 * API principale pour le parsing de contenu
 */

import { ContentDetector } from './detectors/ContentDetector';
import { MarkdownParser } from './parsers/MarkdownParser';
import { CodeParser } from './parsers/CodeParser';
import { TableParser } from './parsers/TableParser';
// import { LatexParser } from './parsers/LatexParser';
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
}

export interface ParseContentResult {
  blocks: NotionBlock[];
  validation?: ValidationResult;
  metadata?: {
    detectedType: string;
    confidence: number;
    originalLength: number;
    blockCount: number;
    processingTime: number;
  };
}

/**
 * Parse le contenu et le convertit en blocs Notion API
 */
export function parseContent(
  content: string, 
  options: ParseContentOptions = {}
): NotionBlock[] | ParseContentResult {
  const startTime = Date.now();
  
  if (!content?.trim()) {
    const emptyResult = {
      blocks: [],
      metadata: {
        detectedType: 'empty',
        confidence: 1.0,
        originalLength: 0,
        blockCount: 0,
        processingTime: Date.now() - startTime
      }
    };
    
    return options.includeValidation ? emptyResult : [];
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
    case 'html':
      // Pour HTML, on utilise le parser markdown après nettoyage
      parser = new MarkdownParser(parseOptions);
      break;
    case 'url':
      // Pour les URLs, on crée directement des blocs bookmark/media
      return parseUrls(content, options);
    default:
      // Texte simple
      parser = new MarkdownParser(parseOptions);
  }

  // 3. Conversion AST → Notion blocks
  const astNodes = parser.parse(content);
  const converter = new NotionConverter();
  let blocks = converter.convert(astNodes, options.conversion);

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
    processingTime: Date.now() - startTime
  };

  if (options.includeValidation) {
    return {
      blocks,
      validation: validationResult,
      metadata
    };
  }

  return blocks;
}

/**
 * Parse spécialisé pour les URLs
 */
function parseUrls(content: string, options: ParseContentOptions): NotionBlock[] | ParseContentResult {
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
    processingTime: Date.now() - startTime
  };

  if (options.includeValidation) {
    return { blocks, metadata };
  }

  return blocks;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url) ||
         /\.(mp4|avi|mov|wmv|webm|mkv)$/i.test(url);
}

/**
 * Fonction utilitaire pour parser rapidement du markdown
 */
export function parseMarkdown(content: string, options: Omit<ParseContentOptions, 'contentType'> = {}): NotionBlock[] {
  return parseContent(content, { ...options, contentType: 'markdown' }) as NotionBlock[];
}

/**
 * Fonction utilitaire pour parser du code
 */
export function parseCode(content: string, language?: string, options: Omit<ParseContentOptions, 'contentType'> = {}): NotionBlock[] {
  return parseContent(content, { 
    ...options, 
    contentType: 'code',
    metadata: { language }
  }) as NotionBlock[];
}

/**
 * Fonction utilitaire pour parser des tableaux
 */
export function parseTable(content: string, format: 'csv' | 'tsv' | 'markdown' = 'csv', options: Omit<ParseContentOptions, 'contentType'> = {}): NotionBlock[] {
  return parseContent(content, { ...options, contentType: format }) as NotionBlock[];
}