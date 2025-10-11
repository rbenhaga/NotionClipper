/**
 * @notion-clipper/notion-parser
 * 
 * Package dédié au parsing et à la conversion de contenu vers les blocs Notion API
 */

// Main API
export { parseContent, parseMarkdown, parseCode, parseTable } from './parseContent';

// Core classes
export { ContentDetector } from './detectors/ContentDetector';
export { MarkdownDetector } from './detectors/MarkdownDetector';
export { BaseParser } from './parsers/BaseParser';
export { MarkdownParser } from './parsers/MarkdownParser';
export { CodeParser } from './parsers/CodeParser';
export { TableParser } from './parsers/TableParser';
export { LatexParser } from './parsers/LatexParser';
export { NotionConverter } from './converters/NotionConverter';
export { RichTextConverter } from './converters/RichTextConverter';
export { BlockFormatter } from './formatters/BlockFormatter';
export { NotionValidator } from './validators/NotionValidator';

// Types
export type {
  // AST types
  ASTNode,
  ContentNode,
  TextNode,
  HeadingNode,
  ListNode,
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
  TextFormatting,
  
  // Options types
  ParseOptions,
  DetectionOptions,
  ConversionOptions,
  ValidationOptions,
  
  // Notion types (re-exported)
  NotionBlock,
  NotionRichText,
  NotionColor
} from './types';

// Detector types
export type { ContentType, DetectionResult } from './detectors/ContentDetector';

// Validator types
export type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning 
} from './validators/NotionValidator';

// Formatter types
export type { FormattingOptions } from './formatters/BlockFormatter';

// Utilities
export * from './utils';