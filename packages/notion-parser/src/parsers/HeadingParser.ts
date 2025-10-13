import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';

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
    const content = this.parseInlineContent(token.content);

    return this.createNode(
      token.type.toLowerCase(), // 'heading_1', 'heading_2', 'heading_3'
      content,
      {
        level,
        isToggleable: false
      }
    );
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
    const headingToken = this.consumeToken(stream);
    if (!headingToken) return null;

    const level = headingToken.metadata?.level || 1;
    const content = this.parseInlineContent(headingToken.content);

    // Collecter les enfants (lignes suivantes commençant par >)
    const children: ASTNode[] = [];
    
    while (stream.hasNext()) {
      const nextToken = stream.peek();
      
      if (!nextToken || nextToken.type === 'EOF') {
        break;
      }
      
      // Si c'est une autre ligne de blockquote, la traiter comme enfant
      if (nextToken.type === 'QUOTE_BLOCK') {
        const childToken = stream.next()!;
        const childContent = this.parseInlineContent(childToken.content);
        
        if (childContent.trim()) {
          children.push(this.createNode('paragraph', childContent));
        }
      }
      // Si c'est un nouveau heading ou autre bloc, arrêter
      else if (this.isBlockStart(nextToken)) {
        break;
      }
      // Autres tokens inline, les ignorer pour l'instant
      else {
        stream.next();
      }
    }

    return this.createNode(
      `heading_${level}`,
      content,
      {
        level,
        isToggleable: true,
        hasChildren: children.length > 0
      }
    );
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