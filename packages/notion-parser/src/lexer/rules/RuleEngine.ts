import type { LexerRule, LexerState, Token, Position } from '../../types/tokens';

/**
 * Moteur de règles pour le lexer
 * Gère l'application des règles de tokenization dans l'ordre de priorité
 */
export class RuleEngine {
  private rules: LexerRule[] = [];

  constructor(rules: LexerRule[] = []) {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  addRule(rule: LexerRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  addRules(rules: LexerRule[]): void {
    this.rules.push(...rules);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Trouve la première règle qui match à la position courante
   */
  findMatch(state: LexerState): { rule: LexerRule; match: RegExpMatchArray | string; length: number } | null {
    const text = state.text;
    const position = state.position;
    const remainingText = text.substring(position);

    for (const rule of this.rules) {
      try {
        if (rule.pattern instanceof RegExp) {
          // Reset regex state
          rule.pattern.lastIndex = 0;
          
          const match = rule.pattern.exec(remainingText);
          if (match && match.index === 0) {
            return {
              rule,
              match,
              length: match[0].length
            };
          }
        } else {
          // Custom function pattern
          const result = rule.pattern(remainingText, 0);
          if (result.match) {
            return {
              rule,
              match: remainingText.substring(0, result.length),
              length: result.length
            };
          }
        }
      } catch (error) {
        console.warn(`[RuleEngine] Error in rule "${rule.name}":`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Applique une règle et crée un token
   */
  applyRule(
    rule: LexerRule, 
    match: RegExpMatchArray | string, 
    state: LexerState
  ): Token {
    const position: Position = {
      start: state.position,
      end: state.position + (typeof match === 'string' ? match.length : match[0].length),
      line: state.line,
      column: state.column
    };

    const baseToken: Token = {
      type: rule.tokenType,
      content: typeof match === 'string' ? match : match[0],
      position
    };

    // Appliquer l'extraction personnalisée de la règle
    const extracted = rule.extract(match, position);
    
    return {
      ...baseToken,
      ...extracted
    };
  }

  /**
   * Obtient toutes les règles triées par priorité
   */
  getRules(): LexerRule[] {
    return [...this.rules];
  }

  /**
   * Supprime une règle par nom
   */
  removeRule(name: string): boolean {
    const index = this.rules.findIndex(rule => rule.name === name);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Trouve une règle par nom
   */
  getRule(name: string): LexerRule | undefined {
    return this.rules.find(rule => rule.name === name);
  }

  /**
   * Valide qu'une règle est bien formée
   */
  static validateRule(rule: LexerRule): string[] {
    const errors: string[] = [];

    if (!rule.name || typeof rule.name !== 'string') {
      errors.push('Rule name must be a non-empty string');
    }

    if (typeof rule.priority !== 'number') {
      errors.push('Rule priority must be a number');
    }

    if (!rule.pattern) {
      errors.push('Rule pattern is required');
    }

    if (!rule.tokenType || typeof rule.tokenType !== 'string') {
      errors.push('Rule tokenType must be a valid TokenType string');
    }

    if (typeof rule.extract !== 'function') {
      errors.push('Rule extract must be a function');
    }

    return errors;
  }

  /**
   * Valide toutes les règles du moteur
   */
  validateAllRules(): { valid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};
    let hasErrors = false;

    for (const rule of this.rules) {
      const ruleErrors = RuleEngine.validateRule(rule);
      if (ruleErrors.length > 0) {
        errors[rule.name] = ruleErrors;
        hasErrors = true;
      }
    }

    return {
      valid: !hasErrors,
      errors
    };
  }
}