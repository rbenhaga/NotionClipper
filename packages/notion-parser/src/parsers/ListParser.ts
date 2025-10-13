import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';
import { RichTextBuilder } from '../converters/RichTextBuilder';

/**
 * Parser pour les listes (bulleted, numbered, todo)
 * ✅ Gestion correcte des imbrications selon PATCH #7
 */
export class ListParser extends BaseBlockParser {
  priority = 75;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'LIST_ITEM_BULLETED' || 
           token?.type === 'LIST_ITEM_NUMBERED' || 
           token?.type === 'LIST_ITEM_TODO';
  }

  parse(stream: TokenStream): ASTNode | null {
    const token = this.consumeToken(stream);
    if (!token) return null;

    const listType = token.metadata?.listType || 'bulleted';
    const indentLevel = token.metadata?.indentLevel || 0;
    const content = token.content || '';
    const checked = token.metadata?.checked;

    // Parser le rich text
    const richText = RichTextBuilder.fromMarkdown(content);

    // ✅ FIX: Retourner directement un list_item individuel
    // Le ModernParser se chargera de grouper les items consécutifs
    return this.createNode('list_item', content, {
      listType,
      indentLevel,
      checked,
      richText
    });
  }



  private isListToken(type: string): boolean {
    return type === 'LIST_ITEM_BULLETED' ||
           type === 'LIST_ITEM_NUMBERED' ||
           type === 'LIST_ITEM_TODO';
  }

  private getListType(tokenType: string): 'bulleted' | 'numbered' | 'todo' {
    if (tokenType === 'LIST_ITEM_NUMBERED') return 'numbered';
    if (tokenType === 'LIST_ITEM_TODO') return 'todo';
    return 'bulleted';
  }


}