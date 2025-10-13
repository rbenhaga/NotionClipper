import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';

/**
 * Parser pour les blockquotes et callouts
 * ✅ PATCH #2: Retrait complet des > selon les spécifications
 */
export class QuoteParser extends BaseBlockParser {
  priority = 85;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'QUOTE_BLOCK';
  }

  parse(stream: TokenStream): ASTNode | null {
    const quoteLines: string[] = [];
    
    // ✅ Collecter toutes les lignes consécutives de blockquote
    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (!token || token.type !== 'QUOTE_BLOCK') {
        break;
      }
      
      const quoteToken = stream.next()!;
      const content = this.extractBlockquoteContent(quoteToken.content);
      
      // ✅ Vérifier si c'est un callout ou toggle heading (déjà traité ailleurs)
      if (content.match(/^\[!(\w+)\]/) || content.match(/^#{1,3}\s+/)) {
        // Remettre le token dans le stream (si possible) ou ignorer
        break;
      }
      
      quoteLines.push(content);
    }
    
    if (quoteLines.length === 0) {
      return null;
    }
    
    // ✅ Décider: Quote simple ou Toggle complexe
    const isToggle = this.shouldBeToggle(quoteLines);
    
    if (isToggle) {
      return this.createToggleFromLines(quoteLines);
    } else {
      // ✅ Quote simple - joindre avec \n pour préserver les sauts de ligne
      const content = quoteLines.join('\n');
      return this.createNode('quote', content);
    }
  }

  /**
   * ✅ PATCH #2: Extrait le contenu en retirant TOUS les > au début
   */
  private extractBlockquoteContent(line: string): string {
    let content = line.trim();
    
    // ✅ SOLUTION SIMPLE: Retirer TOUS les > consécutifs au début
    while (content.startsWith('>')) {
      content = content.substring(1).trim();  // Retire > et trim
    }
    
    return content;
  }

  /**
   * ✅ Détermine si les lignes forment un toggle ou une quote simple
   */
  private shouldBeToggle(lines: string[]): boolean {
    // Si plus de 3 lignes, probablement un toggle
    if (lines.length > 3) {
      return true;
    }
    
    // Si contient des éléments structurés (listes, headings), c'est un toggle
    const hasStructuredContent = lines.some(line => 
      line.match(/^#{1,6}\s/) ||    // Heading
      line.match(/^[-*+]\s/) ||     // Liste
      line.match(/^\d+\.\s/) ||     // Liste numérotée
      line.match(/^\|.*\|/) ||      // Table
      line.match(/^```/)            // Code block
    );
    
    return hasStructuredContent;
  }

  /**
   * ✅ Crée un toggle à partir des lignes
   */
  private createToggleFromLines(lines: string[]): ASTNode {
    // Le premier élément devient le titre du toggle
    const title = lines[0] || 'Toggle';
    const contentLines = lines.slice(1);
    
    const children: ASTNode[] = [];
    
    // Parser le contenu restant comme des paragraphes
    if (contentLines.length > 0) {
      const content = contentLines.join('\n');
      if (content.trim()) {
        children.push(this.createNode('paragraph', content));
      }
    }
    
    return this.createNode('toggle', title, {
      hasChildren: children.length > 0,
      children
    });
  }
}

/**
 * Parser pour les callouts (> [!type])
 */
export class CalloutParser extends BaseBlockParser {
  priority = 90;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'CALLOUT';
  }

  parse(stream: TokenStream): ASTNode | null {
    const calloutToken = this.consumeToken(stream);
    if (!calloutToken) return null;

    const calloutType = calloutToken.metadata?.calloutType || 'note';
    const icon = calloutToken.metadata?.icon || '📝';
    const color = calloutToken.metadata?.color || 'gray';
    
    let content = calloutToken.content || '';
    
    // Collecter les lignes suivantes du callout
    const additionalLines: string[] = [];
    
    while (stream.hasNext()) {
      const nextToken = stream.peek();
      
      if (!nextToken || nextToken.type === 'EOF') {
        break;
      }
      
      // Si c'est une ligne de blockquote qui continue le callout
      if (nextToken.type === 'QUOTE_BLOCK') {
        const lineContent = this.extractBlockquoteContent(nextToken.content);
        
        // Si c'est un nouveau callout, arrêter
        if (lineContent.match(/^\[!(\w+)\]/)) {
          break;
        }
        
        // Si c'est un heading, arrêter
        if (lineContent.match(/^#{1,3}\s+/)) {
          break;
        }
        
        additionalLines.push(lineContent);
        stream.next(); // Consommer le token
      }
      // Autre type de bloc, arrêter
      else if (this.isBlockStart(nextToken)) {
        break;
      }
      // Token inline, ignorer pour l'instant
      else {
        stream.next();
      }
    }
    
    // Combiner le contenu
    if (additionalLines.length > 0) {
      content = [content, ...additionalLines].join('\n');
    }
    
    return this.createNode('callout', content, {
      calloutType,
      icon,
      color
    });
  }

  private extractBlockquoteContent(line: string): string {
    let content = line.trim();
    
    while (content.startsWith('>')) {
      content = content.substring(1).trim();
    }
    
    return content;
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