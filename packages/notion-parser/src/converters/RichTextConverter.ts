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
    
    // Trier les tokens par position
    const sortedTokens = tokens.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return this.getTokenPriority(a.type) - this.getTokenPriority(b.type);
    });
    
    let lastEnd = 0;

    sortedTokens.forEach(token => {
      // Ajouter le texte avant ce token
      if (token.start > lastEnd) {
        const beforeText = originalText.slice(lastEnd, token.start);
        if (beforeText) {
          result.push({
            type: 'text',
            text: { content: this.restoreEscapes(beforeText) }
          });
        }
      }

      // Éviter les chevauchements
      if (token.start < lastEnd) {
        return;
      }

      // Ajouter le token formaté
      if (token.type === 'equation') {
        result.push({
          type: 'equation',
          equation: { expression: token.expression || token.content }
        });
      } else {
        const annotations: any = {};
        
        // Appliquer les annotations selon le type
        if (token.type === 'bold') annotations.bold = true;
        if (token.type === 'italic') annotations.italic = true;
        if (token.type === 'code') annotations.code = true;
        if (token.type === 'strikethrough') annotations.strikethrough = true;
        if (token.type === 'underline') annotations.underline = true;

        // Chercher d'autres tokens qui se chevauchent pour combiner les annotations
        const overlappingTokens = sortedTokens.filter(other => 
          other !== token && 
          other.start < token.end && 
          other.end > token.start &&
          other.start >= token.start &&
          other.end <= token.end
        );

        overlappingTokens.forEach(other => {
          if (other.type === 'bold') annotations.bold = true;
          if (other.type === 'italic') annotations.italic = true;
          if (other.type === 'code') annotations.code = true;
          if (other.type === 'strikethrough') annotations.strikethrough = true;
          if (other.type === 'underline') annotations.underline = true;
        });

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

      lastEnd = Math.max(lastEnd, token.end);
    });

    // Ajouter le texte restant
    if (lastEnd < originalText.length) {
      const remainingText = originalText.slice(lastEnd);
      if (remainingText) {
        result.push({
          type: 'text',
          text: { content: this.restoreEscapes(remainingText) }
        });
      }
    }

    return result.length > 0 ? result : [{
      type: 'text',
      text: { content: this.restoreEscapes(originalText) }
    }];
  }

  private createAnnotatedSegments(tokens: TextToken[], originalText: string): Array<{
    content: string;
    start: number;
    end: number;
    type: 'text' | 'equation';
    annotations?: any;
    url?: string;
    expression?: string;
  }> {
    // Créer tous les points de changement
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
      annotations?: any;
      url?: string;
      expression?: string;
    }> = [];

    // Créer des segments entre chaque point de changement
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];

      if (start === end) continue;

      // Trouver tous les tokens qui s'appliquent à ce segment
      const applicableTokens = tokens.filter(token => 
        token.start <= start && end <= token.end
      );

      if (applicableTokens.length === 0) {
        // Segment de texte simple
        const content = originalText.slice(start, end);
        if (content) {
          segments.push({
            content,
            start,
            end,
            type: 'text'
          });
        }
        continue;
      }

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

      // Combiner toutes les annotations applicables
      const annotations: any = {};
      let url: string | undefined;
      let segmentContent = originalText.slice(start, end);

      // Utiliser le contenu nettoyé du token le plus prioritaire qui correspond exactement
      const exactTokens = applicableTokens.filter(t => t.start === start && t.end === end);
      if (exactTokens.length > 0) {
        // Prendre le token avec la plus haute priorité (plus petit nombre)
        const priorityToken = exactTokens.reduce((best, current) => 
          this.getTokenPriority(current.type) < this.getTokenPriority(best.type) ? current : best
        );
        segmentContent = priorityToken.content;
      }

      applicableTokens.forEach(token => {
        switch (token.type) {
          case 'bold':
            annotations.bold = true;
            break;
          case 'italic':
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
          case 'link':
          case 'auto-link':
            url = token.url;
            break;
        }
      });

      segments.push({
        content: segmentContent,
        start,
        end,
        type: 'text',
        annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
        url
      });
    }

    return segments.filter(s => s.content.trim() || s.type === 'equation');
  }

  private resolveTokenConflicts(tokens: TextToken[]): TextToken[] {
    const resolved: TextToken[] = [];

    tokens.forEach(token => {
      // Vérifier s'il y a un conflit avec un token existant
      const conflictIndex = resolved.findIndex(existing =>
        (token.start < existing.end && token.end > existing.start)
      );

      if (conflictIndex === -1) {
        // Pas de conflit, ajouter le token
        resolved.push(token);
      } else {
        // Conflit détecté, garder le token avec la plus haute priorité (plus petit nombre)
        const existing = resolved[conflictIndex];
        const tokenPriority = this.getTokenPriority(token.type);
        const existingPriority = this.getTokenPriority(existing.type);

        if (tokenPriority < existingPriority) {
          resolved[conflictIndex] = token;
        }
      }
    });

    return resolved.sort((a, b) => a.start - b.start);
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