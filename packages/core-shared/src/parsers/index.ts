/**
 * Parser exports - Re-export from @notion-clipper/notion-parser
 * Tous les imports de parsing doivent passer par core-shared
 */

// ✅ Main parsing functions
export {
  parseContent,
  parseMarkdown,
  parseCode,
  parseTable
} from '@notion-clipper/notion-parser';

// ✅ Types disponibles (éviter les conflits avec core-shared/types)
export type {
  ParseOptions,
  ContentType,
  DetectionResult,
  ValidationResult,
  ValidationError,
  DetectionOptions,
  ConversionOptions,
  ValidationOptions,
  FormattingOptions,
  // AST types
  ASTNode,
  ContentNode,
  TextNode,
  HeadingNode,
  ListItemNode,
  CodeNode,
  TableNode,
  CalloutNode,
  MediaNode,
  EquationNode,
  QuoteNode,
  DividerNode,
  ToggleNode,
  BookmarkNode,
  TextFormatting
} from '@notion-clipper/notion-parser';

// ✅ Notion types avec alias pour éviter conflits
export type {
  NotionBlock as ParserNotionBlock,
  NotionRichText,
  NotionColor
} from '@notion-clipper/notion-parser';

// ✅ Classes
export {
  ContentDetector,
  MarkdownDetector,
  BaseParser,
  MarkdownParser,
  CodeParser,
  TableParser,
  LatexParser,
  NotionConverter,
  RichTextConverter,
  BlockFormatter,
  NotionValidator
} from '@notion-clipper/notion-parser';