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
    const codeToken = this.consumeToken(stream);
    if (!codeToken) return null;

    const language = codeToken.metadata?.language || 'plain text';
    const code = codeToken.content || '';

    return {
      type: 'code',
      content: code,
      metadata: {
        language: this.normalizeLanguage(language),
        isBlock: true
      },
      children: []
    };
  }

  private normalizeLanguage(lang: string): string {
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'sh': 'shell',
      'bash': 'shell',
      // Ajouter tous les mappings nécessaires
    };
    
    return langMap[lang.toLowerCase()] || lang;
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