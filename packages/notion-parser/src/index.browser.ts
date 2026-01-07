/**
 * Browser-only exports for @notion-clipper/notion-parser
 * 
 * This file is resolved via package.json "exports" condition "browser"
 * Zero Node.js dependencies, zero require() calls.
 */

// Browser-safe parseContent (no legacy fallback)
export { parseContent, parseContentStrict, parseMarkdown, parseCode, parseTable, parseAudio } from './parseContent.browser';
export type { ParseContentOptions, ParseContentResult } from './parseContent.browser';

// Browser-safe HtmlToMarkdownConverter (DOMParser only)
export { HtmlToMarkdownConverter, htmlToMarkdownConverter } from './converters/HtmlToMarkdownConverter.browser';
export type { ConversionOptions } from './converters/HtmlToMarkdownConverter.browser';

// Shared converters (no Node.js deps)
export { NotionConverter } from './converters/NotionConverter';
export { RichTextBuilder } from './converters/RichTextBuilder';
export { PrettyPrinter, prettyPrinter, printToMarkdown } from './converters/PrettyPrinter';
export type { PrettyPrinterOptions } from './converters/PrettyPrinter';



// ClipperDoc types and helpers
export type {
  ClipperDocument,
  ClipperDocumentMetadata,
  ClipperBlock,
  ClipperBlockType,
  ClipperInlineContent,
  ClipperText,
  ClipperLink,
  ClipperTextStyles,
} from './types/clipper';

export {
  createClipperDocument,
  createClipperBlock,
  generateClipperId,
  computeBlockHash,
} from './types/clipper';

// ClipperDoc converters
export {
  notionToClipper,
  NotionToClipperConverter,
} from './converters/NotionToClipper';



export { 
  clipperToNotion, 
  clipperToNotionWithReport,
} from './converters/clipperToNotion';

// Validators (no Node.js deps)
export { ContentValidator } from './validators/ContentValidator';

// Parsers (shared, no Node.js deps)
export { ModernParser } from './parsers/ModernParser';
export { BaseParser } from './parsers/BaseParser';

// Types
export type {
  ASTNode,
  NotionBlock,
  NotionColor,
  NotionRichText,
  ParseOptions,
} from './types';

// Version
export const VERSION = '1.0.0';
export const ARCHITECTURE = 'modern-browser';
