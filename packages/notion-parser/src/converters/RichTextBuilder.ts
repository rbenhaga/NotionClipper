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
   * ✅ API PRINCIPALE: Parse du markdown vers rich text avec support des imbrications
   */
  static fromMarkdown(text: string): NotionRichText[] {
    if (!text) return [{ type: 'text', text: { content: '' }, annotations: RichTextBuilder.defaultAnnotations() }];

    // Utiliser la nouvelle méthode avec support des imbrications
    return RichTextBuilder.parseWithNesting(text);
  }

  /**
   * ✅ NOUVEAU: Parse avec support complet des imbrications
   */
  private static parseWithNesting(text: string): NotionRichText[] {
    const tokens = RichTextBuilder.tokenizeAdvanced(text);
    return RichTextBuilder.buildFromTokens(tokens);
  }

  /**
   * ✅ NOUVEAU: Tokenization avancée avec gestion des imbrications
   */
  private static tokenizeAdvanced(text: string): AdvancedToken[] {
    const tokens: AdvancedToken[] = [];
    let i = 0;

    while (i < text.length) {
      // ✅ PRIORITÉ 1: Gras-Italique combiné ***text*** (traiter en premier)
      if (text.substring(i, i + 3) === '***') {
        const endPos = text.indexOf('***', i + 3);
        if (endPos !== -1) {
          const content = text.substring(i + 3, endPos);
          const nestedTokens = RichTextBuilder.tokenizeAdvanced(content);
          tokens.push({
            type: 'formatted',
            content,
            start: i,
            end: endPos + 3,
            annotations: { bold: true, italic: true },
            nested: nestedTokens
          });
          i = endPos + 3;
          continue;
        }
      }

      // ✅ PRIORITÉ 2: Gras **text** (seulement si ce n'est pas ***)
      if (text.substring(i, i + 2) === '**' && text.substring(i, i + 3) !== '***') {
        const endPos = text.indexOf('**', i + 2);
        if (endPos !== -1) {
          const content = text.substring(i + 2, endPos);
          const nestedTokens = RichTextBuilder.tokenizeAdvanced(content);
          tokens.push({
            type: 'formatted',
            content,
            start: i,
            end: endPos + 2,
            annotations: { bold: true },
            nested: nestedTokens
          });
          i = endPos + 2;
          continue;
        }
      }

      // Italique *text* (amélioration pour éviter les conflits avec ***)
      if (text[i] === '*' && text[i + 1] !== '*' && text[i - 1] !== '*') {
        const endPos = text.indexOf('*', i + 1);
        if (endPos !== -1 && text[endPos + 1] !== '*' && text[endPos - 1] !== '*') {
          const content = text.substring(i + 1, endPos);
          const nestedTokens = RichTextBuilder.tokenizeAdvanced(content);
          tokens.push({
            type: 'formatted',
            content,
            start: i,
            end: endPos + 1,
            annotations: { italic: true },
            nested: nestedTokens
          });
          i = endPos + 1;
          continue;
        }
      }

      // Souligné __text__
      if (text.substring(i, i + 2) === '__') {
        const endPos = text.indexOf('__', i + 2);
        if (endPos !== -1) {
          const content = text.substring(i + 2, endPos);
          const nestedTokens = RichTextBuilder.tokenizeAdvanced(content);
          tokens.push({
            type: 'formatted',
            content,
            start: i,
            end: endPos + 2,
            annotations: { underline: true },
            nested: nestedTokens
          });
          i = endPos + 2;
          continue;
        }
      }

      // Barré ~~text~~
      if (text.substring(i, i + 2) === '~~') {
        const endPos = text.indexOf('~~', i + 2);
        if (endPos !== -1) {
          const content = text.substring(i + 2, endPos);
          const nestedTokens = RichTextBuilder.tokenizeAdvanced(content);
          tokens.push({
            type: 'formatted',
            content,
            start: i,
            end: endPos + 2,
            annotations: { strikethrough: true },
            nested: nestedTokens
          });
          i = endPos + 2;
          continue;
        }
      }

      // Code inline `code`
      if (text[i] === '`') {
        const endPos = text.indexOf('`', i + 1);
        if (endPos !== -1) {
          const content = text.substring(i + 1, endPos);
          tokens.push({
            type: 'code',
            content,
            start: i,
            end: endPos + 1,
            annotations: { code: true }
          });
          i = endPos + 1;
          continue;
        }
      }

      // Liens [text](url)
      if (text[i] === '[') {
        const linkEnd = text.indexOf('](', i);
        if (linkEnd !== -1) {
          const urlEnd = text.indexOf(')', linkEnd + 2);
          if (urlEnd !== -1) {
            const linkText = text.substring(i + 1, linkEnd);
            const url = text.substring(linkEnd + 2, urlEnd);
            const nestedTokens = RichTextBuilder.tokenizeAdvanced(linkText);
            tokens.push({
              type: 'link',
              content: linkText,
              start: i,
              end: urlEnd + 1,
              url,
              nested: nestedTokens
            });
            i = urlEnd + 1;
            continue;
          }
        }
      }

      // Texte normal - chercher le prochain caractère spécial
      let textEnd = i + 1;
      while (textEnd < text.length &&
        text[textEnd] !== '*' &&
        text[textEnd] !== '_' &&
        text[textEnd] !== '~' &&
        text[textEnd] !== '`' &&
        text[textEnd] !== '[') {
        textEnd++;
      }

      if (textEnd > i + 1 || textEnd === text.length) {
        const content = text.substring(i, textEnd);
        tokens.push({
          type: 'text',
          content,
          start: i,
          end: textEnd
        });
        i = textEnd;
      } else {
        // Caractère spécial non matché, traiter comme texte normal
        tokens.push({
          type: 'text',
          content: text[i],
          start: i,
          end: i + 1
        });
        i++;
      }
    }

    return tokens;
  }

  /**
   * ✅ NOUVEAU: Construire les segments rich text depuis les tokens
   */
  private static buildFromTokens(tokens: AdvancedToken[]): NotionRichText[] {
    const segments: NotionRichText[] = [];

    for (const token of tokens) {
      if (token.type === 'text') {
        segments.push(RichTextBuilder.createTextSegment(token.content));
      } else if (token.type === 'code') {
        segments.push(RichTextBuilder.createCodeSegment(token.content));
      } else if (token.type === 'link') {
        if (token.nested && token.nested.length > 0) {
          // Lien avec formatage imbriqué
          const nestedSegments = RichTextBuilder.buildFromTokens(token.nested);
          for (const segment of nestedSegments) {
            const sanitizedUrl = RichTextBuilder.sanitizeUrlStatic(token.url || '');
            if (sanitizedUrl) {
              segments.push({
                ...segment,
                text: {
                  content: segment.text?.content || token.content,
                  link: { url: sanitizedUrl }
                }
              });
            } else {
              segments.push(segment);
            }
          }
        } else {
          segments.push(RichTextBuilder.createLinkSegment(token.content, token.url || ''));
        }
      } else if (token.type === 'formatted') {
        if (token.nested && token.nested.length > 0) {
          // Formatage avec imbrications
          const nestedSegments = RichTextBuilder.buildFromTokens(token.nested);
          for (const segment of nestedSegments) {
            const mergedAnnotations = {
              ...RichTextBuilder.defaultAnnotations(),
              ...segment.annotations,
              ...token.annotations
            };
            segments.push({
              ...segment,
              annotations: mergedAnnotations
            });
          }
        } else {
          // Formatage simple
          segments.push({
            type: 'text',
            text: { content: token.content },
            annotations: {
              ...RichTextBuilder.defaultAnnotations(),
              ...token.annotations
            }
          });
        }
      }
    }

    return segments.length > 0 ? segments : [{ type: 'text', text: { content: '' }, annotations: RichTextBuilder.defaultAnnotations() }];
  }

  private static createTextSegment(text: string): NotionRichText {
    return {
      type: 'text',
      text: { content: text },
      annotations: RichTextBuilder.defaultAnnotations()
    };
  }

  private static createLinkSegment(text: string, url: string): NotionRichText {
    // ✅ FIX: Valider l'URL avant de créer le lien
    const builder = new RichTextBuilder();
    const sanitizedUrl = builder.sanitizeUrl(url);

    if (sanitizedUrl) {
      return {
        type: 'text',
        text: { content: text, link: { url: sanitizedUrl } },
        annotations: RichTextBuilder.defaultAnnotations()
      };
    } else {
      // URL invalide - retourner comme texte normal
      return {
        type: 'text',
        text: { content: text },
        annotations: RichTextBuilder.defaultAnnotations()
      };
    }
  }

  private static createCodeSegment(text: string): NotionRichText {
    return {
      type: 'text',
      text: { content: text },
      annotations: { ...RichTextBuilder.defaultAnnotations(), code: true }
    };
  }

  private static createBoldSegment(text: string): NotionRichText {
    return {
      type: 'text',
      text: { content: text },
      annotations: { ...RichTextBuilder.defaultAnnotations(), bold: true }
    };
  }

  private static createItalicSegment(text: string): NotionRichText {
    return {
      type: 'text',
      text: { content: text },
      annotations: { ...RichTextBuilder.defaultAnnotations(), italic: true }
    };
  }

  private static createStrikeSegment(text: string): NotionRichText {
    return {
      type: 'text',
      text: { content: text },
      annotations: { ...RichTextBuilder.defaultAnnotations(), strikethrough: true }
    };
  }

  private static defaultAnnotations() {
    return {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default' as const
    };
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
          extractor: (m) => {
            const url = m[2] && m[2].trim();
            // ✅ FIX: Rejeter les URLs trop courtes ou invalides
            if (!url || url.length < 4 || url === 'x' || url === '#' || url === 'url') {
              return { content: m[1], url: undefined };
            }
            return { content: m[1], url };
          }
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
   * ✅ NOUVEAU: Version statique de sanitizeUrl
   */
  private static sanitizeUrlStatic(url: string): string {
    if (!url || url.trim() === '') {
      return '';
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl.length < 4 || trimmedUrl === 'x' || trimmedUrl === '#' || trimmedUrl === 'url') {
      return '';
    }

    try {
      // Si l'URL n'a pas de protocole, ajouter https://
      let fullUrl = trimmedUrl;
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        // Vérifier si c'est un domaine valide
        if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
          fullUrl = `https://${trimmedUrl}`;
        } else {
          return '';
        }
      }

      const urlObj = new URL(fullUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }
      return urlObj.toString();
    } catch {
      return '';
    }
  }

  /**
   * Sanitize une URL
   */
  private sanitizeUrl(url: string): string {
    if (!url || url.trim() === '') {
      return '';
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl.length < 4 || trimmedUrl === 'x' || trimmedUrl === '#' || trimmedUrl === 'url') {
      console.warn(`[RichTextBuilder] Invalid URL rejected: "${trimmedUrl}"`);
      return '';
    }

    try {
      // Si l'URL n'a pas de protocole, ajouter https://
      let fullUrl = trimmedUrl;
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        // Vérifier si c'est un domaine valide
        if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
          fullUrl = `https://${trimmedUrl}`;
        } else {
          console.warn(`[RichTextBuilder] Invalid URL format rejected: "${trimmedUrl}"`);
          return '';
        }
      }

      const urlObj = new URL(fullUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }
      return urlObj.toString();
    } catch {
      console.warn(`[RichTextBuilder] URL parsing failed: "${trimmedUrl}"`);
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

/**
 * ✅ NOUVEAU: Types pour la tokenization avancée avec imbrications
 */
interface AdvancedToken {
  type: 'text' | 'formatted' | 'code' | 'link';
  content: string;
  start: number;
  end: number;
  annotations?: Partial<NotionRichText['annotations']>;
  url?: string;
  nested?: AdvancedToken[];
}