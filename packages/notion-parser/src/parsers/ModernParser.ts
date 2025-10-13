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
import { EquationParser } from './EquationParser';
import { ToggleParser } from './ToggleParser';
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
   * ✅ NOUVELLE IMPLÉMENTATION - Parse le token stream en utilisant les parsers spécialisés
   */
  private parseTokenStream(stream: TokenStream): ASTNode[] {
    const nodes: ASTNode[] = [];
    let currentList: { type: 'bulleted' | 'numbered' | 'todo'; items: ASTNode[] } | null = null;

    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (!token || token.type === 'EOF') {
        break;
      }

      // Skip whitespace tokens
      if (token.type === 'WHITESPACE' || token.type === 'NEWLINE') {
        stream.next();
        continue;
      }

      // Gérer les dividers directement
      if (token.type === 'DIVIDER') {
        // Sauvegarder la liste en cours si elle existe
        if (currentList) {
          nodes.push(this.createListBlock(currentList.type, currentList.items));
          currentList = null;
        }
        
        nodes.push({
          type: 'divider',
          content: '',
          metadata: {},
          children: []
        });
        stream.next();
        continue;
      }

      // Trouver le parser approprié
      const parser = this.findParser(stream);
      
      if (parser) {
        const node = parser.parse(stream);
        
        if (node) {
          // Gérer les listes - grouper les items consécutifs
          if (node.type === 'list_item') {
            const listType = node.metadata?.listType || 'bulleted';
            
            if (!currentList || currentList.type !== listType) {
              // Sauvegarder la liste précédente si elle existe
              if (currentList) {
                nodes.push(this.createListBlock(currentList.type, currentList.items));
                currentList = null;
              }
              
              // Démarrer une nouvelle liste
              currentList = {
                type: listType as 'bulleted' | 'numbered' | 'todo',
                items: [node]
              };
            } else {
              // Ajouter à la liste courante
              currentList.items.push(node);
            }
          } else {
            // Sauvegarder la liste en cours si on change de type de bloc
            if (currentList) {
              nodes.push(this.createListBlock(currentList.type, currentList.items));
              currentList = null;
            }
            
            nodes.push(node);
          }
        }
      } else {
        // Pas de parser trouvé - consommer le token et créer un texte
        const token = stream.next();
        if (token && token.content.trim()) {
          // Sauvegarder la liste en cours
          if (currentList) {
            nodes.push(this.createListBlock(currentList.type, currentList.items));
            currentList = null;
          }
          
          nodes.push({
            type: 'text',
            content: token.content,
            metadata: {},
            children: []
          });
        }
      }
    }

    // Sauvegarder la dernière liste si nécessaire
    if (currentList) {
      nodes.push(this.createListBlock(currentList.type, currentList.items));
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
   * ✅ NOUVEAU - Crée un bloc de liste avec tous ses items
   */
  private createListBlock(type: 'bulleted' | 'numbered' | 'todo', items: ASTNode[]): ASTNode {
    // Les listes seront converties en items individuels par NotionConverter
    // Pour l'instant, on retourne un conteneur
    return {
      type: 'list_container',
      content: '',
      metadata: { listType: type, itemCount: items.length },
      children: items
    };
  }

  /**
   * ✅ AMÉLIORATION - Trouve le parser avec gestion des priorités
   */
  private findParser(stream: TokenStream): BlockParser | null {
    const token = stream.peek();
    if (!token) return null;

    // Ordre de priorité (du plus spécifique au plus général)
    const sortedParsers = [...this.parsers].sort((a, b) => b.priority - a.priority);

    for (const parser of sortedParsers) {
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
      new EquationParser(),       // 95 - Équations en bloc
      new ToggleHeadingParser(),  // 95
      new CalloutParser(),        // 90
      new MediaParser(),          // 85
      new HeadingParser(),        // 80
      new QuoteParser(),          // 85
      // new ToggleParser(),         // 75 - Toggles simples (désactivé temporairement)
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