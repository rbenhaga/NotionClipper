import type { Token, TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';

/**
 * Interface pour tous les parsers de blocs
 */
export interface BlockParser {
  canParse(stream: TokenStream): boolean;
  parse(stream: TokenStream): ASTNode | null;
  priority: number;
}

/**
 * Parser de base pour les éléments de bloc
 */
export abstract class BaseBlockParser implements BlockParser {
  abstract priority: number;
  abstract canParse(stream: TokenStream): boolean;
  abstract parse(stream: TokenStream): ASTNode | null;

  /**
   * Utilitaire pour consommer un token spécifique
   */
  protected consumeToken(stream: TokenStream, expectedType?: string): Token | null {
    const token = stream.peek();
    if (!token) return null;
    
    if (expectedType && token.type !== expectedType) {
      return null;
    }
    
    return stream.next();
  }

  /**
   * Utilitaire pour consommer tous les tokens jusqu'à un type spécifique
   */
  protected consumeUntil(stream: TokenStream, stopType: string): Token[] {
    const tokens: Token[] = [];
    
    while (stream.hasNext()) {
      const token = stream.peek();
      if (!token || token.type === stopType) {
        break;
      }
      
      tokens.push(stream.next()!);
    }
    
    return tokens;
  }

  /**
   * Utilitaire pour créer un nœud AST de base
   */
  protected createNode(
    type: string,
    content?: string,
    metadata?: Record<string, any>
  ): ASTNode {
    return {
      type,
      content: content || '',
      metadata: metadata || {},
      children: []
    };
  }

  /**
   * Utilitaire pour parser le contenu inline d'un token
   */
  protected parseInlineContent(content: string): string {
    // Pour l'instant, retourner tel quel
    // Sera amélioré avec le RichTextBuilder
    return content;
  }
}

/**
 * Parser générique pour les paragraphes
 */
export class ParagraphParser extends BaseBlockParser {
  priority = 1; // Priorité la plus basse (fallback)

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'TEXT' || token?.type === 'PARAGRAPH';
  }

  parse(stream: TokenStream): ASTNode | null {
    const token = this.consumeToken(stream);
    if (!token) return null;
    
    const content = token.content || '';
    
    // ✅ Parser le rich text inline avec RichTextBuilder
    const { RichTextBuilder } = require('../converters/RichTextBuilder');
    const richText = RichTextBuilder.fromMarkdown(content);
    
    return {
      type: 'paragraph',
      content: content,
      metadata: {
        richText: richText
      },
      children: []
    };
  }

  private isBlockToken(token: Token): boolean {
    const blockTypes = [
      'HEADING_1', 'HEADING_2', 'HEADING_3',
      'CODE_BLOCK', 'QUOTE_BLOCK', 'TOGGLE_HEADING',
      'CALLOUT', 'LIST_ITEM_BULLETED', 'LIST_ITEM_NUMBERED',
      'LIST_ITEM_TODO', 'TABLE_ROW', 'DIVIDER'
    ];
    
    return blockTypes.includes(token.type);
  }
}