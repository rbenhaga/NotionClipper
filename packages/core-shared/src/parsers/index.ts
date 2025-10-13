/**
 * Parser exports - Re-export from @notion-clipper/notion-parser
 * Tous les imports de parsing doivent passer par core-shared
 */

// ✅ NOUVELLE ARCHITECTURE - Main parsing functions
export {
  parseContent,
  parseContentStrict,
  parseMarkdown,
  parseCode,
  parseTable,
  parseAudio
} from '@notion-clipper/notion-parser';

// ✅ NOUVELLE ARCHITECTURE - Modern parsers
export {
  ModernParser,
  Lexer,
  RichTextBuilder
} from '@notion-clipper/notion-parser';

// ✅ NOUVELLE ARCHITECTURE - Specialized parsers (only existing ones)
export {
  HeadingParser,
  ToggleHeadingParser,
  BaseBlockParser,
  ParagraphParser
} from '@notion-clipper/notion-parser';

// ✅ NOUVELLE ARCHITECTURE - Types (only existing ones)
export type {
  ParseContentOptions,
  ParseContentResult,
  Token,
  TokenStream,
  LexerRule,
  LexerState,
  Position,
  TokenType,
  BlockParser,
  LexerOptions,
  LexerStats,
  ParsingStats
} from '@notion-clipper/notion-parser';

// ✅ LEGACY - Types pour compatibilité (avec alias pour éviter conflits)
export type {
  ASTNode,
  NotionBlock as ParserNotionBlock,
  NotionRichText,
  NotionColor
} from '@notion-clipper/notion-parser';

// ✅ LEGACY - Classes conservées pour compatibilité
export {
  MarkdownParser,
  NotionConverter,
  RichTextConverter
} from '@notion-clipper/notion-parser';

// ✅ Version et features
export {
  VERSION,
  ARCHITECTURE,
  FEATURES
} from '@notion-clipper/notion-parser';