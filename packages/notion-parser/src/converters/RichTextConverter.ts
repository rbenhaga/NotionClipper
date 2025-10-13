import type { NotionRichText, NotionColor } from '../types/notion';
import { ContentSanitizer } from '../security/ContentSanitizer';

interface TextToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'strikethrough' | 'underline' | 'link' | 'auto-link' | 'equation' | 'bold-italic';
  content: string;
  start: number;
  end: number;
  url?: string;
  expression?: string;
}

export class RichTextConverter {
  parseRichText(text: string, options?: { convertLinks?: boolean }): NotionRichText[] {
    if (!text) return [];

    // Sanitiser le contenu d'abord
    const sanitizedText = ContentSanitizer.sanitizeText(text);

    // Traiter les échappements d'abord
    const processedText = this.processEscapes(sanitizedText);

    // Approche simplifiée mais efficace
    const tokens = this.tokenizeTextSimple(processedText, options);
    return this.tokensToRichTextSimple(tokens, processedText);
  }

  private processEscapes(text: string): string {
    // Remplacer les échappements par des placeholders temporaires
    const escapeMap = new Map<string, string>();
    let counter = 0;

    // Traiter les échappements de caractères spéciaux
    const escapedChars = ['*', '_', '`', '~', '[', ']', '(', ')', '#', '>', '|', '%', '&', '@', '!'];

    let result = text;

    escapedChars.forEach(char => {
      const escapedPattern = new RegExp(`\\\\\\${char}`, 'g');
      result = result.replace(escapedPattern, () => {
        const placeholder = `§ESC${counter++}§`;
        escapeMap.set(placeholder, char);
        return placeholder;
      });
    });

    // Stocker la map pour la restauration
    (this as any)._escapeMap = escapeMap;

    return result;
  }

  private restoreEscapes(text: string): string {
    const escapeMap = (this as any)._escapeMap as Map<string, string>;
    if (!escapeMap) return text;

    let result = text;
    escapeMap.forEach((char, placeholder) => {
      result = result.replace(new RegExp(placeholder, 'g'), char);
    });

    return result;
  }

  private tokenizeTextSimple(text: string, options?: { convertLinks?: boolean }): TextToken[] {
    const tokens: TextToken[] = [];

    // Patterns ordonnés par priorité (plus spécifique en premier)
    const patterns: Array<{ regex: RegExp; type: TextToken['type'] }> = [
      // Équations (priorité absolue)
      { regex: /\$([^$\n]+)\$/g, type: 'equation' },

      // Bold + Italic (***text***)
      { regex: /\*\*\*([^*\n]+)\*\*\*/g, type: 'bold-italic' },

      // Bold (**text**)
      { regex: /\*\*([^*\n]+)\*\*/g, type: 'bold' },

      // Code inline - Support doubles backticks ET simples
      { regex: /``([^`\n]*(?:`[^`\n]*)*?)``/g, type: 'code' }, // Doubles backticks (priorité)
      { regex: /`([^`\n]+)`/g, type: 'code' }, // Simples backticks

      // Underline (__text__)
      { regex: /__([^_\n]+)__/g, type: 'underline' },

      // Strikethrough (~~text~~)
      { regex: /~~([^~\n]+)~~/g, type: 'strikethrough' },

      // Italic (*text* ou _text_) - Plus restrictif
      { regex: /\*([^\s*\n][^*\n]*[^\s*\n]|\w)\*/g, type: 'italic' },
      { regex: /_([^\s_\n][^_\n]*[^\s_\n]|\w)_/g, type: 'italic' }
    ];

    // Ajouter les liens si activés
    if (options?.convertLinks !== false) {
      patterns.unshift(
        { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
        { regex: /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g, type: 'auto-link' }
      );
    }

    // Trouver tous les matches
    const allMatches: Array<{
      type: TextToken['type'];
      content: string;
      start: number;
      end: number;
      url?: string;
      expression?: string;
    }> = [];

    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex.source, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;

        let content = match[1];
        let url: string | undefined;
        let expression: string | undefined;

        if (pattern.type === 'link') {
          content = match[1];
          url = ContentSanitizer.sanitizeUrl(match[2]);
        } else if (pattern.type === 'auto-link') {
          content = match[1];
          url = ContentSanitizer.sanitizeUrl(match[1]);
        } else if (pattern.type === 'equation') {
          expression = match[1];
          content = match[1];
        }

        allMatches.push({
          type: pattern.type,
          content,
          start,
          end,
          url,
          expression
        });
      }
    });

    // Trier par position et résoudre les conflits
    allMatches.sort((a, b) => a.start - b.start);

    // Résoudre les chevauchements avec priorité aux éléments externes
    const resolvedMatches = this.resolveMatchesSimple(allMatches);

    // Convertir en tokens avec texte intercalé
    let currentPos = 0;

    for (const match of resolvedMatches) {
      // Ajouter le texte avant ce match
      if (match.start > currentPos) {
        tokens.push({
          type: 'text',
          content: text.substring(currentPos, match.start),
          start: currentPos,
          end: match.start
        });
      }

      // Ajouter le token formaté
      tokens.push({
        type: match.type,
        content: match.content,
        start: match.start,
        end: match.end,
        url: match.url,
        expression: match.expression
      });

      currentPos = match.end;
    }

    // Ajouter le texte restant
    if (currentPos < text.length) {
      tokens.push({
        type: 'text',
        content: text.substring(currentPos),
        start: currentPos,
        end: text.length
      });
    }

    return tokens;
  }

  private tokensToRichTextSimple(tokens: TextToken[], originalText: string): NotionRichText[] {
    if (tokens.length === 0) {
      return [{
        type: 'text',
        text: { content: this.restoreEscapes(originalText) }
      }];
    }

    const result: NotionRichText[] = [];

    for (const token of tokens) {
      if (token.type === 'equation' && token.expression) {
        result.push({
          type: 'equation',
          equation: { expression: token.expression }
        });
      } else if ((token.type === 'link' || token.type === 'auto-link') && token.url) {
        result.push({
          type: 'text',
          text: {
            content: this.restoreEscapes(token.content),
            link: { url: token.url }
          }
        });
      } else {
        // Token de texte avec formatage
        const annotations: any = {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default' as NotionColor
        };

        // Appliquer les annotations selon le type
        switch (token.type) {
          case 'bold':
            annotations.bold = true;
            break;
          case 'italic':
            annotations.italic = true;
            break;
          case 'bold-italic':
            annotations.bold = true;
            annotations.italic = true;
            break;
          case 'code':
            annotations.code = true;
            break;
          case 'strikethrough':
            annotations.strikethrough = true;
            break;
          case 'underline':
            annotations.underline = true;
            break;
        }

        result.push({
          type: 'text',
          text: { content: this.restoreEscapes(token.content) },
          annotations: token.type === 'text' ? undefined : annotations
        });
      }
    }

    // Filtrer les segments vides
    return result.filter(item => {
      if (item.type === 'text' && item.text?.content === '') {
        return false;
      }
      return true;
    });
  }

  /**
   * Convertit du texte simple en rich text
   */
  createSimpleRichText(content: string): NotionRichText[] {
    return [{
      type: 'text',
      text: { content }
    }];
  }

  /**
   * Crée un rich text avec formatage spécifique
   */
  createFormattedRichText(
    content: string,
    formatting: {
      bold?: boolean;
      italic?: boolean;
      strikethrough?: boolean;
      underline?: boolean;
      code?: boolean;
      color?: NotionColor;
    }
  ): NotionRichText[] {
    return [{
      type: 'text',
      text: { content },
      annotations: formatting
    }];
  }

  /**
   * Crée un rich text avec lien
   */
  createLinkRichText(content: string, url: string): NotionRichText[] {
    return [{
      type: 'text',
      text: {
        content,
        link: { url: ContentSanitizer.sanitizeUrl(url) }
      }
    }];
  }

  /**
   * Crée un rich text avec équation
   */
  createEquationRichText(expression: string): NotionRichText[] {
    return [{
      type: 'equation',
      equation: { expression }
    }];
  }

  /**
   * Combine plusieurs rich texts
   */
  combineRichText(...richTexts: NotionRichText[][]): NotionRichText[] {
    return richTexts.flat();
  }

  /**
   * Tronque un rich text à une longueur maximale
   */
  truncateRichText(richText: NotionRichText[], maxLength: number): NotionRichText[] {
    let currentLength = 0;
    const result: NotionRichText[] = [];

    for (const item of richText) {
      if (item.type === 'text' && item.text) {
        const content = item.text.content;
        if (currentLength + content.length <= maxLength) {
          result.push(item);
          currentLength += content.length;
        } else {
          const remainingLength = maxLength - currentLength;
          if (remainingLength > 0) {
            result.push({
              ...item,
              text: {
                ...item.text,
                content: content.substring(0, remainingLength) + '...'
              }
            });
          }
          break;
        }
      } else if (item.type === 'equation') {
        // Les équations comptent comme 1 caractère
        if (currentLength + 1 <= maxLength) {
          result.push(item);
          currentLength += 1;
        } else {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Résout les matches avec priorité aux éléments les plus longs (externes)
   */
  private resolveMatchesSimple(allMatches: Array<{
    type: TextToken['type'];
    content: string;
    start: number;
    end: number;
    url?: string;
    expression?: string;
  }>): typeof allMatches {
    // Trier par longueur décroissante (les plus longs en premier)
    // puis par position
    allMatches.sort((a, b) => {
      const lengthDiff = (b.end - b.start) - (a.end - a.start);
      if (lengthDiff !== 0) return lengthDiff;
      return a.start - b.start;
    });

    const resolved: typeof allMatches = [];
    
    for (const match of allMatches) {
      // Vérifier s'il y a un conflit avec un match déjà accepté
      const hasConflict = resolved.some(existing =>
        // Chevauchement partiel (pas d'imbrication complète)
        (match.start < existing.end && match.end > existing.start) &&
        !(match.start >= existing.start && match.end <= existing.end) &&
        !(existing.start >= match.start && existing.end <= match.end)
      );
      
      if (!hasConflict) {
        resolved.push(match);
      }
    }

    return resolved.sort((a, b) => a.start - b.start);
  }
}