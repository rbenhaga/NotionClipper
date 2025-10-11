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

    // Nouvelle approche: tokenisation puis reconstruction
    const tokens = this.tokenizeText(processedText, options);
    return this.tokensToRichText(tokens, processedText);
  }

  private processEscapes(text: string): string {
    // Remplacer les échappements par des placeholders temporaires
    const escapeMap = new Map<string, string>();
    let counter = 0;

    // Traiter les échappements de caractères spéciaux
    const escapedChars = ['*', '_', '`', '~', '[', ']', '(', ')', '$'];

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

    // Définir tous les patterns avec leurs priorités
    const patterns: Array<{ regex: RegExp; type: TextToken['type']; priority: number }> = [
      // Équations (priorité la plus haute - pas d'imbrication)
      { regex: /\$([^$]+)\$/g, type: 'equation', priority: 1 },

      // Code inline (priorité haute - peut être imbriqué)
      { regex: /`([^`]+)`/g, type: 'code', priority: 2 },

      // Bold + Italic (***text***)
      { regex: /\*\*\*([^*]+)\*\*\*/g, type: 'bold-italic', priority: 4 },

      // Bold (**text**)
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold', priority: 5 },

      // Underline (__text__)
      { regex: /__([^_]+)__/g, type: 'underline', priority: 6 },

      // Italic (*text* or _text_)
      { regex: /\*([^*]+)\*/g, type: 'italic', priority: 7 },
      { regex: /_([^_]+)_/g, type: 'italic', priority: 7 },

      // Strikethrough (~~text~~)
      { regex: /~~([^~]+)~~/g, type: 'strikethrough', priority: 8 }
    ];

    // Ajouter les patterns de liens seulement si convertLinks n'est pas false
    if (options?.convertLinks !== false) {
      patterns.push(
        // Links (priorité haute - peut contenir du formatage)
        { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link', priority: 3 },

        // URLs auto-détectées (priorité haute)
        { regex: /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g, type: 'auto-link', priority: 3 }
      );
    }

    // Trouver tous les matches avec leurs positions
    const allMatches: Array<{
      match: RegExpExecArray;
      type: string;
      priority: number;
      start: number;
      end: number;
      content: string;
      url?: string;
      expression?: string;
    }> = [];

    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex.source, 'g');

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
        } else if (pattern.type === 'bold-italic') {
          // Traiter comme bold ET italic
          allMatches.push({
            match,
            type: 'bold',
            priority: pattern.priority,
            start,
            end,
            content
          });
          allMatches.push({
            match,
            type: 'italic',
            priority: pattern.priority,
            start,
            end,
            content
          });
          continue;
        }

        allMatches.push({
          match,
          type: pattern.type,
          priority: pattern.priority,
          start,
          end,
          content,
          url,
          expression
        });
      }
    });

    // Trier par position puis par priorité
    allMatches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.priority - b.priority;
    });

    return allMatches.map(m => ({
      type: m.type as TextToken['type'],
      content: m.content,
      start: m.start,
      end: m.end,
      url: m.url,
      expression: m.expression
    }));
  }

  private tokensToRichText(tokens: TextToken[], originalText: string): NotionRichText[] {
    if (tokens.length === 0) {
      return [{
        type: 'text',
        text: { content: this.restoreEscapes(originalText) }
      }];
    }

    const result: NotionRichText[] = [];
    const segments = this.createSegments(tokens, originalText);

    segments.forEach(segment => {
      if (segment.type === 'equation') {
        result.push({
          type: 'equation',
          equation: { expression: segment.expression || segment.content }
        });
      } else {
        const annotations: any = {};

        // Appliquer toutes les annotations qui s'appliquent à ce segment
        if (segment.bold) annotations.bold = true;
        if (segment.italic) annotations.italic = true;
        if (segment.code) annotations.code = true;
        if (segment.strikethrough) annotations.strikethrough = true;
        if (segment.underline) annotations.underline = true;

        const textContent: any = { content: segment.content };
        if (segment.link) {
          textContent.link = { url: segment.link.url };
        }

        // Restaurer les échappements dans le contenu
        textContent.content = this.restoreEscapes(textContent.content);

        result.push({
          type: 'text',
          text: textContent,
          annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
          href: segment.link ? segment.link.url : null
        });
      }
    });

    return result;
  }

  private createSegments(tokens: TextToken[], originalText: string): Array<{
    content: string;
    start: number;
    end: number;
    type: 'text' | 'equation';
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    link?: { url: string };
    expression?: string;
  }> {
    // Créer une liste de tous les points de changement
    const changePoints = new Set<number>();
    changePoints.add(0);
    changePoints.add(originalText.length);

    tokens.forEach(token => {
      changePoints.add(token.start);
      changePoints.add(token.end);
    });

    const sortedPoints = Array.from(changePoints).sort((a, b) => a - b);
    const segments: Array<{
      content: string;
      start: number;
      end: number;
      type: 'text' | 'equation';
      bold?: boolean;
      italic?: boolean;
      code?: boolean;
      strikethrough?: boolean;
      underline?: boolean;
      link?: { url: string };
      expression?: string;
    }> = [];

    // Créer des segments entre chaque point de changement
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];

      if (start === end) continue;

      const content = originalText.slice(start, end);
      if (!content) continue;

      // Déterminer quels tokens s'appliquent à ce segment
      const applicableTokens = tokens.filter(token => {
        // Un token s'applique si le segment est complètement à l'intérieur du token
        return token.start <= start && end <= token.end;
      });

      // Vérifier si c'est une équation (priorité absolue)
      const equationToken = applicableTokens.find(t => t.type === 'equation');
      if (equationToken) {
        segments.push({
          content: equationToken.content,
          start,
          end,
          type: 'equation',
          expression: equationToken.expression
        });
        continue;
      }

      // Construire les annotations pour ce segment
      const segment: any = {
        content,
        start,
        end,
        type: 'text'
      };

      applicableTokens.forEach(token => {
        switch (token.type) {
          case 'bold':
            segment.bold = true;
            break;
          case 'italic':
            segment.italic = true;
            break;
          case 'code':
            segment.code = true;
            break;
          case 'strikethrough':
            segment.strikethrough = true;
            break;
          case 'underline':
            segment.underline = true;
            break;
          case 'link':
          case 'auto-link':
            segment.link = { url: token.url! };
            break;
        }
      });

      segments.push(segment);
    }

    // Filtrer les segments vides et fusionner les segments adjacents identiques
    return this.mergeAdjacentSegments(segments.filter(s => s.content.trim() || s.type === 'equation'));
  }

  private mergeAdjacentSegments(segments: any[]): any[] {
    if (segments.length <= 1) return segments;

    const merged: any[] = [];
    let current = { ...segments[0] };

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];

      // Vérifier si les segments peuvent être fusionnés
      if (this.canMergeSegments(current, next)) {
        current.content += next.content;
        current.end = next.end;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }

    merged.push(current);
    return merged;
  }

  private canMergeSegments(a: any, b: any): boolean {
    if (a.type !== b.type) return false;
    if (a.type === 'equation') return false; // Ne jamais fusionner les équations

    // Comparer toutes les propriétés de formatage
    return a.bold === b.bold &&
      a.italic === b.italic &&
      a.code === b.code &&
      a.strikethrough === b.strikethrough &&
      a.underline === b.underline &&
      JSON.stringify(a.link) === JSON.stringify(b.link);
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
    } = {}
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
        link: { url }
      }
    }];
  }

  /**
   * Crée un rich text équation
   */
  createEquationRichText(expression: string): NotionRichText[] {
    return [{
      type: 'equation',
      equation: { expression }
    }];
  }

  /**
   * Combine plusieurs rich text arrays
   */
  combineRichText(...richTexts: NotionRichText[][]): NotionRichText[] {
    return richTexts.flat();
  }

  /**
   * Tronque le rich text si nécessaire
   */
  truncateRichText(richText: NotionRichText[], maxLength: number): NotionRichText[] {
    let currentLength = 0;
    const result: NotionRichText[] = [];

    for (const item of richText) {
      const content = item.type === 'text'
        ? item.text?.content || ''
        : item.type === 'equation'
          ? item.equation?.expression || ''
          : '';

      if (currentLength + content.length <= maxLength) {
        result.push(item);
        currentLength += content.length;
      } else {
        const remainingLength = maxLength - currentLength;
        if (remainingLength > 10) {
          const truncatedContent = content.substring(0, remainingLength - 10) + '...';

          if (item.type === 'text') {
            result.push({
              ...item,
              text: {
                ...item.text,
                content: truncatedContent
              }
            });
          } else if (item.type === 'equation') {
            result.push({
              type: 'text',
              text: { content: truncatedContent }
            });
          }
        }
        break;
      }
    }

    return result;
  }
}