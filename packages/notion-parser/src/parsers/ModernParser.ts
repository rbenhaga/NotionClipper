import type { Token, TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { Lexer } from '../lexer/Lexer';
import { BlockParser } from './BlockParser';
import { HeadingParser, ToggleHeadingParser } from './HeadingParser';
import { QuoteParser, CalloutParser } from './QuoteParser';
import { ListParser } from './ListParser';
import { CodeParser } from './CodeParser';
import { TableParser } from './TableParser';
import { MediaParser } from './MediaParser';
import { ParagraphParser } from './BlockParser';

/**
 * Parser moderne utilisant la nouvelle architecture
 * ✅ NOUVELLE ARCHITECTURE: Lexer → Parsers → AST
 */
export class ModernParser {
  private lexer: Lexer;
  private parsers: BlockParser[] = [];

  constructor() {
    this.lexer = new Lexer({
      preserveWhitespace: false,
      trackPositions: true,
      enableInlineFormatting: true,
      enableMediaDetection: true
    });

    this.initializeParsers();
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
   * ✅ Parse le token stream vers AST compatible avec NotionConverter
   * Version simplifiée qui traite le contenu ligne par ligne
   */
  private parseTokenStream(stream: TokenStream): ASTNode[] {
    const nodes: ASTNode[] = [];

    // Approche simplifiée : reconstituer le texte et le parser ligne par ligne
    const allContent: string[] = [];
    
    while (stream.hasNext()) {
      const token = stream.next();
      if (token && token.type !== 'EOF') {
        if (token.type === 'NEWLINE') {
          allContent.push('\n');
        } else {
          allContent.push(token.content);
        }
      }
    }

    const fullText = allContent.join('');
    const lines = fullText.split('\n').filter(line => line.trim());

    // Parser chaque ligne individuellement
    for (const line of lines) {
      const node = this.createCompatibleNode(line.trim());
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * ✅ Crée un nœud AST compatible avec le NotionConverter existant
   */
  private createCompatibleNode(content: string): ASTNode {
    const trimmed = content.trim();

    // Détecter les headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      return {
        type: `heading_${level}`,
        content: headingMatch[2],
        metadata: { level },
        children: []
      };
    }

    // Détecter les listes
    const listMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      return {
        type: 'list_item',
        content: listMatch[1],
        metadata: { hasChildren: false, listType: 'bulleted' },
        children: []
      };
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      return {
        type: 'list_item',
        content: numberedMatch[1],
        metadata: { hasChildren: false, listType: 'numbered' },
        children: []
      };
    }

    const todoMatch = trimmed.match(/^- \[([ x])\]\s+(.+)$/);
    if (todoMatch) {
      return {
        type: 'list_item',
        content: todoMatch[2],
        metadata: { listType: 'todo', checked: todoMatch[1] === 'x' },
        children: []
      };
    }

    // Détecter les quotes
    if (trimmed.startsWith('> ')) {
      return {
        type: 'quote',
        content: trimmed.substring(2),
        metadata: {},
        children: []
      };
    }

    // Détecter les code blocks
    if (trimmed.startsWith('```')) {
      return {
        type: 'code',
        content: trimmed,
        metadata: { language: 'plain text', isBlock: true },
        children: []
      };
    }

    // Par défaut, créer un nœud text (compatible avec NotionConverter)
    return {
      type: 'text',
      content: trimmed,
      metadata: {},
      children: []
    };
  }

  /**
   * ✅ Trouve le parser approprié pour le token courant
   */
  private findParser(stream: TokenStream): BlockParser | null {
    for (const parser of this.parsers) {
      if (parser.canParse(stream)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * ✅ Initialise les parsers dans l'ordre de priorité
   */
  private initializeParsers(): void {
    this.parsers = [
      new CodeParser(),           // 100 - Priorité maximale
      new ToggleHeadingParser(),  // 95
      new CalloutParser(),        // 90
      new MediaParser(),          // 85
      new HeadingParser(),        // 80
      new QuoteParser(),          // 85
      new ListParser(),           // 75
      new TableParser(),          // 65
      new ParagraphParser()       // 1 - Fallback
    ];

    // Trier par priorité décroissante
    this.parsers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * ✅ Obtient les statistiques de parsing
   */
  getStats(content: string): ParsingStats {
    const tokenStream = this.lexer.tokenize(content);
    const lexerStats = this.lexer.getStats(tokenStream.tokens);
    
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

  /**
   * ✅ API pour ajouter des parsers personnalisés
   */
  addParser(parser: BlockParser): void {
    this.parsers.push(parser);
    this.parsers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * ✅ API pour supprimer un parser
   */
  removeParser(parserClass: new () => BlockParser): void {
    this.parsers = this.parsers.filter(p => !(p instanceof parserClass));
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