/**
 * @notion-clipper/notion-parser
 * 
 * Package dédié au parsing et à la conversion de contenu vers les blocs Notion API
 */

// Main API
export { parseContent, parseMarkdown, parseCode, parseTable, parseAudio } from './parseContent.js';

// Core classes
export { ContentDetector } from './detectors/ContentDetector.js';
export { MarkdownDetector } from './detectors/MarkdownDetector.js';
export { BaseParser } from './parsers/BaseParser.js';
export { MarkdownParser } from './parsers/MarkdownParser.js';
export { CodeParser } from './parsers/CodeParser.js';
export { TableParser } from './parsers/TableParser.js';
export { LatexParser } from './parsers/LatexParser.js';
export { AudioParser } from './parsers/AudioParser.js';
export { NotionConverter } from './converters/NotionConverter.js';
export { RichTextConverter } from './converters/RichTextConverter.js';
export { BlockFormatter } from './formatters/BlockFormatter.js';
export { NotionValidator } from './validators/NotionValidator.js';

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
  UploadAndParseOptions,
  SecurityOptions,
  
  // Notion types (re-exported)
  NotionBlock,
  NotionRichText,
  NotionColor,
  AudioBlock,
  TableBlock,
  TableRowBlock,
  HeadingBlock,
  ImageBlock,
  VideoBlock,
  FileBlock,
  PdfBlock
} from './types/index.js';

// Detector types
export type { ContentType, DetectionResult } from './detectors/ContentDetector.js';

// Validator types
export type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning 
} from './validators/NotionValidator.js';

// Formatter types
export type { FormattingOptions } from './formatters/BlockFormatter.js';

// File upload functionality
export { FileUploadHandler, uploadFileAndParse, type FileUploadResult } from './utils/FileUploadHandler.js';
export type { FileUploadOptions } from './types/options.js';

// Utilities
export * from './utils/index.js';