import { NotionBlock } from '../types/notion.types.js';
import { DetectionResult } from './content-detector.js';

/**
 * Parsing options for Notion blocks
 */
export interface ParsingOptions {
  maxRichTextLength?: number;
  maxBlocksPerRequest?: number;
  maxEquationLength?: number;
  maxUrlLength?: number;
  contentType?: string;
  metadata?: Record<string, any>;
}

/**
 * Rich text element for Notion
 */
export interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
  plain_text?: string;
  href?: string | null;
}

/**
 * Markdown patterns for parsing
 */
interface MarkdownPatterns {
  h1: RegExp;
  h2: RegExp;
  h3: RegExp;
  h4to6: RegExp;
  bold: RegExp;
  italic: RegExp;
  boldItalic: RegExp;
  strikethrough: RegExp;
  code: RegExp;
  bulletList: RegExp;
  numberedList: RegExp;
  checkbox: RegExp;
  quote: RegExp;
  toggle: RegExp;
  divider: RegExp;
  codeBlock: RegExp;
  link: RegExp;
  image: RegExp;
  inlineEquation: RegExp;
  blockEquation: RegExp;
  table: RegExp;
  tableDelimiter: RegExp;
  url: RegExp;
  email: RegExp;
}

/**
 * Content type handlers
 */
type ContentHandler = (content: string, options?: ParsingOptions) => NotionBlock[];

/**
 * Notion Markdown Parser with TypeScript support
 * Extracted from notionMarkdownParser.js with enhanced typing
 */
export class NotionMarkdownParser {
  private readonly patterns: MarkdownPatterns;
  private readonly limits: Required<ParsingOptions>;
  private readonly handlers: Record<string, ContentHandler>;

  constructor() {
    this.patterns = {
      h1: /^#\s+(.+)$/m,
      h2: /^##\s+(.+)$/m,
      h3: /^###\s+(.+)$/m,
      h4to6: /^#{4,6}\s+(.+)$/m,
      bold: /\*\*([^*]+)\*\*/g,
      italic: /(?<!\*)\*([^*]+)\*(?!\*)/g,
      boldItalic: /\*\*\*([^*]+)\*\*\*/g,
      strikethrough: /~([^~]+)~/g,
      code: /`([^`]+)`/g,
      bulletList: /^[\*\-\+]\s+(.+)$/m,
      numberedList: /^\d+\.\s+(.+)$/m,
      checkbox: /^-\s*\[([ x])\]\s+(.+)$/m,
      quote: /^"\s+(.+)$/m,
      toggle: /^>\s+(.+)$/m,
      divider: /^---+$/m,
      codeBlock: /```(\w*)\n([\s\S]*?)```/g,
      link: /\[([^\]]+)\]\(([^)]+)\)/g,
      image: /!\[([^\]]*)\]\(([^)]+)\)/g,
      inlineEquation: /\$\$([^$]+)\$\$/g,
      blockEquation: /^\$\$([\s\S]+?)\$\$$/m,
      table: /^\|(.+)\|$/m,
      tableDelimiter: /^\|[-:\s|]+\|$/m,
      url: /https?:\/\/[^\s<]+/g,
      email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    };

    this.limits = {
      maxRichTextLength: 2000,
      maxBlocksPerRequest: 100,
      maxEquationLength: 1000,
      maxUrlLength: 2000,
      contentType: 'text',
      metadata: {}
    };

    this.handlers = {
      markdown: this.markdownToNotionBlocks.bind(this),
      text: this.textToNotionBlocks.bind(this),
      code: this.codeToNotionBlocks.bind(this),
      url: this.urlToNotionBlocks.bind(this),
      image: this.imageToNotionBlocks.bind(this),
      table: this.tableToNotionBlocks.bind(this),
      csv: this.csvToNotionBlocks.bind(this),
      json: this.jsonToNotionBlocks.bind(this),
      html: this.htmlToNotionBlocks.bind(this),
      xml: this.xmlToNotionBlocks.bind(this)
    };
  }

  /**
   * Parse content to Notion blocks based on detected type
   */
  parseContent(content: string, detection: DetectionResult, options: ParsingOptions = {}): NotionBlock[] {
    if (!content || !content.trim()) {
      return [];
    }

    // Merge options with defaults
    const mergedOptions = { ...this.limits, ...options };

    // Get appropriate handler
    const handler = this.handlers[detection.type] || this.handlers.text;
    
    try {
      const blocks = handler(content, mergedOptions);
      
      // Limit number of blocks
      if (blocks.length > mergedOptions.maxBlocksPerRequest) {
        console.warn(`⚠️ Limiting blocks from ${blocks.length} to ${mergedOptions.maxBlocksPerRequest}`);
        return blocks.slice(0, mergedOptions.maxBlocksPerRequest);
      }
      
      return blocks;
    } catch (error) {
      console.error('❌ Error parsing content:', error);
      // Fallback to simple text block
      return this.textToNotionBlocks(content, mergedOptions);
    }
  }

  /**
   * Convert markdown to Notion blocks
   */
  private markdownToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    const blocks: NotionBlock[] = [];
    const lines = content.split('\n');
    let currentBlock: string[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          const codeContent = currentBlock.join('\n');
          if (codeContent.trim()) {
            blocks.push(this.createCodeBlock(codeContent, codeBlockLang));
          }
          currentBlock = [];
          inCodeBlock = false;
          codeBlockLang = '';
        } else {
          // Start code block
          if (currentBlock.length > 0) {
            blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
            currentBlock = [];
          }
          inCodeBlock = true;
          codeBlockLang = trimmedLine.substring(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        currentBlock.push(line);
        continue;
      }

      // Handle headers
      if (this.patterns.h1.test(trimmedLine)) {
        if (currentBlock.length > 0) {
          blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
          currentBlock = [];
        }
        const match = trimmedLine.match(this.patterns.h1);
        if (match) {
          blocks.push(this.createHeadingBlock(match[1], 1));
        }
        continue;
      }

      if (this.patterns.h2.test(trimmedLine)) {
        if (currentBlock.length > 0) {
          blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
          currentBlock = [];
        }
        const match = trimmedLine.match(this.patterns.h2);
        if (match) {
          blocks.push(this.createHeadingBlock(match[1], 2));
        }
        continue;
      }

      if (this.patterns.h3.test(trimmedLine)) {
        if (currentBlock.length > 0) {
          blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
          currentBlock = [];
        }
        const match = trimmedLine.match(this.patterns.h3);
        if (match) {
          blocks.push(this.createHeadingBlock(match[1], 3));
        }
        continue;
      }

      // Handle dividers
      if (this.patterns.divider.test(trimmedLine)) {
        if (currentBlock.length > 0) {
          blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
          currentBlock = [];
        }
        blocks.push(this.createDividerBlock());
        continue;
      }

      // Handle bullet lists
      if (this.patterns.bulletList.test(trimmedLine)) {
        if (currentBlock.length > 0) {
          blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
          currentBlock = [];
        }
        const match = trimmedLine.match(this.patterns.bulletList);
        if (match) {
          blocks.push(this.createBulletListBlock(match[1], options));
        }
        continue;
      }

      // Handle numbered lists
      if (this.patterns.numberedList.test(trimmedLine)) {
        if (currentBlock.length > 0) {
          blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
          currentBlock = [];
        }
        const match = trimmedLine.match(this.patterns.numberedList);
        if (match) {
          blocks.push(this.createNumberedListBlock(match[1], options));
        }
        continue;
      }

      // Handle checkboxes
      if (this.patterns.checkbox.test(trimmedLine)) {
        if (currentBlock.length > 0) {
          blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
          currentBlock = [];
        }
        const match = trimmedLine.match(this.patterns.checkbox);
        if (match) {
          const checked = match[1] === 'x';
          blocks.push(this.createCheckboxBlock(match[2], checked, options));
        }
        continue;
      }

      // Handle quotes
      if (trimmedLine.startsWith('>')) {
        if (currentBlock.length > 0) {
          blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
          currentBlock = [];
        }
        const quoteText = trimmedLine.substring(1).trim();
        blocks.push(this.createQuoteBlock(quoteText, options));
        continue;
      }

      // Regular line - add to current block
      currentBlock.push(line);
    }

    // Process remaining block
    if (currentBlock.length > 0) {
      blocks.push(...this.processTextBlock(currentBlock.join('\n'), options));
    }

    return blocks;
  }

  /**
   * Convert plain text to Notion blocks
   */
  private textToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    const blocks: NotionBlock[] = [];
    const paragraphs = content.split('\n\n').filter(p => p.trim());

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (trimmed) {
        blocks.push(this.createParagraphBlock(trimmed, options));
      }
    }

    return blocks.length > 0 ? blocks : [this.createParagraphBlock(content, options)];
  }

  /**
   * Convert code to Notion blocks
   */
  private codeToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    const language = options.metadata?.language || 'plain text';
    return [this.createCodeBlock(content, language)];
  }

  /**
   * Convert URL to Notion blocks
   */
  private urlToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    const url = content.trim();
    
    // Create a paragraph with the URL as a link
    const richText: NotionRichText[] = [{
      type: 'text',
      text: {
        content: url,
        link: { url }
      },
      plain_text: url,
      href: url
    }];

    return [{
      type: 'paragraph',
      paragraph: {
        rich_text: richText,
        color: 'default'
      }
    }];
  }

  /**
   * Convert image to Notion blocks
   */
  private imageToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    // This should be handled by the image service
    // For now, create a placeholder
    return [{
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: '[Image]' },
          plain_text: '[Image]'
        }],
        color: 'default'
      }
    }];
  }

  /**
   * Convert table to Notion blocks
   */
  private tableToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    const lines = content.split('\n').filter(line => line.trim());
    const blocks: NotionBlock[] = [];

    for (const line of lines) {
      const cells = line.split(/[|\t,]/).map(cell => cell.trim()).filter(cell => cell);
      if (cells.length > 0) {
        const richText = cells.map(cell => ({
          type: 'text' as const,
          text: { content: cell },
          plain_text: cell
        }));

        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: richText,
            color: 'default'
          }
        });
      }
    }

    return blocks;
  }

  /**
   * Convert CSV to Notion blocks
   */
  private csvToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    return this.tableToNotionBlocks(content, options);
  }

  /**
   * Convert JSON to Notion blocks
   */
  private jsonToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    try {
      const formatted = JSON.stringify(JSON.parse(content), null, 2);
      return [this.createCodeBlock(formatted, 'json')];
    } catch {
      return [this.createCodeBlock(content, 'json')];
    }
  }

  /**
   * Convert HTML to Notion blocks
   */
  private htmlToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    return [this.createCodeBlock(content, 'html')];
  }

  /**
   * Convert XML to Notion blocks
   */
  private xmlToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    return [this.createCodeBlock(content, 'xml')];
  }

  // Helper methods for creating blocks

  private createParagraphBlock(text: string, options: ParsingOptions = {}): NotionBlock {
    const richText = this.parseRichText(text, options);
    return {
      type: 'paragraph',
      paragraph: {
        rich_text: richText,
        color: 'default'
      }
    };
  }

  private createHeadingBlock(text: string, level: 1 | 2 | 3): NotionBlock {
    const type = `heading_${level}` as 'heading_1' | 'heading_2' | 'heading_3';
    return {
      type,
      [type]: {
        rich_text: [{
          type: 'text',
          text: { content: text },
          plain_text: text
        }],
        color: 'default',
        is_toggleable: false
      }
    };
  }

  private createCodeBlock(code: string, language: string = 'plain text'): NotionBlock {
    return {
      type: 'code',
      code: {
        rich_text: [{
          type: 'text',
          text: { content: code },
          plain_text: code
        }],
        language: language.toLowerCase(),
        caption: []
      }
    };
  }

  private createBulletListBlock(text: string, options: ParsingOptions = {}): NotionBlock {
    const richText = this.parseRichText(text, options);
    return {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: richText,
        color: 'default',
        children: []
      }
    };
  }

  private createNumberedListBlock(text: string, options: ParsingOptions = {}): NotionBlock {
    const richText = this.parseRichText(text, options);
    return {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: richText,
        color: 'default',
        children: []
      }
    };
  }

  private createCheckboxBlock(text: string, checked: boolean, options: ParsingOptions = {}): NotionBlock {
    const richText = this.parseRichText(text, options);
    return {
      type: 'to_do',
      to_do: {
        rich_text: richText,
        checked,
        color: 'default',
        children: []
      }
    };
  }

  private createQuoteBlock(text: string, options: ParsingOptions = {}): NotionBlock {
    const richText = this.parseRichText(text, options);
    return {
      type: 'quote',
      quote: {
        rich_text: richText,
        color: 'default',
        children: []
      }
    };
  }

  private createDividerBlock(): NotionBlock {
    return {
      type: 'divider',
      divider: {}
    };
  }

  private processTextBlock(text: string, options: ParsingOptions = {}): NotionBlock[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    
    return [this.createParagraphBlock(trimmed, options)];
  }

  private parseRichText(text: string, options: ParsingOptions = {}): NotionRichText[] {
    const richText: NotionRichText[] = [];
    let currentText = text;
    let currentIndex = 0;

    // Simple implementation - can be enhanced
    const segments = this.splitTextWithFormatting(currentText);
    
    for (const segment of segments) {
      if (segment.text.trim()) {
        richText.push({
          type: 'text',
          text: { content: segment.text },
          annotations: segment.annotations,
          plain_text: segment.text
        });
      }
    }

    return richText.length > 0 ? richText : [{
      type: 'text',
      text: { content: text },
      plain_text: text
    }];
  }

  private splitTextWithFormatting(text: string): Array<{ text: string; annotations: any }> {
    // Simplified implementation - can be enhanced with proper markdown parsing
    return [{
      text,
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default'
      }
    }];
  }
}

// Export singleton instance
export const notionMarkdownParser = new NotionMarkdownParser();
