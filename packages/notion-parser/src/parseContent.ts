/**
 * ✅ NOUVELLE ARCHITECTURE - API principale pour le parsing de contenu
 */
import { ModernParser } from './parsers/ModernParser';
import { NotionConverter } from './converters/NotionConverter';
import { ContentValidator } from './validators/ContentValidator';
import type { NotionBlock } from './types/notion';

export interface ParseContentOptions {
  // ✅ NOUVEAU: Option pour utiliser le parser moderne (par défaut)
  useModernParser?: boolean;

  // Options de conversion
  conversion?: {
    preserveFormatting?: boolean;
    convertLinks?: boolean;
    convertImages?: boolean;
    convertTables?: boolean;
    convertCode?: boolean;
  };

  // Options de validation
  validation?: {
    skipValidation?: boolean;
    strictMode?: boolean;
  };

  // Limite de longueur
  maxLength?: number;

  // Type de contenu forcé
  contentType?: string;
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
 * ✅ NOUVELLE ARCHITECTURE - Parse le contenu et le convertit en blocs Notion API
 */
export function parseContent(
  content: string,
  options: ParseContentOptions = {}
): ParseContentResult {
  // ✅ NOUVELLE ARCHITECTURE PAR DÉFAUT
  // L'ancienne logique n'est plus utilisée que comme fallback explicite
  if (options.useModernParser !== false) {
    return parseContentWithModernParser(content, options);
  }

  // Fallback vers l'ancienne implémentation uniquement si explicitement demandé
  console.warn('[parseContent] Using legacy parser. Consider migrating to modern parser.');
  return parseContentWithFallback(content, options);
}

/**
 * ✅ NOUVELLE ARCHITECTURE - Parser avec l'architecture refactorisée
 */
function parseContentWithModernParser(
  content: string,
  options: ParseContentOptions = {}
): ParseContentResult {
  const startTime = Date.now();

  try {
    // Validation d'entrée
    if (typeof content !== 'string') {
      return {
        success: false,
        error: 'Content must be a string',
        blocks: []
      };
    }

    // Contenu vide est valide - retourner succès avec blocs vides
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

    // Limiter la taille du contenu
    const maxLength = options.maxLength || 50000;
    const truncatedContent = content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;

    // ✅ ÉTAPE 1: Parser le contenu en AST avec la nouvelle architecture
    const modernParser = new ModernParser();
    const ast = modernParser.parse(truncatedContent);

    console.log(`[parseContent] Generated ${ast.length} AST nodes`);

    // ✅ ÉTAPE 2: Valider et sanitizer l'AST si demandé
    let validatedAst = ast;
    if (!options.validation?.skipValidation) {
      validatedAst = ast.map(node => {
        const validation = ContentValidator.validate(node);

        if (!validation.valid && options.validation?.strictMode) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          console.warn('[parseContent] Validation warnings:', validation.warnings);
        }

        return ContentValidator.sanitize(node);
      });
    }

    // ✅ ÉTAPE 3: Convertir l'AST en blocs Notion
    const converter = new NotionConverter();
    const blocks = converter.convert(validatedAst, {
      preserveFormatting: options.conversion?.preserveFormatting ?? true,
      convertLinks: options.conversion?.convertLinks ?? true,
      convertImages: options.conversion?.convertImages ?? true,
      convertTables: options.conversion?.convertTables ?? true,
      convertCode: options.conversion?.convertCode ?? true
    });

    console.log(`[parseContent] Converted to ${blocks.length} Notion blocks`);

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
      error: error instanceof Error ? error.message : 'Modern parser error',
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
 * ✅ LEGACY FALLBACK - Utilise l'ancien MarkdownParser uniquement si explicitement demandé
 * @deprecated Utilisez la nouvelle architecture par défaut
 */
function parseContentWithFallback(
  content: string,
  options: ParseContentOptions = {}
): ParseContentResult {
  const startTime = Date.now();

  try {
    // Utiliser l'ancien parser directement (plus de fallback automatique)
    const { MarkdownParser } = require('./parsers/MarkdownParser');
    const parser = new MarkdownParser();
    const ast = parser.parse(content);

    const converter = new NotionConverter();
    const blocks = converter.convert(Array.isArray(ast) ? ast : [ast]);

    return {
      success: true,
      blocks,
      metadata: {
        detectedType: 'markdown',
        confidence: 1.0,
        originalLength: content.length,
        blockCount: blocks.length,
        processingTime: Date.now() - startTime,
        usedFallback: true
      }
    };
  } catch (error) {
    return {
      success: false,
      blocks: [],
      error: error instanceof Error ? error.message : 'All parsers failed',
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
 * ✅ NOUVELLE API - Parse avec validation stricte
 */
export function parseContentStrict(
  content: string,
  options: ParseContentOptions = {}
): ParseContentResult {
  return parseContent(content, {
    ...options,
    validation: {
      ...options.validation,
      strictMode: true
    }
  });
}

/**
 * ✅ UTILITAIRES - Fonctions de parsing spécialisées
 */
export function parseMarkdown(
  content: string,
  options: Omit<ParseContentOptions, 'contentType'> = {}
): NotionBlock[] {
  const result = parseContent(content, { ...options, contentType: 'markdown' });
  return result.blocks;
}

export function parseCode(
  content: string,
  language?: string,
  options: Omit<ParseContentOptions, 'contentType'> = {}
): NotionBlock[] {
  const result = parseContent(content, { ...options, contentType: 'code' });
  return result.blocks;
}

export function parseTable(
  content: string,
  format: 'csv' | 'tsv' | 'markdown' = 'csv',
  options: Omit<ParseContentOptions, 'contentType'> = {}
): NotionBlock[] {
  const result = parseContent(content, { ...options, contentType: format });
  return result.blocks;
}

export function parseAudio(
  content: string,
  options: Omit<ParseContentOptions, 'contentType'> = {}
): NotionBlock[] {
  const result = parseContent(content, { ...options, contentType: 'audio' });
  return result.blocks;
}

// ✅ LEGACY SUPPORT - Alias pour compatibilité
export { parseContent as parseContentWithFallback };