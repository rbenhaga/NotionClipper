// packages/notion-parser/src/index.ts

// Main parsing functions
export { parseContent } from './parseContent';

// Parsers
export { BaseParser } from './parsers/BaseParser';
export { MarkdownParser } from './parsers/MarkdownParser';

// Converters
export { NotionConverter } from './converters/NotionConverter';
export { RichTextBuilder } from './converters/RichTextBuilder';
export { HtmlToMarkdownConverter, htmlToMarkdownConverter } from './converters/HtmlToMarkdownConverter';

// File upload utilities
export { 
  FileUploadHandler,
  uploadFileAndParse,
  validateUploadOptions,
  detectOptimalIntegrationType
} from './utils/FileUploadHandler';

// Queue management
export { QueueManager, globalQueueManager } from './queue/QueueManager';

// History management
export { HistoryManager, globalHistoryManager } from './history/HistoryManager';

// Types
export type {
  ASTNode,
  NotionBlock,
  NotionColor,
  NotionRichText,
  ParseOptions,
  ConversionOptions,
  NotionFile,
  NotionImageBlock,
  NotionVideoBlock,
  NotionAudioBlock,
  NotionFileBlock,
  NotionEmbedBlock,
  NotionBookmarkBlock,
  NotionParagraphBlock,
  NotionHeadingBlock,
  NotionBulletedListItemBlock,
  NotionNumberedListItemBlock,
  NotionToDoBlock,
  NotionCodeBlock,
  NotionQuoteBlock,
  NotionCalloutBlock,
  NotionDividerBlock,
  NotionTableBlock,
  NotionTableRowBlock
} from './types';

export type {
  FileUploadResult,
  ExtendedFileUploadOptions,
  FileIntegrationType
} from './utils/FileUploadHandler';

export type {
  QueueItem,
  QueueStats,
  QueueManagerOptions
} from './queue/QueueManager';

export type {
  HistoryEntry,
  HistoryStats,
  HistoryFilter
} from './history/HistoryManager';

// Legacy exports for compatibility
import { parseContent as _parseContent } from './parseContent';
import { MarkdownParser as _MarkdownParser } from './parsers/MarkdownParser';
import { BaseParser as _BaseParser } from './parsers/BaseParser';

export const parseContentStrict = _parseContent;
export const parseMarkdown = (content: string) => new _MarkdownParser().parse(content);
export const parseCode = (content: string, language?: string) => {
  const parser = new _MarkdownParser();
  return parser.parse(`\`\`\`${language || 'text'}\n${content}\n\`\`\``);
};
export const parseTable = (content: string) => {
  const parser = new _MarkdownParser();
  return parser.parse(content);
};
export const parseAudio = (url: string) => {
  return [{
    type: 'audio',
    metadata: { url }
  }];
};

// Modern parser aliases
export const ModernParser = _MarkdownParser;
export const Lexer = _MarkdownParser; // Simplified for compatibility

// Specialized parsers (simplified implementations)
export class HeadingParser extends _BaseParser {
  parse(content: string) {
    return [this.createHeadingNode(content, 1)];
  }
}

export class ToggleHeadingParser extends _BaseParser {
  parse(content: string) {
    return [this.createToggleHeadingNode(content, 1)];
  }
}

export class BaseBlockParser extends _BaseParser {
  parse(content: string) {
    return [this.createTextNode(content)];
  }
}

export class ParagraphParser extends _BaseParser {
  parse(content: string) {
    return [this.createTextNode(content)];
  }
}

// Legacy types for compatibility
import type { ParseOptions, ConversionOptions, NotionBlock, ASTNode } from './types';

export type ParseContentOptions = ParseOptions & ConversionOptions;
export type ParseContentResult = {
  blocks: NotionBlock[];
  stats?: any;
};

export type Token = {
  type: string;
  value: string;
  position: Position;
};

export type TokenStream = Token[];

export type LexerRule = {
  pattern: RegExp;
  type: string;
};

export type LexerState = {
  position: number;
  line: number;
  column: number;
};

export type Position = {
  start: number;
  end: number;
  line: number;
  column: number;
};

export type TokenType = string;

export type BlockParser = {
  parse: (content: string) => ASTNode[];
};

export type LexerOptions = {
  rules?: LexerRule[];
};

export type LexerStats = {
  tokensProcessed: number;
  timeElapsed: number;
};

export type ParsingStats = {
  blocksCreated: number;
  timeElapsed: number;
};

// Legacy compatibility exports
import { RichTextBuilder as _RichTextBuilder } from './converters/RichTextBuilder';
export const RichTextConverter = _RichTextBuilder;

// Version and features
export const VERSION = '1.0.0';
export const ARCHITECTURE = 'modern';
export const FEATURES = {
  markdown: true,
  tables: true,
  code: true,
  images: true,
  videos: true,
  audio: true,
  files: true,
  queue: true,
  history: true
};