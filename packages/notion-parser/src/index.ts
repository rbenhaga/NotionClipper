/**
 * ✅ NOUVELLE ARCHITECTURE - Point d'entrée principal du parser Notion refactorisé
 */

// ✅ NOUVELLE ARCHITECTURE - Export main parsing functions
export { 
  parseContent,
  parseContentStrict,
  parseMarkdown,
  parseCode,
  parseTable,
  parseAudio
} from './parseContent';

// ✅ NOUVELLE ARCHITECTURE - Export modern parsers (only existing ones)
export { ModernParser } from './parsers/ModernParser';
export { Lexer } from './lexer/Lexer';
export { SimpleLexer } from './lexer/SimpleLexer';
export { RichTextBuilder } from './converters/RichTextBuilder';

// ✅ NOUVELLE ARCHITECTURE - Export specialized parsers (only existing ones)
export { HeadingParser, ToggleHeadingParser } from './parsers/HeadingParser';
export { BaseBlockParser, ParagraphParser } from './parsers/BlockParser';

// ✅ NOUVELLE ARCHITECTURE - Export lexer components
export { RuleEngine } from './lexer/rules/RuleEngine';
export { blockRules } from './lexer/rules/BlockRules';
export { inlineRules, mediaRules } from './lexer/rules/InlineRules';

// ✅ LEGACY - Export existing parsers for backward compatibility
export { MarkdownParser } from './parsers/MarkdownParser';
export { NotionConverter } from './converters/NotionConverter';
export { RichTextConverter } from './converters/RichTextConverter';
export { HtmlToMarkdownConverter } from './converters/HtmlToMarkdownConverter';

// ✅ Instance par défaut pour compatibilité
import { HtmlToMarkdownConverter } from './converters/HtmlToMarkdownConverter';
export const htmlToMarkdownConverter = new HtmlToMarkdownConverter();

// ✅ NOUVELLE ARCHITECTURE - Export types
export type {
  // New architecture types
  Token,
  TokenStream,
  LexerRule,
  LexerState,
  Position,
  TokenType
} from './types/tokens';

export type {
  BlockParser
} from './parsers/BlockParser';

export type {
  LexerOptions,
  LexerStats
} from './lexer/Lexer';

export type {
  ParsingStats
} from './parsers/ModernParser';

export type {
  ParseContentOptions,
  ParseContentResult
} from './parseContent';

// Legacy types for backward compatibility
export type {
  ASTNode
} from './types/ast';

export type {
  NotionBlock,
  NotionRichText,
  NotionColor
} from './types/notion';

// ✅ Version info
export const VERSION = '2.0.0-modern';
export const ARCHITECTURE = 'modern';

/**
 * ✅ MIGRATION: La nouvelle architecture est maintenant par défaut
 * Pour utiliser l'ancien parser: parseContent(content, { useModernParser: false })
 */

/**
 * ✅ Feature flags pour migration progressive
 */
export const FEATURES = {
  MODERN_PARSER: true,
  LEXER_TOKENIZATION: true,
  RICH_TEXT_BUILDER: true,
  CONTENT_VALIDATION: true,
  PATCH_1_SPACING: true,
  PATCH_2_QUOTES: true,
  PATCH_3_TOGGLE_HEADINGS: true
} as const;