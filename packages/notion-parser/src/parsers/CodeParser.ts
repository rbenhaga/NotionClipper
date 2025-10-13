import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';

/**
 * Parser pour les code blocks
 */
export class CodeParser extends BaseBlockParser {
  priority = 100; // Priorité maximale pour éviter les conflits

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'CODE_BLOCK';
  }

  parse(stream: TokenStream): ASTNode | null {
    const startToken = this.consumeToken(stream);
    if (!startToken) return null;

    const language = startToken.metadata?.language || 'plain text';
    const codeLines: string[] = [];

    // Si le token contient déjà le code complet (```code```)
    if (startToken.content && !startToken.content.startsWith('```')) {
      return this.createNode('code', startToken.content, {
        language,
        isBlock: true
      });
    }

    // Sinon, collecter les lignes jusqu'à la fermeture
    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (!token || token.type === 'EOF') {
        break;
      }
      
      // Ligne de fermeture ```
      if (token.type === 'CODE_BLOCK' && token.content.trim() === '```') {
        stream.next(); // Consommer le token de fermeture
        break;
      }
      
      // Ligne de code normale
      const codeToken = stream.next()!;
      codeLines.push(codeToken.content);
    }

    const code = codeLines.join('\n');
    
    return this.createNode('code', code, {
      language,
      isBlock: true
    });
  }
}

/**
 * Parser pour le code inline (géré par les règles inline)
 */
export class InlineCodeParser extends BaseBlockParser {
  priority = 85;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'CODE_START';
  }

  parse(stream: TokenStream): ASTNode | null {
    // Consommer CODE_START
    const startToken = this.consumeToken(stream, 'CODE_START');
    if (!startToken) return null;

    // Collecter le contenu jusqu'à CODE_END
    const contentTokens: string[] = [];
    
    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (!token || token.type === 'CODE_END') {
        if (token?.type === 'CODE_END') {
          stream.next(); // Consommer CODE_END
        }
        break;
      }
      
      const contentToken = stream.next()!;
      contentTokens.push(contentToken.content);
    }

    const content = contentTokens.join('');
    
    return this.createNode('text', content, {
      annotations: {
        code: true
      }
    });
  }
}