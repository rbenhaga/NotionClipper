import type { Token, TokenStream, LexerState, LexerRule, Position } from '../types/tokens';
import { RuleEngine } from './rules/RuleEngine';
import { blockRules } from './rules/BlockRules';
import { inlineRules, mediaRules } from './rules/InlineRules';

/**
 * Lexer principal utilisant un state machine pour la tokenization efficace
 * ✅ NOUVELLE ARCHITECTURE: Un seul passage, pas de backtracking
 */
export class Lexer {
  private ruleEngine: RuleEngine;
  private options: LexerOptions;

  constructor(options: LexerOptions = {}) {
    this.options = {
      preserveWhitespace: false,
      trackPositions: true,
      maxTokens: 10000,
      enableInlineFormatting: true,
      enableMediaDetection: true,
      ...options
    };

    this.ruleEngine = new RuleEngine();
    this.initializeRules();
  }

  /**
   * ✅ API PRINCIPALE: Tokenize le texte d'entrée
   */
  tokenize(input: string): TokenStream {
    if (!input?.trim()) {
      return this.createEmptyTokenStream();
    }

    const state: LexerState = {
      text: input,
      position: 0,
      line: 1,
      column: 1,
      tokens: []
    };

    let tokenCount = 0;
    const maxTokens = this.options.maxTokens || 10000;

    // ✅ TOKENIZATION EN UN SEUL PASSAGE
    while (state.position < input.length && tokenCount < maxTokens) {
      const processed = this.processNextToken(state);
      
      if (processed.success) {
        tokenCount++;
        this.updatePosition(state, processed.consumed);
      } else {
        // Fallback: traiter comme texte simple
        this.processFallbackText(state);
        tokenCount++;
      }
    }

    // Ajouter EOF token
    this.addEOFToken(state);

    return this.createTokenStream(state.tokens);
  }

  /**
   * ✅ TRAITEMENT DU PROCHAIN TOKEN
   */
  private processNextToken(state: LexerState): { success: boolean; consumed: number } {
    // Ignorer les espaces si nécessaire
    if (!this.options.preserveWhitespace) {
      const whitespaceConsumed = this.consumeWhitespace(state);
      if (whitespaceConsumed > 0) {
        return { success: true, consumed: whitespaceConsumed };
      }
    }

    // Appliquer les règles via le moteur
    const match = this.ruleEngine.findMatch(state);
    
    if (match) {
      const token = this.ruleEngine.applyRule(match.rule, match.match, state);
      state.tokens.push(token);
      
      return { success: true, consumed: match.length };
    }

    return { success: false, consumed: 0 };
  }

  /**
   * ✅ CONSOMMATION DES ESPACES
   */
  private consumeWhitespace(state: LexerState): number {
    const text = state.text;
    let consumed = 0;
    let pos = state.position;

    while (pos < text.length && /\s/.test(text[pos])) {
      if (text[pos] === '\n') {
        // Créer un token newline si nécessaire
        if (this.options.preserveWhitespace) {
          const position: Position = {
            start: pos,
            end: pos + 1,
            line: state.line,
            column: state.column
          };
          
          state.tokens.push({
            type: 'NEWLINE',
            content: '\n',
            position
          });
        }
      }
      
      pos++;
      consumed++;
    }

    return consumed;
  }

  /**
   * ✅ FALLBACK POUR TEXTE NON RECONNU
   */
  private processFallbackText(state: LexerState): void {
    const text = state.text;
    let length = 1;
    
    // Étendre jusqu'au prochain caractère spécial ou espace
    while (state.position + length < text.length) {
      const char = text[state.position + length];
      if (/[\s*_`~\[\]()$#>|!-]/.test(char)) {
        break;
      }
      length++;
    }

    const content = text.substring(state.position, state.position + length);
    const position: Position = {
      start: state.position,
      end: state.position + length,
      line: state.line,
      column: state.column
    };

    state.tokens.push({
      type: 'TEXT',
      content,
      position
    });

    this.updatePosition(state, length);
  }

  /**
   * ✅ MISE À JOUR DE LA POSITION
   */
  private updatePosition(state: LexerState, consumed: number): void {
    const text = state.text.substring(state.position, state.position + consumed);
    
    for (const char of text) {
      if (char === '\n') {
        state.line++;
        state.column = 1;
      } else {
        state.column++;
      }
    }
    
    state.position += consumed;
  }

  /**
   * ✅ INITIALISATION DES RÈGLES
   */
  private initializeRules(): void {
    // Ajouter les règles de bloc (priorité haute)
    this.ruleEngine.addRules(blockRules);

    // Ajouter les règles inline si activées
    if (this.options.enableInlineFormatting) {
      this.ruleEngine.addRules(inlineRules);
    }

    // Ajouter les règles média si activées
    if (this.options.enableMediaDetection) {
      this.ruleEngine.addRules(mediaRules);
    }
  }

  /**
   * ✅ CRÉATION DU TOKEN STREAM
   */
  private createTokenStream(tokens: Token[]): TokenStream {
    return new TokenStreamImpl(tokens);
  }

  /**
   * ✅ TOKEN STREAM VIDE
   */
  private createEmptyTokenStream(): TokenStream {
    return new TokenStreamImpl([{
      type: 'EOF',
      content: '',
      position: { start: 0, end: 0, line: 1, column: 1 }
    }]);
  }

  /**
   * ✅ AJOUTER TOKEN EOF
   */
  private addEOFToken(state: LexerState): void {
    const position: Position = {
      start: state.position,
      end: state.position,
      line: state.line,
      column: state.column
    };

    state.tokens.push({
      type: 'EOF',
      content: '',
      position
    });
  }

  /**
   * ✅ STATISTIQUES DE TOKENIZATION
   */
  getStats(tokens: Token[]): LexerStats {
    const stats: LexerStats = {
      totalTokens: tokens.length,
      tokenTypes: {},
      textLength: 0,
      averageTokenLength: 0
    };

    for (const token of tokens) {
      stats.tokenTypes[token.type] = (stats.tokenTypes[token.type] || 0) + 1;
      stats.textLength += token.content.length;
    }

    stats.averageTokenLength = stats.textLength / Math.max(1, tokens.length);

    return stats;
  }
}

/**
 * ✅ IMPLÉMENTATION DU TOKEN STREAM
 */
class TokenStreamImpl implements TokenStream {
  tokens: Token[];
  current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(offset: number = 0): Token | null {
    const index = this.current + offset;
    return index < this.tokens.length ? this.tokens[index] : null;
  }

  next(): Token | null {
    if (this.current < this.tokens.length) {
      return this.tokens[this.current++];
    }
    return null;
  }

  hasNext(): boolean {
    return this.current < this.tokens.length;
  }

  position(): number {
    return this.current;
  }

  seek(position: number): void {
    this.current = Math.max(0, Math.min(position, this.tokens.length));
  }
}

/**
 * ✅ OPTIONS DU LEXER
 */
export interface LexerOptions {
  preserveWhitespace?: boolean;
  trackPositions?: boolean;
  maxTokens?: number;
  enableInlineFormatting?: boolean;
  enableMediaDetection?: boolean;
}

/**
 * ✅ STATISTIQUES DU LEXER
 */
export interface LexerStats {
  totalTokens: number;
  tokenTypes: Record<string, number>;
  textLength: number;
  averageTokenLength: number;
}