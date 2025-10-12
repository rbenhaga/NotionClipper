import type { NotionRichText, NotionColor } from '../types';
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

    // Nouvelle approche: tokenisation puis reconstruction SIMPLE
    const tokens = this.tokenizeText(processedText, options);
    return this.tokensToRichTextSimple(tokens, processedText);
  }

  private processEscapes(text: string): string {
    // Remplacer les échappements par des placeholders temporaires
    const escapeMap = new Map<string, string>();
    let counter = 0;

    // Traiter les échappements de caractères spéciaux
    const escapedChars = ['*', '_', '`', '~', '[', ']', '(', ')', '#', '>', '|', '$', '%', '&', '@', '!'];

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

  private tokenizeText(text: string, options?: { convertLinks?: boolean }): TextToken[] {
    const tokens: TextToken[] = [];
    const processedRanges: Array<{ start: number; end: number }> = [];

    // Définir les patterns dans l'ordre de priorité (plus prioritaire en premier)
    const patterns: Array<{ regex: RegExp; type: TextToken['type'] }> = [
      // Équations (priorité absolue)
      { regex: /\$([^$]+)\$/g, type: 'equation' },

      // Bold + Italic (***text***) - AVANT bold et italic
      { regex: /\*\*\*([^*]+)\*\*\*/g, type: 'bold-italic' },

      // Bold (**text**) - AVANT code pour permettre formatage imbriqué
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },

      // Code inline (après bold pour permettre **text avec `code`**)
      { regex: /`([^`]+)`/g, type: 'code' },

      // Underline (__text__) - AVANT italic underscore
      { regex: /__([^_]+)__/g, type: 'underline' },

      // Strikethrough (~~text~~)
      { regex: /~~([^~]+)~~/g, type: 'strikethrough' },

      // Italic (*text* or _text_) - EN DERNIER, plus strict pour éviter les faux positifs
      { regex: /\*([^\s*][^*]*[^\s*]|\w)\*/g, type: 'italic' },
      { regex: /_([^\s_][^_]*[^\s_]|\w)_/g, type: 'italic' }
    ];

    // Ajouter les patterns de liens si activés
    if (options?.convertLinks !== false) {
      // Insérer les liens après le code mais avant le formatage
      patterns.splice(2, 0,
        { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
        { regex: /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g, type: 'auto-link' }
      );
    }

    // Traiter chaque pattern séquentiellement
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex.source, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;

        // Vérifier si cette zone a déjà été traitée
        const isAlreadyProcessed = processedRanges.some(range =>
          (start >= range.start && start < range.end) ||
          (end > range.start && end <= range.end) ||
          (start <= range.start && end >= range.end)
        );

        if (isAlreadyProcessed) {
          continue;
        }

        // Créer le token
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

        tokens.push({
          type: pattern.type,
          content,
          start,
          end,
          url,
          expression
        });

        // Marquer cette zone comme traitée
        processedRanges.push({ start, end });
      }
    });

    // Trier les tokens par position
    return tokens.sort((a, b) => a.start - b.start);
  }

  // VERSION SIMPLE QUI PRÉSERVE LES ESPACES ORIGINAUX
  private tokensToRichTextSimple(tokens: TextToken[], originalText: string): NotionRichText[] {
    if (tokens.length === 0) {
      return [{
        type: 'text',
        text: { content: this.restoreEscapes(originalText) }
      }];
    }

    // Filtrer les tokens qui se chevauchent
    const filteredTokens = this.resolveOverlappingTokens(tokens);

    const result: NotionRichText[] = [];
    let lastEnd = 0;

    filteredTokens.forEach((token) => {
      // Ajouter le texte avant ce token (PRÉSERVE TOUS LES ESPACES ORIGINAUX)
      if (token.start > lastEnd) {
        const beforeText = originalText.slice(lastEnd, token.start);
        if (beforeText) {
          result.push({
            type: 'text',
            text: { content: this.restoreEscapes(beforeText) }
          });
        }
      }

      // Ajouter le token formaté
      if (token.type === 'equation') {
        // Vérifier s'il faut ajouter un espace avant l'équation
        const lastResult = result[result.length - 1];
        const needsSpaceBefore = result.length > 0 &&
          lastResult?.type === 'text' &&
          lastResult.text?.content &&
          !lastResult.text.content.endsWith(' ') &&
          token.start > 0 &&
          /\w/.test(originalText[token.start - 1]); // Caractère alphanumérique avant

        if (needsSpaceBefore && lastResult?.type === 'text' && lastResult.text) {
          lastResult.text.content += ' ';
        }

        result.push({
          type: 'equation',
          equation: { expression: token.expression || token.content }
        });

        // Vérifier s'il faut ajouter un espace après l'équation
        const needsSpaceAfter = token.end < originalText.length &&
          /\w/.test(originalText[token.end]); // Caractère alphanumérique après

        if (needsSpaceAfter) {
          result.push({
            type: 'text',
            text: { content: ' ' }
          });
        }
      } else {
        const annotations: any = {};

        // Appliquer les annotations selon le type
        if (token.type === 'bold') annotations.bold = true;
        if (token.type === 'italic') annotations.italic = true;
        if (token.type === 'bold-italic') {
          annotations.bold = true;
          annotations.italic = true;
        }
        if (token.type === 'code') annotations.code = true;
        if (token.type === 'strikethrough') annotations.strikethrough = true;
        if (token.type === 'underline') annotations.underline = true;

        const textContent: any = { content: this.restoreEscapes(token.content) };

        // Ajouter le lien si c'est un token de lien
        if ((token.type === 'link' || token.type === 'auto-link') && token.url) {
          textContent.link = { url: token.url };
        }

        result.push({
          type: 'text',
          text: textContent,
          annotations: Object.keys(annotations).length > 0 ? annotations : undefined
        });
      }

      lastEnd = token.end;
    });

    // Ajouter le texte restant (PRÉSERVE TOUS LES ESPACES ORIGINAUX)
    if (lastEnd < originalText.length) {
      const remainingText = originalText.slice(lastEnd);
      if (remainingText) {
        result.push({
          type: 'text',
          text: { content: this.restoreEscapes(remainingText) }
        });
      }
    }

    // FILTRER LES SEGMENTS DE TEXTE VIDES
    const filteredResult = result.filter(item => {
      if (item.type === 'text' && item.text?.content === '') {
        return false; // Supprimer les segments de texte vides
      }
      return true;
    });

    return filteredResult.length > 0 ? filteredResult : [{
      type: 'text',
      text: { content: this.restoreEscapes(originalText) }
    }];
  }

  private resolveOverlappingTokens(tokens: TextToken[]): TextToken[] {
    // Trier par position puis par priorité
    const sortedTokens = tokens.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return this.getTokenPriority(a.type) - this.getTokenPriority(b.type);
    });

    const result: TextToken[] = [];

    sortedTokens.forEach(token => {
      // Vérifier s'il y a un chevauchement avec un token déjà accepté
      const hasOverlap = result.some(existing =>
        (token.start < existing.end && token.end > existing.start)
      );

      if (!hasOverlap) {
        result.push(token);
      }
    });

    return result.sort((a, b) => a.start - b.start);
  }

  private getTokenPriority(type: TextToken['type']): number {
    const priorities = {
      'equation': 1,
      'code': 2,
      'link': 3,
      'auto-link': 3,
      'bold-italic': 4,
      'bold': 5,
      'underline': 6,
      'italic': 7,
      'strikethrough': 8,
      'text': 9
    };
    return priorities[type] || 9;
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
}