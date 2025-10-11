import type { ASTNode, ParseOptions } from '../types';

export abstract class BaseParser {
  protected options: ParseOptions;

  constructor(options: ParseOptions = {}) {
    this.options = {
      maxBlocks: 100,
      maxRichTextLength: 2000,
      maxCodeLength: 2000,
      defaultLanguage: 'plain text',
      ...options
    };
  }

  abstract parse(content: string): ASTNode[];

  protected createTextNode(content: string, formatting?: any): ASTNode {
    return {
      type: 'text',
      content,
      metadata: { formatting }
    };
  }

  protected createHeadingNode(content: string, level: 1 | 2 | 3, isToggleable = false): ASTNode {
    return {
      type: 'heading',
      content,
      metadata: { level, isToggleable }
    };
  }

  protected createListNode(items: ASTNode[], listType: 'bulleted' | 'numbered' | 'todo'): ASTNode {
    return {
      type: 'list',
      children: items,
      metadata: { listType }
    };
  }

  protected createListItemNode(content: string, checked?: boolean): ASTNode {
    return {
      type: 'list_item',
      content,
      metadata: { checked }
    };
  }

  protected createCodeNode(content: string, language?: string, isBlock = false): ASTNode {
    return {
      type: 'code',
      content,
      metadata: { 
        language: language || this.options.defaultLanguage,
        isBlock 
      }
    };
  }

  protected createTableNode(headers: string[], rows: string[][]): ASTNode {
    return {
      type: 'table',
      metadata: { 
        headers, 
        rows,
        hasColumnHeader: true,
        hasRowHeader: false
      }
    };
  }

  protected createCalloutNode(content: string, icon?: string, color?: string): ASTNode {
    return {
      type: 'callout',
      content,
      metadata: { icon, color }
    };
  }

  protected createMediaNode(
    type: 'image' | 'video' | 'audio' | 'file',
    url: string,
    caption?: string,
    alt?: string
  ): ASTNode {
    return {
      type,
      metadata: { url, caption, alt }
    };
  }

  protected createEquationNode(expression: string, isBlock = false): ASTNode {
    return {
      type: 'equation',
      content: expression,
      metadata: { isBlock }
    };
  }

  protected createQuoteNode(content: string): ASTNode {
    return {
      type: 'quote',
      content
    };
  }

  protected createDividerNode(): ASTNode {
    return {
      type: 'divider'
    };
  }

  protected createToggleNode(content: string, children: ASTNode[] = []): ASTNode {
    return {
      type: 'toggle',
      content,
      children
    };
  }

  protected createBookmarkNode(url: string, title?: string, description?: string): ASTNode {
    return {
      type: 'bookmark',
      metadata: { url, title, description }
    };
  }

  protected truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    let truncated = content.substring(0, maxLength - 20);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      truncated = truncated.substring(0, lastSpace);
    }
    
    return truncated + '... [tronqué]';
  }

  protected isValidUrl(text: string): boolean {
    try {
      const urlPattern = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;
      return urlPattern.test(text) && text.includes('.');
    } catch {
      return false;
    }
  }
}