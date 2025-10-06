import { NotionBlock } from '../types';
import { DetectionResult } from './content-detector';

export interface ParsingOptions {
  maxRichTextLength?: number;
  maxBlocksPerRequest?: number;
  maxEquationLength?: number;
  maxUrlLength?: number;
  contentType?: string;
  metadata?: Record<string, any>;
}

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

export class NotionMarkdownParser {
  private readonly limits: Required<ParsingOptions>;

  constructor() {
    this.limits = {
      maxRichTextLength: 2000,
      maxBlocksPerRequest: 100,
      maxEquationLength: 1000,
      maxUrlLength: 2000,
      contentType: 'text',
      metadata: {}
    };
  }

  parseContent(content: string, detection: DetectionResult, options: ParsingOptions = {}): NotionBlock[] {
    if (!content || !content.trim()) {
      return [];
    }

    const mergedOptions = { ...this.limits, ...options };

    try {
      let blocks: NotionBlock[] = [];

      switch (detection.type) {
        case 'markdown':
          blocks = this.markdownToNotionBlocks(content, mergedOptions);
          break;
        case 'code':
          blocks = this.codeToNotionBlocks(content, mergedOptions);
          break;
        case 'table':
          blocks = this.tableToNotionBlocks(content, mergedOptions);
          break;
        case 'json':
          blocks = this.jsonToNotionBlocks(content, mergedOptions);
          break;
        case 'url':
          blocks = this.urlToNotionBlocks(content, mergedOptions);
          break;
        default:
          blocks = this.textToNotionBlocks(content, mergedOptions);
      }

      if (blocks.length > mergedOptions.maxBlocksPerRequest) {
        console.warn(`⚠️ Limiting blocks from ${blocks.length} to ${mergedOptions.maxBlocksPerRequest}`);
        return blocks.slice(0, mergedOptions.maxBlocksPerRequest);
      }

      return blocks;
    } catch (error) {
      console.error('❌ Error parsing content:', error);
      return this.textToNotionBlocks(content, mergedOptions);
    }
  }

  private markdownToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    const blocks: NotionBlock[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('# ')) {
        blocks.push(this.createHeadingBlock(trimmed.substring(2), 1));
      } else if (trimmed.startsWith('## ')) {
        blocks.push(this.createHeadingBlock(trimmed.substring(3), 2));
      } else if (trimmed.startsWith('### ')) {
        blocks.push(this.createHeadingBlock(trimmed.substring(4), 3));
      } else if (trimmed.match(/^[\*\-\+]\s+/)) {
        blocks.push(this.createBulletListBlock(trimmed.replace(/^[\*\-\+]\s+/, ''), options));
      } else if (trimmed.match(/^\d+\.\s+/)) {
        blocks.push(this.createNumberedListBlock(trimmed.replace(/^\d+\.\s+/, ''), options));
      } else if (trimmed.startsWith('> ')) {
        blocks.push(this.createQuoteBlock(trimmed.substring(2), options));
      } else if (trimmed === '---') {
        blocks.push({ type: 'divider', divider: {} });
      } else {
        blocks.push(this.createParagraphBlock(trimmed, options));
      }
    }

    return blocks;
  }

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

  private codeToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    const language = options.metadata?.language || 'plain text';
    return [this.createCodeBlock(content, language)];
  }

  private urlToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    const url = content.trim();
    return [{
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: {
            content: url,
            link: { url }
          },
          plain_text: url,
          href: url
        }],
        color: 'default'
      }
    }];
  }

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

  private jsonToNotionBlocks(content: string, options: ParsingOptions = {}): NotionBlock[] {
    try {
      const formatted = JSON.stringify(JSON.parse(content), null, 2);
      return [this.createCodeBlock(formatted, 'json')];
    } catch {
      return [this.createCodeBlock(content, 'json')];
    }
  }

  private createParagraphBlock(text: string, options: ParsingOptions = {}): NotionBlock {
    return {
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: text },
          plain_text: text
        }],
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
    const MAX_CODE_LENGTH = 2000;
    const validLanguages = [
      'javascript', 'typescript', 'python', 'java', 'c', 'c++', 'c#',
      'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala',
      'html', 'css', 'scss', 'json', 'xml', 'yaml', 'markdown',
      'sql', 'shell', 'bash', 'powershell', 'plain text'
    ];

    const normalizedLang = (language || 'plain text').toLowerCase().trim();
    const finalLang = validLanguages.includes(normalizedLang) ? normalizedLang : 'plain text';

    if (code.length > MAX_CODE_LENGTH) {
      const truncatedCode = code.substring(0, MAX_CODE_LENGTH - 50) + '\n\n// ... (contenu tronqué)';
      return {
        type: 'code',
        code: {
          rich_text: [{
            type: 'text',
            text: { content: truncatedCode },
            plain_text: truncatedCode
          }],
          language: finalLang,
          caption: []
        }
      };
    }

    return {
      type: 'code',
      code: {
        rich_text: [{
          type: 'text',
          text: { content: code },
          plain_text: code
        }],
        language: finalLang,
        caption: []
      }
    };
  }

  private createBulletListBlock(text: string, options: ParsingOptions = {}): NotionBlock {
    return {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          type: 'text',
          text: { content: text },
          plain_text: text
        }],
        color: 'default'
      }
    };
  }

  private createNumberedListBlock(text: string, options: ParsingOptions = {}): NotionBlock {
    return {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{
          type: 'text',
          text: { content: text },
          plain_text: text
        }],
        color: 'default'
      }
    };
  }

  private createQuoteBlock(text: string, options: ParsingOptions = {}): NotionBlock {
    return {
      type: 'quote',
      quote: {
        rich_text: [{
          type: 'text',
          text: { content: text },
          plain_text: text
        }],
        color: 'default'
      }
    };
  }
}

export const notionMarkdownParser = new NotionMarkdownParser();