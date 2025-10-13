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

    // ✅ Parser le rich text inline
    const richText = RichTextBuilder.fromMarkdown(content);

    const node: ASTNode = {
      type: 'list_item',
      content: content,
      metadata: {
        listType,
        indentLevel,
        checked: listType === 'todo' ? checked : undefined,
        richText: richText
      },
      children: []
    };

    // ✅ GÉRER LES ENFANTS IMBRIQUÉS
    // Si le prochain token est une liste avec indentation supérieure, c'est un enfant
    const nextToken = stream.peek();
    if (nextToken && 
        (nextToken.type === 'LIST_ITEM_BULLETED' ||
         nextToken.type === 'LIST_ITEM_NUMBERED' ||
         nextToken.type === 'LIST_ITEM_TODO')) {
      
      const nextIndent = nextToken.metadata?.indentLevel || 0;
      
      if (nextIndent > indentLevel) {
        // C'est un enfant - le parser récursivement
        const childParser = new ListParser();
        const child = childParser.parse(stream);
        if (child) {
          node.children = node.children || [];
          node.children.push(child);
        }
      }
    }

    return node;
  }

  private isListToken(token: any): boolean {
    return token.type === 'LIST_ITEM_BULLETED' || 
           token.type === 'LIST_ITEM_NUMBERED' || 
           token.type === 'LIST_ITEM_TODO';
  }

  private parseListItem(token: any): { node: ASTNode; level: number; type: string } | null {
    const level = token.metadata?.indentLevel || 0;
    const listType = token.metadata?.listType || 'bulleted';
    const content = this.parseInlineContent(token.content);
    
    let nodeType: string;
    const metadata: Record<string, any> = {
      hasChildren: false,
      listType
    };

    switch (listType) {
      case 'todo':
        nodeType = 'to_do';
        metadata.checked = token.metadata?.checked || false;
        break;
      case 'numbered':
        nodeType = 'numbered_list_item';
        break;
      case 'bulleted':
      default:
        nodeType = 'bulleted_list_item';
        break;
    }

    const node = this.createNode(nodeType, content, metadata);

    return {
      node,
      level,
      type: listType
    };
  }

  /**
   * ✅ PATCH #7: Construction correcte de l'arbre hiérarchique
   */
  private buildListTree(items: Array<{ node: ASTNode; level: number; type: string }>): ASTNode[] {
    if (items.length === 0) return [];

    const result: ASTNode[] = [];
    const stack: Array<{ node: ASTNode; level: number }> = [];

    for (const item of items) {
      // Pop items de niveau supérieur ou égal
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        const popped = stack.pop()!;
        
        if (popped.node.children && popped.node.children.length > 0) {
          popped.node.metadata!.hasChildren = true;
        }
        
        if (stack.length > 0) {
          if (!stack[stack.length - 1].node.children) {
            stack[stack.length - 1].node.children = [];
          }
          stack[stack.length - 1].node.children!.push(popped.node);
        } else {
          result.push(popped.node);
        }
      }

      // Push l'item courant
      stack.push({
        node: item.node,
        level: item.level
      });
    }

    // Pop les items restants
    while (stack.length > 0) {
      const popped = stack.pop()!;
      
      if (popped.node.children && popped.node.children.length > 0) {
        popped.node.metadata!.hasChildren = true;
      }
      
      if (stack.length > 0) {
        if (!stack[stack.length - 1].node.children) {
          stack[stack.length - 1].node.children = [];
        }
        stack[stack.length - 1].node.children!.push(popped.node);
      } else {
        result.push(popped.node);
      }
    }

    return result;
  }
}