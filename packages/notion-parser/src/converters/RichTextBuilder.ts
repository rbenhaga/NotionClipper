import type { NotionRichText } from '../types/notion';
import type { Token } from '../types/tokens';

/**
 * Builder pour construire du rich text Notion
 * ✅ PATCH #1: Gestion correcte des espaces et formatage inline
 */
export class RichTextBuilder {
  private segments: NotionRichText[] = [];

  constructor() {
    this.segments = [];
  }

  /**
   * ✅ API PRINCIPALE: Parse du markdown vers rich text
   */
  static fromMarkdown(markdown: string): NotionRichText[] {
    const builder = new RichTextBuilder();
    return builder.parseMarkdown(markdown);
  }

  /**
   * ✅ Parse le markdown avec gestion des espaces selon PATCH #1
   */
  private parseMarkdown(text: string): NotionRichText[] {
    if (!text) return [];

    // Tokenizer simple pour le formatage inline
    const tokens = this.tokenizeInline(text);
    
    // Construire les segments rich text
    return this.buildRichTextFromTokens(tokens);
  }

  /**
   * ✅ PATCH #1: Tokenization inline avec préservation des espaces
   */
  private tokenizeInline(text: string): InlineToken[] {
    const tokens: InlineToken[] = [];
    let position = 0;

    while (position < text.length) {
      const remaining = text.substring(position);
      
      // Essayer de matcher les patterns dans l'ordre de priorité
      const match = this.findNextMatch(remaining);
      
      if (match) {
        // Ajouter le texte avant le match (avec espaces préservés)
        if (match.start > 0) {
          const beforeText = remaining.substring(0, match.start);
          if (beforeText) {
            tokens.push({
              type: 'text',
              content: beforeText,
              start: position,
              end: position + match.start
            });
          }
        }
        
        // Ajouter le token du match
        tokens.push({
          type: match.type,
          content: match.content,
          start: position + match.start,
          end: position + match.end,
          url: match.url,
          annotations: match.annotations
        });
        
        position += match.end;
      } else {
        // Aucun match trouvé, traiter le reste comme texte
        tokens.push({
          type: 'text',
          content: remaining,
          start: position,
          end: text.length
        });
        break;
      }
    }

    return tokens;
  }

  /**
   * ✅ PATCH #1: Trouve le prochain match avec espaces préservés
   */
  private findNextMatch(text: string): InlineMatch | null {
    const patterns: Array<{
      regex: RegExp;
      type: InlineTokenType;
      priority: number;
      extractor: (match: RegExpMatchArray) => Partial<InlineMatch>;
    }> = [
      // Équations inline (priorité maximale)
      {
        regex: /\$([^$\n]+)\$/,
        type: 'equation',
        priority: 100,
        extractor: (m) => ({ content: m[1] })
      },

      // Liens [text](url)
      {
        regex: /\[([^\]]+)\]\(((?:https?:\/\/)?[^)\s]+)\)/,
        type: 'link',
        priority: 95,
        extractor: (m) => ({ content: m[1], url: m[2] })
      },

      // Auto-links
      {
        regex: /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/,
        type: 'link',
        priority: 90,
        extractor: (m) => ({ content: m[1], url: m[1] })
      },

      // ✅ PATCH #1: Bold avec espaces - REGEX CORRIGÉE
      {
        regex: /\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*/,
        type: 'text',
        priority: 80,
        extractor: (m) => ({ 
          content: m[1], 
          annotations: { bold: true } 
        })
      },

      // ✅ PATCH #1: Bold-Italic combiné
      {
        regex: /\*\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*\*/,
        type: 'text',
        priority: 75,
        extractor: (m) => ({ 
          content: m[1], 
          annotations: { bold: true, italic: true } 
        })
      },

      // ✅ PATCH #1: Italic avec espaces
      {
        regex: /\*(?!\s)(?!\*)([^*\n]+?)(?<!\s)\*/,
        type: 'text',
        priority: 70,
        extractor: (m) => ({ 
          content: m[1], 
          annotations: { italic: true } 
        })
      },

      // ✅ PATCH #1: Code inline avec espaces
      {
        regex: /`(?!\s)([^`\n]+?)(?<!\s)`/,
        type: 'text',
        priority: 65,
        extractor: (m) => ({ 
          content: m[1], 
          annotations: { code: true } 
        })
      },

      // ✅ PATCH #1: Strikethrough avec espaces
      {
        regex: /~~(?!\s)([^~\n]+?)(?<!\s)~~/,
        type: 'text',
        priority: 60,
        extractor: (m) => ({ 
          content: m[1], 
          annotations: { strikethrough: true } 
        })
      },

      // ✅ PATCH #1: Underline avec espaces
      {
        regex: /__(?!\s)([^_\n]+?)(?<!\s)__/,
        type: 'text',
        priority: 55,
        extractor: (m) => ({ 
          content: m[1], 
          annotations: { underline: true } 
        })
      }
    ];

    let bestMatch: InlineMatch | null = null;
    let bestPosition = text.length;

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match && match.index !== undefined && match.index < bestPosition) {
        const extracted = pattern.extractor(match);
        
        bestMatch = {
          type: pattern.type,
          content: extracted.content || match[0],
          start: match.index,
          end: match.index + match[0].length,
          url: extracted.url,
          annotations: extracted.annotations
        };
        bestPosition = match.index;
      }
    }

    return bestMatch;
  }

  /**
   * ✅ Construit les segments rich text à partir des tokens
   */
  private buildRichTextFromTokens(tokens: InlineToken[]): NotionRichText[] {
    const segments: NotionRichText[] = [];

    for (const token of tokens) {
      if (token.type === 'equation') {
        segments.push({
          type: 'equation',
          equation: { expression: token.content }
        });
      } else if (token.type === 'link' && token.url) {
        segments.push({
          type: 'text',
          text: {
            content: token.content,
            link: { url: this.sanitizeUrl(token.url) }
          },
          annotations: token.annotations
        });
      } else {
        // Texte normal avec annotations
        segments.push({
          type: 'text',
          text: { content: token.content },
          annotations: token.annotations
        });
      }
    }

    // ✅ PATCH #1: Filtrer seulement les contenus complètement vides
    return segments.filter(segment => {
      if (segment.type === 'text' && segment.text?.content === '') {
        return false;
      }
      return true;
    });
  }

  /**
   * Sanitize une URL
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }
      return urlObj.toString();
    } catch {
      return '';
    }
  }

  /**
   * ✅ API BUILDER: Ajouter du texte simple
   */
  addText(content: string): RichTextBuilder {
    if (content) {
      this.segments.push({
        type: 'text',
        text: { content }
      });
    }
    return this;
  }

  /**
   * ✅ API BUILDER: Ajouter du texte formaté
   */
  addFormattedText(
    content: string, 
    annotations: Partial<NotionRichText['annotations']>
  ): RichTextBuilder {
    if (content) {
      this.segments.push({
        type: 'text',
        text: { content },
        annotations
      });
    }
    return this;
  }

  /**
   * ✅ API BUILDER: Ajouter un lien
   */
  addLink(content: string, url: string): RichTextBuilder {
    if (content && url) {
      this.segments.push({
        type: 'text',
        text: {
          content,
          link: { url: this.sanitizeUrl(url) }
        }
      });
    }
    return this;
  }

  /**
   * ✅ API BUILDER: Ajouter une équation
   */
  addEquation(expression: string): RichTextBuilder {
    if (expression) {
      this.segments.push({
        type: 'equation',
        equation: { expression }
      });
    }
    return this;
  }

  /**
   * ✅ API BUILDER: Construire le résultat final
   */
  build(): NotionRichText[] {
    return [...this.segments];
  }

  /**
   * ✅ API BUILDER: Réinitialiser le builder
   */
  reset(): RichTextBuilder {
    this.segments = [];
    return this;
  }

  /**
   * ✅ API STATIQUE: Créer du texte simple
   */
  static text(content: string): NotionRichText[] {
    return [{
      type: 'text',
      text: { content }
    }];
  }

  /**
   * ✅ API STATIQUE: Créer du texte formaté
   */
  static formatted(
    content: string, 
    annotations: Partial<NotionRichText['annotations']>
  ): NotionRichText[] {
    return [{
      type: 'text',
      text: { content },
      annotations
    }];
  }

  /**
   * ✅ API STATIQUE: Créer un lien
   */
  static link(content: string, url: string): NotionRichText[] {
    return [{
      type: 'text',
      text: {
        content,
        link: { url }
      }
    }];
  }
}

/**
 * Types internes pour la tokenization inline
 */
type InlineTokenType = 'text' | 'link' | 'equation';

interface InlineToken {
  type: InlineTokenType;
  content: string;
  start: number;
  end: number;
  url?: string;
  annotations?: Partial<NotionRichText['annotations']>;
}

interface InlineMatch {
  type: InlineTokenType;
  content: string;
  start: number;
  end: number;
  url?: string;
  annotations?: Partial<NotionRichText['annotations']>;
}