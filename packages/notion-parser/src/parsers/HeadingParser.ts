import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';
import { RichTextBuilder } from '../converters/RichTextBuilder';

/**
 * Parser pour les headings (h1, h2, h3)
 */
export class HeadingParser extends BaseBlockParser {
  priority = 80;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'HEADING_1' || 
           token?.type === 'HEADING_2' || 
           token?.type === 'HEADING_3';
  }

  parse(stream: TokenStream): ASTNode | null {
    const token = this.consumeToken(stream);
    if (!token) return null;

    const level = token.metadata?.level || 1;
    const content = token.content || '';

    // ✅ IMPORTANT: Parser le rich text inline avec RichTextBuilder
    const richText = RichTextBuilder.fromMarkdown(content);

    return {
      type: `heading_${level}`,
      content: content,
      metadata: {
        level,
        isToggleable: false,
        // Stocker le rich text parsé pour le converter
        richText: richText
      },
      children: []
    };
  }
}

/**
 * Parser pour les toggle headings (> # Heading)
 */
export class ToggleHeadingParser extends BaseBlockParser {
  priority = 95;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'TOGGLE_HEADING';
  }

  parse(stream: TokenStream): ASTNode | null {
    const token = this.consumeToken(stream);
    if (!token) return null;

    const level = token.metadata?.level || 1;
    const content = token.content || '';

    // ✅ FIX: Parser le rich text du contenu
    const richText = RichTextBuilder.fromMarkdown(content);

    return this.createNode('heading', content, {
      level,
      isToggleable: true,
      richText
    });
  }

  private isBlockStart(token: any): boolean {
    const blockStarters = [
      'HEADING_1', 'HEADING_2', 'HEADING_3',
      'TOGGLE_HEADING', 'CALLOUT', 'CODE_BLOCK',
      'LIST_ITEM_BULLETED', 'LIST_ITEM_NUMBERED', 'LIST_ITEM_TODO',
      'TABLE_ROW', 'DIVIDER'
    ];
    
    return blockStarters.includes(token.type);
  }
}