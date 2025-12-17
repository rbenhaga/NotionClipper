import type { Token, TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { Lexer } from '../lexer/Lexer';
import { RichTextBuilder } from '../converters/RichTextBuilder';

/**
 * Parser moderne utilisant la nouvelle architecture
 * ✅ NOUVELLE ARCHITECTURE: Lexer → Parsers → AST
 */
export class ModernParser {
  private lexer: Lexer;

  constructor() {
    this.lexer = new Lexer({
      preserveWhitespace: false,
      trackPositions: true,
      enableInlineFormatting: true,
      enableMediaDetection: true
    });
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

      // ✅ NOUVEAU: Traitement spécial pour les listes avec hiérarchie
      if (this.isListToken(token.type)) {
        const listNodes = this.parseListHierarchy(stream);
        nodes.push(...listNodes);
        continue;
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
          // ✅ Vérifier si c'est un toggle heading via le metadata
          if (token.metadata?.isToggleable) {
            node = this.createToggleHeadingFromToken(token);
          } else {
            node = this.createHeadingFromToken(token);
          }
          break;
        
        case 'TOGGLE_HEADING':
          node = this.createToggleHeadingFromToken(token);
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
        
        case 'TOGGLE_LIST':
          node = this.createToggleFromToken(token);
          break;
        
        case 'CALLOUT':
        case 'CALLOUT_HTML_SINGLE':
          node = this.createCalloutFromToken(token);
          break;
        
        case 'CODE_BLOCK':
          node = this.createCodeBlockFromToken(token);
          break;
        
        case 'EQUATION_BLOCK':
        case 'EQUATION_INLINE':
          node = this.createEquationFromToken(token);
          break;
        
        case 'TABLE_ROW':
          node = this.createTableFromTokens(stream);
          // Note: createTableFromTokens gère l'avancement du stream, pas besoin de stream.next()
          break;
        
        case 'IMAGE':
          node = this.createImageFromToken(token);
          break;
        
        case 'AUDIO':
          node = this.createAudioFromToken(token);
          break;
        
        case 'VIDEO':
          node = this.createVideoFromToken(token);
          break;
        
        case 'BOOKMARK':
          node = this.createBookmarkFromToken(token);
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
   * ✅ NOUVEAU: Créer un toggle heading depuis un token (> # Heading)
   * Toggle headings are collapsible headings in Notion
   */
  private createToggleHeadingFromToken(token: Token): ASTNode {
    const level = token.metadata?.level || 1;
    const hasChildren = token.metadata?.hasChildren || false;
    return {
      type: `heading_${level}` as 'heading_1' | 'heading_2' | 'heading_3',
      content: token.content || '',
      metadata: {
        level,
        isToggleable: true,
        hasChildren, // ✅ Propager l'info depuis le Lexer
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      },
      children: hasChildren ? [] : undefined // Toggle headings can have nested children
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
        isToggleable: token.metadata?.isToggleable || false,
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
        isToggleable: token.metadata?.isToggleable || false,
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
        isToggleable: token.metadata?.isToggleable || false,
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      }
    };
  }

  /**
   * ✅ NOUVEAU: Parser une hiérarchie de listes basée sur l'indentation
   */
  private parseListHierarchy(stream: TokenStream): ASTNode[] {
    const listItems: Array<{ node: ASTNode; indentLevel: number }> = [];
    
    // Collecter tous les éléments de liste consécutifs
    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (!token || !this.isListToken(token.type)) {
        break;
      }
      
      stream.next(); // Consommer le token
      
      const indentLevel = token.metadata?.indentLevel || 0;
      const listType = this.getListTypeFromToken(token.type);
      
      const node: ASTNode = {
        type: 'list_item',
        content: token.content || '',
        metadata: {
          listType,
          indentLevel,
          checked: token.metadata?.checked,
          isToggleable: token.metadata?.isToggleable || false,
          richText: RichTextBuilder.fromMarkdown(token.content || '')
        },
        children: []
      };
      
      listItems.push({ node, indentLevel });
    }
    
    // Construire la hiérarchie basée sur l'indentation
    return this.buildListHierarchy(listItems);
  }

  /**
   * ✅ NOUVEAU: Construire la hiérarchie des listes
   */
  private buildListHierarchy(items: Array<{ node: ASTNode; indentLevel: number }>): ASTNode[] {
    if (items.length === 0) return [];
    
    const result: ASTNode[] = [];
    const stack: Array<{ node: ASTNode; indentLevel: number }> = [];
    
    for (const item of items) {
      // Retirer les éléments du stack qui ont un niveau d'indentation >= au niveau actuel
      while (stack.length > 0 && stack[stack.length - 1].indentLevel >= item.indentLevel) {
        stack.pop();
      }
      
      if (stack.length === 0) {
        // Élément de niveau racine
        result.push(item.node);
      } else {
        // Élément enfant - l'ajouter au parent le plus proche
        const parent = stack[stack.length - 1].node;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item.node);
      }
      
      // Ajouter l'élément actuel au stack
      stack.push(item);
    }
    
    return result;
  }

  /**
   * ✅ NOUVEAU: Vérifier si un token est un token de liste
   */
  private isListToken(tokenType: string): boolean {
    return tokenType === 'LIST_ITEM_BULLETED' ||
           tokenType === 'LIST_ITEM_NUMBERED' ||
           tokenType === 'LIST_ITEM_TODO';
  }

  /**
   * ✅ NOUVEAU: Obtenir le type de liste depuis le type de token
   */
  private getListTypeFromToken(tokenType: string): 'bulleted' | 'numbered' | 'todo' {
    if (tokenType === 'LIST_ITEM_NUMBERED') return 'numbered';
    if (tokenType === 'LIST_ITEM_TODO') return 'todo';
    return 'bulleted';
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
   * ✅ NOUVEAU: Créer un toggle list depuis un token
   * Toggle lists are collapsible sections in Notion (single > syntax)
   */
  private createToggleFromToken(token: Token): ASTNode {
    return {
      type: 'toggle',
      content: token.content || '',
      metadata: {
        isToggleable: true,
        richText: RichTextBuilder.fromMarkdown(token.content || '')
      },
      children: [] // Toggle lists can have nested children
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
   * ✅ NOUVEAU: Créer un audio depuis un token
   */
  private createAudioFromToken(token: Token): ASTNode {
    return {
      type: 'audio',
      content: token.metadata?.url || '',
      metadata: {
        url: token.metadata?.url || ''
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer une vidéo depuis un token
   */
  private createVideoFromToken(token: Token): ASTNode {
    return {
      type: 'video',
      content: token.metadata?.url || '',
      metadata: {
        url: token.metadata?.url || ''
      }
    };
  }

  /**
   * ✅ NOUVEAU: Créer un bookmark depuis un token
   */
  private createBookmarkFromToken(token: Token): ASTNode {
    return {
      type: 'bookmark',
      content: token.metadata?.url || '',
      metadata: {
        url: token.metadata?.url || ''
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
    let tableType = 'markdown'; // Par défaut
    
    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (token?.type !== 'TABLE_ROW') {
        break;
      }
      
      // Détecter le type de tableau depuis le premier token
      if (rows.length === 0 && token.metadata?.tableType) {
        tableType = token.metadata.tableType;
      }
      
      const content = token.content || '';
      let cells: string[] = [];
      
      // Parser selon le type de tableau
      switch (tableType) {
        case 'csv':
          cells = content.split(',').map(c => c.trim()).filter(c => c.length > 0);
          break;
        case 'tsv':
          cells = content.split('\t').map(c => c.trim()).filter(c => c.length > 0);
          break;
        case 'markdown':
        default:
          // Enlever les | du début et fin si présents
          const cleanContent = content.startsWith('|') && content.endsWith('|') 
            ? content.slice(1, -1) 
            : content;
          cells = cleanContent.split('|').map(c => c.trim());
          break;
      }
      
      // ✅ VALIDATION: Ne pas ajouter de lignes complètement vides
      if (cells.length > 0 && cells.some(cell => cell.length > 0)) {
        rows.push(cells);
      }
      
      stream.next();
    }
    
    // ✅ VALIDATION RENFORCÉE: Vérifier qu'on a des données valides
    if (rows.length === 0) {
      console.warn('[ModernParser] No valid table rows found, creating paragraph');
      return {
        type: 'paragraph',
        content: 'Tableau vide (aucune ligne valide détectée)'
      };
    }
    
    // Détecter le header selon le type
    let hasColumnHeader = false;
    let headers: string[] = [];
    
    if (tableType === 'markdown') {
      // Pour markdown: deuxième ligne avec des '---' ou ':---:' etc.
      hasColumnHeader = rows.length >= 2 && 
        rows[1].every(cell => cell.match(/^:?-+:?$/));
      
      if (hasColumnHeader) {
        // Extraire les headers et les retirer des rows
        headers = [...rows[0]];
        rows.splice(0, 1); // Retirer la ligne d'entête
        rows.splice(0, 1); // Retirer la ligne de séparation
      }
    } else {
      // Pour CSV/TSV: première ligne est généralement un header
      hasColumnHeader = rows.length > 1;
      
      if (hasColumnHeader) {
        // Extraire les headers et les retirer des rows
        headers = [...rows[0]];
        rows.splice(0, 1); // Retirer la ligne d'entête
      }
    }
    
    // ✅ VALIDATION FINALE: S'assurer qu'on a encore des données après extraction des headers
    const maxWidth = Math.max(
      headers.length,
      ...rows.map(row => row.length)
    );
    
    if (maxWidth === 0) {
      console.warn('[ModernParser] Table has no columns after processing, creating paragraph');
      return {
        type: 'paragraph',
        content: 'Tableau vide (aucune colonne après traitement)'
      };
    }
    
    return {
      type: 'table',
      content: '',
      metadata: {
        rows, // Maintenant sans la ligne d'entête
        headers,
        hasColumnHeader,
        tableType
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