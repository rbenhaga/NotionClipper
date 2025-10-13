import type { Token, TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { SimpleLexer } from '../lexer/SimpleLexer';
import { SimpleRichTextBuilder as RichTextBuilder } from '../converters/SimpleRichTextBuilder';

/**
 * Parser moderne utilisant la nouvelle architecture
 * ✅ NOUVELLE ARCHITECTURE: Lexer → Parsers → AST
 */
export class ModernParser {
  private lexer: SimpleLexer;

  constructor() {
    this.lexer = new SimpleLexer();
  }

  /**
   * ✅ API PRINCIPALE: Parse le contenu vers AST
   */
  parse(content: string): ASTNode[] {
    if (!content?.trim()) {
      return [];
    }

    // Étape 1: Tokenization
    const tokenStream = this.lexer.tokenize(content);
    
    // Étape 2: Parsing vers AST
    const nodes = this.parseTokenStream(tokenStream);
    
    return nodes;
  }

  /**
   * ✅ CORRECTION: Parse le token stream en utilisant réellement les tokens
   */
  private parseTokenStream(stream: TokenStream): ASTNode[] {
    const nodes: ASTNode[] = [];
    
    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (!token || token.type === 'EOF') {
        break;
      }

      // Skip newlines vides
      if (token.type === 'NEWLINE') {
        stream.next();
        continue;
      }

      let node: ASTNode | null = null;

      switch (token.type) {
        case 'HEADING_1':
        case 'HEADING_2':
        case 'HEADING_3':
          node = this.createHeadingFromToken(token);
          break;
        
        case 'LIST_ITEM_TODO':
          node = this.createTodoFromToken(token);
          break;
        
        case 'LIST_ITEM_BULLETED':
          node = this.createBulletedListFromToken(token);
          break;
        
        case 'LIST_ITEM_NUMBERED':
          node = this.createNumberedListFromToken(token);
          break;
        
        case 'QUOTE_BLOCK':
          node = this.createQuoteFromToken(token);
          break;
        
        case 'CALLOUT':
          node = this.createCalloutFromToken(token);
          break;
        
        case 'CODE_BLOCK':
          node = this.createCodeBlockFromToken(token);
          break;
        
        case 'EQUATION_BLOCK':
          node = this.createEquationFromToken(token);
          break;
        
        case 'TABLE_ROW':
          node = this.createTableFromTokens(stream);
          continue; // createTableFromTokens gère l'avancement du stream
        
        case 'IMAGE':
          node = this.createImageFromToken(token);
          break;
        
        case 'DIVIDER':
          node = { type: 'divider' };
          break;
        
        case 'PARAGRAPH':
        default:
          node = this.createParagraphFromToken(token);
          break;
      }

      if (node) {
        nodes.push(node);
      }
      
      stream.next();
    }

    return nodes;
  }

  /**
   * ✅ NOUVEAU: Créer un heading depuis un token
   */
  private createHeadingFromToken(token: Token): ASTNode {
    const level = token.metadata?.level || 1;
    return {
      type: `heading_${level}` as 'heading_1' | 'heading_2' | 'heading_3',
      content: token.content || '',
      metadata: {
        level,
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer un TODO depuis un token
   */
  private createTodoFromToken(token: Token): ASTNode {
    return {
      type: 'list_item',
      content: token.content || '',
      metadata: {
        listType: 'todo',
        checked: token.metadata?.checked || false,
        indentLevel: token.metadata?.indentLevel || 0,
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer une liste à puces depuis un token
   */
  private createBulletedListFromToken(token: Token): ASTNode {
    return {
      type: 'list_item',
      content: token.content || '',
      metadata: {
        listType: 'bulleted',
        indentLevel: token.metadata?.indentLevel || 0,
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer une liste numérotée depuis un token
   */
  private createNumberedListFromToken(token: Token): ASTNode {
    return {
      type: 'list_item',
      content: token.content || '',
      metadata: {
        listType: 'numbered',
        indentLevel: token.metadata?.indentLevel || 0,
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer une citation depuis un token
   */
  private createQuoteFromToken(token: Token): ASTNode {
    return {
      type: 'quote',
      content: token.content || '',
      metadata: {
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer un callout depuis un token
   */
  private createCalloutFromToken(token: Token): ASTNode {
    return {
      type: 'callout',
      content: token.content || '',
      metadata: {
        icon: token.metadata?.icon || '💡',
        color: token.metadata?.color || 'gray',
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer un code block depuis un token
   */
  private createCodeBlockFromToken(token: Token): ASTNode {
    return {
      type: 'code',
      content: token.content || '',
      metadata: {
        language: token.metadata?.language || 'plain text',
        isBlock: true
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer un paragraphe depuis un token
   */
  private createParagraphFromToken(token: Token): ASTNode {
    return {
      type: 'paragraph',
      content: token.content || '',
      metadata: {
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer une image depuis un token
   */
  private createImageFromToken(token: Token): ASTNode {
    return {
      type: 'image',
      content: token.metadata?.url || '',
      metadata: {
        url: token.metadata?.url || '',
        caption: token.metadata?.alt || ''
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer une équation depuis un token
   */
  private createEquationFromToken(token: Token): ASTNode {
    return {
      type: 'equation',
      content: token.content || '',
      metadata: {
        isBlock: token.metadata?.isBlock || true
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer une table depuis plusieurs tokens de lignes
   */
  private createTableFromTokens(stream: TokenStream): ASTNode {
    const rows: string[][] = [];
    
    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (token?.type !== 'TABLE_ROW') {
        break;
      }
      
      // Parser le contenu de la ligne - enlever les | du début et fin
      const content = token.content || '';
      const cleanContent = content.startsWith('|') && content.endsWith('|') 
        ? content.slice(1, -1) 
        : content;
      const cells = cleanContent.split('|').map(c => c.trim());
      rows.push(cells);
      
      stream.next();
    }
    
    // Détecter le header (première ligne avec que des mots, deuxième ligne avec des '---')
    const hasColumnHeader = rows.length >= 2 && 
      rows[1].every(cell => cell.match(/^-+$/));
    
    // Retirer la ligne de séparation si c'est un header
    if (hasColumnHeader) {
      rows.splice(1, 1);
    }
    
    return {
      type: 'table',
      content: '',
      metadata: {
        rows,
        headers: hasColumnHeader ? rows[0] : [],
        hasColumnHeader
      }
    };
  }



  /**
   * ✅ Obtient les statistiques de parsing
   */
  getStats(content: string): ParsingStats {
    const tokenStream = this.lexer.tokenize(content);
    
    // Créer des stats basiques sans dépendre de lexer.getStats
    const lexerStats = {
      totalTokens: tokenStream.tokens.length,
      tokenTypes: this.countTokenTypes(tokenStream.tokens),
      textLength: content.length,
      averageTokenLength: content.length / Math.max(1, tokenStream.tokens.length)
    };
    
    const nodes = this.parseTokenStream(tokenStream);
    
    return {
      lexer: lexerStats,
      parsing: {
        totalNodes: nodes.length,
        nodeTypes: this.countNodeTypes(nodes),
        maxDepth: this.calculateMaxDepth(nodes),
        hasErrors: false
      }
    };
  }

  /**
   * Compte les types de tokens
   */
  private countTokenTypes(tokens: Token[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    tokens.forEach(token => {
      counts[token.type] = (counts[token.type] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Compte les types de nœuds
   */
  private countNodeTypes(nodes: ASTNode[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    const countNode = (node: ASTNode) => {
      counts[node.type] = (counts[node.type] || 0) + 1;
      
      if (node.children) {
        node.children.forEach(countNode);
      }
    };
    
    nodes.forEach(countNode);
    return counts;
  }

  /**
   * Calcule la profondeur maximale de l'arbre
   */
  private calculateMaxDepth(nodes: ASTNode[]): number {
    const getDepth = (node: ASTNode): number => {
      if (!node.children || node.children.length === 0) {
        return 1;
      }
      
      return 1 + Math.max(...node.children.map(getDepth));
    };
    
    return Math.max(0, ...nodes.map(getDepth));
  }


}

/**
 * Types pour les statistiques
 */
export interface ParsingStats {
  lexer: {
    totalTokens: number;
    tokenTypes: Record<string, number>;
    textLength: number;
    averageTokenLength: number;
  };
  parsing: {
    totalNodes: number;
    nodeTypes: Record<string, number>;
    maxDepth: number;
    hasErrors: boolean;
  };
}