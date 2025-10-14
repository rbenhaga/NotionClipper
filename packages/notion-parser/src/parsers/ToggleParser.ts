import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';
import { RichTextBuilder } from '../converters/RichTextBuilder';

/**
 * Parser pour les toggles simples
 */
export class ToggleParser extends BaseBlockParser {
  priority = 75;

  canParse(stream: TokenStream): boolean {
    // ToggleParser n'est plus utilisé - les toggles sont gérés par les toggle headings et toggle lists
    return false;
  }

  parse(stream: TokenStream): ASTNode | null {
    const toggleToken = this.consumeToken(stream);
    if (!toggleToken) return null;

    const content = toggleToken.content || '';
    const richText = RichTextBuilder.fromMarkdown(content);

    // Collecter les lignes suivantes comme contenu du toggle
    const children: ASTNode[] = [];
    let collectedLines = 0;
    const maxLines = 10; // Limite pour éviter de consommer trop

    while (stream.hasNext() && collectedLines < maxLines) {
      const nextToken = stream.peek();
      
      if (!nextToken || nextToken.type === 'EOF') {
        break;
      }
      
      // Arrêter si on rencontre un élément structuré
      if (this.isStructuredElement(nextToken)) {
        break;
      }
      
      // Si c'est un paragraphe simple, l'ajouter comme enfant
      if (nextToken.type === 'PARAGRAPH') {
        const childToken = stream.next()!;
        const childContent = childToken.content || '';
        
        if (childContent.trim()) {
          const childRichText = RichTextBuilder.fromMarkdown(childContent);
          children.push({
            type: 'paragraph',
            content: childContent,
            metadata: { richText: childRichText },
            children: []
          });
          collectedLines++;
        }
      } else {
        break;
      }
    }

    return {
      type: 'toggle',
      content: content,
      metadata: {
        richText: richText,
        hasChildren: children.length > 0
      },
      children: children
    };
  }

  private isStructuredElement(token: any): boolean {
    const structuredTypes = [
      'HEADING_1', 'HEADING_2', 'HEADING_3',
      'TOGGLE_HEADING', 'CALLOUT', 'CODE_BLOCK',
      'LIST_ITEM_BULLETED', 'LIST_ITEM_NUMBERED', 'LIST_ITEM_TODO',
      'TABLE_ROW', 'DIVIDER', 'QUOTE_BLOCK'
    ];
    
    return structuredTypes.includes(token.type);
  }
}