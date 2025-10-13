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
   * ✅ PATCH #1: Tokenization inline avec préservation des espaces et gestion des imbrications
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
        
        // ✅ NOUVEAU: Gestion des formatages imbriqués
        if (match.annotations && this.hasNestedFormatting(match.content)) {
          // Parser récursivement le contenu pour les imbrications
          const nestedTokens = this.tokenizeInline(match.content);
          
          // Appliquer les annotations du parent à tous les tokens enfants
          for (const nestedToken of nestedTokens) {
            const mergedAnnotations = { ...nestedToken.annotations, ...match.annotations };
            tokens.push({
              ...nestedToken,
              annotations: mergedAnnotations,
              start: position + match.start,
              end: position + match.start + nestedToken.content.length
            });
          }
        } else {
          // Ajouter le token du match normalement
          tokens.push({
            type: match.type,
            content: match.content,
            start: position + match.start,
            end: position + match.end,
            url: match.url,
            annotations: match.annotations
          });
        }
        
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
   * ✅ NOUVEAU: Détecte si le contenu contient des formatages imbriqués
   */
  private hasNestedFormatting(content: string): boolean {
    const nestedPatterns = [
      /\*[^*]+\*/,     // Italique dans autre chose
      /\*\*[^*]+\*\*/, // Gras dans autre chose
      /`[^`]+`/,       // Code dans autre chose
      /~~[^~]+~~/,     // Barré dans autre chose
      /__[^_]+__/      // Souligné dans autre chose
    ];
    
    return nestedPatterns.some(pattern => pattern.test(content));
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

      // Liens [text](url) - ✅ CORRECTION: Exiger au moins un caractère dans l'URL
      {
        regex: /\[([^\]]+)\]\(((?:https?:\/\/)?[^)\s]+)\)/,
        type: 'link',
        priority: 95,
        extractor: (m) => ({ 
          content: m[1], 
          url: m[2] && m[2].trim() ? m[2] : undefined // ✅ Retourner undefined si URL vide
        })
      },

      // Auto-links
      {
        regex: /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/,
        type: 'link',
        priority: 90,
        extractor: (m) => ({ content: m[1], url: m[1] })
      },

      // ✅ CORRECTION: Bold-Italic combiné (priorité plus haute pour éviter conflicts)
      {
        regex: /\*\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*\*/,
        type: 'text',
        priority: 85,
        extractor: (m) => ({ 
          content: m[1], 
          annotations: { bold: true, italic: true } 
        })
      },

      // ✅ CORRECTION: Bold avec gestion des imbrications - REGEX AMÉLIORÉE
      {
        regex: /\*\*(?!\s)([^*\n]*(?:\*[^*\n]*\*[^*\n]*)*)(?<!\s)\*\*/,
        type: 'text',
        priority: 80,
        extractor: (m) => ({ 
          content: m[1], 
          annotations: { bold: true } 
        })
      },

      // ✅ CORRECTION: Italic avec gestion des imbrications
      {
        regex: /\*(?!\s)(?!\*)([^*\n]*(?:\*\*[^*\n]*\*\*[^*\n]*)*)(?<!\s)\*/,
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
        const sanitizedUrl = this.sanitizeUrl(token.url);
        
        // ✅ CORRECTION: Si l'URL est vide après sanitization, traiter comme texte normal
        if (sanitizedUrl) {
          segments.push({
            type: 'text',
            text: {
              content: token.content,
              link: { url: sanitizedUrl }
            },
            annotations: token.annotations
          });
        } else {
          // URL invalide - traiter comme texte normal
          segments.push({
            type: 'text',
            text: { content: token.content },
            annotations: token.annotations
          });
        }
      } else {
        // Texte normal avec annotations
        segments.push({
          type: 'text',
          text: { content: token.content },
          annotations: token.annotations
        });
      }
    }

    // ✅ PATCH #1: Filtrer les contenus vides ET les liens avec URLs vides
    return segments.filter(segment => {
      if (segment.type === 'text' && segment.text?.content === '') {
        return false;
      }
      
      // ✅ CORRECTION: Filtrer les liens avec URLs vides
      if (segment.type === 'text' && segment.text?.link?.url === '') {
        // Convertir en texte normal sans lien
        delete segment.text.link;
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
      const sanitizedUrl = this.sanitizeUrl(url);
      
      // ✅ CORRECTION: Si l'URL est vide après sanitization, traiter comme texte normal
      if (sanitizedUrl) {
        this.segments.push({
          type: 'text',
          text: {
            content,
            link: { url: sanitizedUrl }
          }
        });
      } else {
        // URL invalide - ajouter comme texte normal
        this.segments.push({
          type: 'text',
          text: { content }
        });
      }
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
    // ✅ CORRECTION: Sanitizer l'URL avant de créer le lien
    const builder = new RichTextBuilder();
    const sanitizedUrl = builder.sanitizeUrl(url);
    
    if (sanitizedUrl) {
      return [{
        type: 'text',
        text: {
          content,
          link: { url: sanitizedUrl }
        }
      }];
    } else {
      // URL invalide - retourner comme texte normal
      return [{
        type: 'text',
        text: { content }
      }];
    }
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