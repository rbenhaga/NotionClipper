import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';

/**
 * Parser pour les équations LaTeX
 */
export class EquationParser extends BaseBlockParser {
  priority = 95; // Priorité élevée

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'EQUATION_BLOCK';
  }

  parse(stream: TokenStream): ASTNode | null {
    const equationToken = this.consumeToken(stream);
    if (!equationToken) return null;

    const expression = equationToken.content || '';
    const isBlock = equationToken.metadata?.isBlock !== false;

    return {
      type: 'equation',
      content: expression,
      metadata: {
        isBlock,
        expression
      },
      children: []
    };
  }
}