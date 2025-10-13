import type { NotionRichText, NotionColor } from '../types/notion';
import { ContentSanitizer } from '../security/ContentSanitizer';

/**
 * Token avec annotations combinées (support imbrication)
 */
interface EnhancedTextToken {
  type: 'text' | 'link' | 'equation';
  content: string;
  start: number;
  end: number;
  
  // Annotations combinées
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
  };
  
  // Propriétés spéciales
  url?: string;
  expression?: string;
}

/**
 * Match détecté par regex avec métadonnées
 */
interface PatternMatch {
  type: 'bold' | 'italic' | 'bold-italic' | 'code' | 'strikethrough' | 'underline' | 'link' | 'auto-link' | 'equation';
  content: string;
  start: number;
  end: number;
  url?: string;
  expression?: string;
  priority: number;  // Pour résoudre les conflits
  prefixSpace?: string;  // ✅ NOUVEAU
  suffixSpace?: string;  // ✅ NOUVEAU
}

/**
 * Convertisseur de texte enrichi avec gestion avancée du formatage
 * 
 * @deprecated Utilisez RichTextBuilder de la nouvelle architecture
 * 
 * ✅ LEGACY: Refactoring complet du système de tokenization
 * - Support des annotations imbriquées (bold + code + link)
 * - Résolution intelligente des conflits regex
 * - Gestion correcte des échappements
 * - Aucune duplication ou perte de texte
 */
export class RichTextConverter {
  private escapeMap: Map<string, string> = new Map();
  private escapeCounter: number = 0;

  /**
   * Parse du rich text avec formatage inline
   */
  parseRichText(text: string, options?: { convertLinks?: boolean }): NotionRichText[] {
    if (!text) return [];

    // Sanitiser le contenu
    const sanitizedText = ContentSanitizer.sanitizeText(text);

    // Traiter les échappements
    const processedText = this.processEscapes(sanitizedText);

    // Nouvelle tokenization
    const tokens = this.tokenizeEnhanced(processedText, options);
    
    // Convertir en rich text Notion
    return this.tokensToRichText(tokens);
  }

  /**
   * ✅ NOUVEAU: Tokenization améliorée avec résolution de conflits
   */
  private tokenizeEnhanced(text: string, options?: { convertLinks?: boolean }): EnhancedTextToken[] {
    // Étape 1: Détecter tous les patterns avec leurs priorités
    const allMatches = this.detectAllPatterns(text, options);

    // Étape 2: Résoudre les conflits (overlaps)
    const resolvedMatches = this.resolveConflicts(allMatches);

    // Étape 3: Créer les tokens avec annotations combinées
    return this.buildTokens(text, resolvedMatches);
  }

  /**
   * ✅ NOUVEAU: Détection de tous les patterns avec priorités
   */
  private detectAllPatterns(text: string, options?: { convertLinks?: boolean }): PatternMatch[] {
    const matches: PatternMatch[] = [];

    // Définition des patterns avec priorités (plus haut = plus prioritaire)
    const patterns: Array<{
      regex: RegExp;
      type: PatternMatch['type'];
      priority: number;
      extractor: (match: RegExpExecArray) => { 
        content: string; 
        url?: string; 
        expression?: string;
        prefixSpace?: string;
        suffixSpace?: string;
      };
    }> = [
      // Priorité 10: Équations (absolute priority)
      {
        regex: /\$([^$\n]+)\$/g,
        type: 'equation',
        priority: 10,
        extractor: (m) => ({ content: m[1], expression: m[1] })
      },

      // Priorité 9: Liens markdown [text](url) - ✅ CORRIGÉ: Regex améliorée
      {
        regex: /\[([^\]]+)\]\(((?:https?:\/\/)?[^)\s]+)\)/g,
        type: 'link',
        priority: 9,
        extractor: (m) => {
          const sanitizedUrl = ContentSanitizer.sanitizeUrl(m[2]);
          // ✅ VALIDATION: Ne pas créer de lien si l'URL est vide après sanitization
          return { 
            content: m[1], 
            url: sanitizedUrl && sanitizedUrl.trim() !== '' ? sanitizedUrl : undefined 
          };
        }
      },

      // Priorité 8: Auto-links (URLs brutes)
      {
        regex: /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g,
        type: 'auto-link',
        priority: 8,
        extractor: (m) => {
          const sanitizedUrl = ContentSanitizer.sanitizeUrl(m[1]);
          // ✅ VALIDATION: Ne pas créer de lien si l'URL est vide après sanitization
          return { 
            content: m[1], 
            url: sanitizedUrl && sanitizedUrl.trim() !== '' ? sanitizedUrl : undefined 
          };
        }
      },

      // Bold - Capture espaces avant/après
      {
        regex: /(\s?)(\*\*(?!\s)(.+?)(?<!\s)\*\*)(\s?)/g,
        type: 'bold',
        priority: 2,
        extractor: (match) => ({
          content: match[3],
          prefixSpace: match[1],
          suffixSpace: match[4]
        })
      },

      // Italic - Capture espaces avant/après
      {
        regex: /(\s?)(\*(?!\s)(?!\*)(.+?)(?<!\s)\*)(\s?)/g,
        type: 'italic',
        priority: 1,
        extractor: (match) => ({
          content: match[3],
          prefixSpace: match[1],
          suffixSpace: match[4]
        })
      },

      // Bold-Italic combiné - Capture espaces avant/après
      {
        regex: /(\s?)(\*\*\*(?!\s)(.+?)(?<!\s)\*\*\*)(\s?)/g,
        type: 'bold-italic',
        priority: 3,
        extractor: (match) => ({
          content: match[3],
          prefixSpace: match[1],
          suffixSpace: match[4]
        })
      },

      // Code - Capture espaces avant/après
      {
        regex: /(\s?)(`(?!\s)([^`]+?)(?<!\s)`)(\s?)/g,
        type: 'code',
        priority: 4,
        extractor: (match) => ({
          content: match[3],
          prefixSpace: match[1],
          suffixSpace: match[4]
        })
      },

      // Strikethrough - Capture espaces avant/après
      {
        regex: /(\s?)(~~(?!\s)(.+?)(?<!\s)~~)(\s?)/g,
        type: 'strikethrough',
        priority: 2,
        extractor: (match) => ({
          content: match[3],
          prefixSpace: match[1],
          suffixSpace: match[4]
        })
      },

      // Underline - Capture espaces avant/après
      {
        regex: /(\s?)(__(?!\s)(.+?)(?<!\s)__)(\s?)/g,
        type: 'underline',
        priority: 2,
        extractor: (match) => ({
          content: match[3],
          prefixSpace: match[1],
          suffixSpace: match[4]
        })
      }
    ];

    // Filtrer les patterns selon les options
    const activePatterns = patterns.filter(p => {
      if (options?.convertLinks === false && (p.type === 'link' || p.type === 'auto-link')) {
        return false;
      }
      return true;
    });

    // Détecter tous les matches
    for (const pattern of activePatterns) {
      const regex = new RegExp(pattern.regex.source, 'g');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const extracted = pattern.extractor(match);
        
        matches.push({
          type: pattern.type,
          content: extracted.content,
          start: match.index + (extracted.prefixSpace?.length || 0),  // ✅ NOUVEAU
          end: match.index + match[0].length - (extracted.suffixSpace?.length || 0),  // ✅ NOUVEAU
          url: extracted.url,
          expression: extracted.expression,
          priority: pattern.priority,
          prefixSpace: extracted.prefixSpace,  // ✅ NOUVEAU
          suffixSpace: extracted.suffixSpace   // ✅ NOUVEAU
        });
      }
    }

    return matches;
  }

  /**
   * ✅ NOUVEAU: Résolution des conflits entre patterns
   * 
   * Stratégie:
   * 1. Trier par position de départ
   * 2. Pour chaque overlap, garder celui avec la priorité la plus haute
   * 3. Si priorités égales, garder le plus long
   */
  private resolveConflicts(matches: PatternMatch[]): PatternMatch[] {
    if (matches.length === 0) return [];

    // Trier par position, puis priorité décroissante
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.priority - a.priority;
    });

    const resolved: PatternMatch[] = [];
    let lastEnd = 0;

    for (const match of matches) {
      // Vérifier si ce match overlap avec le dernier accepté
      if (match.start >= lastEnd) {
        // Pas d'overlap, accepter
        resolved.push(match);
        lastEnd = match.end;
      } else {
        // Overlap détecté
        const lastMatch = resolved[resolved.length - 1];
        
        // Si ce match a une priorité plus haute, remplacer
        if (match.priority > lastMatch.priority) {
          resolved.pop();
          resolved.push(match);
          lastEnd = match.end;
        }
        // Sinon, ignorer ce match (déjà couvert)
      }
    }

    return resolved;
  }

  /**
   * ✅ CORRECTION CRITIQUE: Construction des tokens avec préservation des espaces
   * 
   * PROBLÈME RÉSOLU: Les espaces autour du formatage inline étaient supprimés
   * SOLUTION: Ajouter explicitement les espaces avant/après comme tokens séparés
   */
  private buildTokens(text: string, matches: PatternMatch[]): EnhancedTextToken[] {
    if (matches.length === 0) {
      return [this.createTextToken(text, 0, text.length)];
    }

    const tokens: EnhancedTextToken[] = [];
    let currentPos = 0;

    for (const match of matches) {
      // Texte avant le match
      if (currentPos < match.start) {
        const textBefore = text.substring(currentPos, match.start);
        if (textBefore) {
          tokens.push(this.createTextToken(textBefore, currentPos, match.start));
        }
      }

      // ✅ NOUVEAU: Ajouter l'espace avant si présent
      if (match.prefixSpace) {
        tokens.push(this.createTextToken(
          match.prefixSpace,
          match.start - match.prefixSpace.length,
          match.start
        ));
      }

      // Le token principal (avec formatage imbriqué si nécessaire)
      if (match.type === 'link' || match.type === 'auto-link') {
        if (match.url && match.url.trim() !== '') {
          tokens.push(this.createLinkToken(match));
        } else {
          tokens.push(this.createTextToken(match.content, match.start, match.end));
        }
      } else if (match.type === 'equation') {
        tokens.push(this.createEquationToken(match));
      } else {
        // Vérifier si le contenu a lui-même des patterns imbriqués
        const innerTokens = this.parseInnerFormatting(match);
        tokens.push(...innerTokens);
      }

      // ✅ NOUVEAU: Ajouter l'espace après si présent
      if (match.suffixSpace) {
        tokens.push(this.createTextToken(
          match.suffixSpace,
          match.end,
          match.end + match.suffixSpace.length
        ));
      }

      currentPos = match.end + (match.suffixSpace?.length || 0);
    }

    // Ajouter le texte restant
    if (currentPos < text.length) {
      const textContent = text.substring(currentPos);
      if (textContent) {
        tokens.push(this.createTextToken(textContent, currentPos, text.length));
      }
    }

    return tokens;
  }

  /**
   * ✅ NOUVEAU: Parser le formatage imbriqué dans un match
   * 
   * Exemple: **bold avec `code` et [link](url)**
   * → Le bold est appliqué à tout, mais code et link ont leurs propres tokens
   */
  private parseInnerFormatting(match: PatternMatch): EnhancedTextToken[] {
    const annotations = this.getAnnotationsForType(match.type);
    
    // Re-tokenizer le contenu pour détecter patterns imbriqués
    const innerMatches = this.detectAllPatterns(match.content, { convertLinks: true });
    const resolvedInner = this.resolveConflicts(innerMatches);

    if (resolvedInner.length === 0) {
      // Pas de patterns imbriqués, retourner un token simple
      return [this.createFormattedToken(match.content, match.start, match.end, annotations)];
    }

    // Patterns imbriqués détectés
    const tokens: EnhancedTextToken[] = [];
    let pos = 0;

    for (const inner of resolvedInner) {
      // Texte avant
      if (inner.start > pos) {
        const textContent = match.content.substring(pos, inner.start);
        if (textContent) {
          tokens.push(this.createFormattedToken(
            textContent,
            match.start + pos,
            match.start + inner.start,
            annotations
          ));
        }
      }

      // Combiner les annotations
      const combinedAnnotations = {
        ...annotations,
        ...this.getAnnotationsForType(inner.type)
      };

      if (inner.type === 'link' || inner.type === 'auto-link') {
        if (inner.url && inner.url.trim() !== '') {
          tokens.push({
            type: 'link',
            content: inner.content,
            start: match.start + inner.start,
            end: match.start + inner.end,
            annotations: combinedAnnotations,
            url: inner.url
          });
        } else {
          tokens.push(this.createFormattedToken(
            inner.content,
            match.start + inner.start,
            match.start + inner.end,
            combinedAnnotations
          ));
        }
      } else if (inner.type === 'equation') {
        tokens.push({
          type: 'equation',
          content: inner.content,
          start: match.start + inner.start,
          end: match.start + inner.end,
          annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false },
          expression: inner.expression
        });
      } else {
        tokens.push(this.createFormattedToken(
          inner.content,
          match.start + inner.start,
          match.start + inner.end,
          combinedAnnotations
        ));
      }

      pos = inner.end;
    }

    // Texte restant
    if (pos < match.content.length) {
      const textContent = match.content.substring(pos);
      if (textContent) {
        tokens.push(this.createFormattedToken(
          textContent,
          match.start + pos,
          match.end,
          annotations
        ));
      }
    }

    return tokens;
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Extraire le contenu avec espaces autour préservés
   * 
   * PROBLÈME RÉSOLU: Les regex capturent seulement le contenu entre les marqueurs,
   * perdant les espaces qui les entourent dans le texte original.
   * 
   * SOLUTION: Supprimer seulement les marqueurs markdown mais garder les espaces
   */
  private extractContentWithSpaces(text: string, start: number, end: number, type: PatternMatch['type']): string {
    let content = text.substring(start, end);

    // Supprimer les marqueurs markdown mais garder les espaces
    switch (type) {
      case 'bold':
        content = content.replace(/^\*\*/, '').replace(/\*\*$/, '');
        break;
      case 'italic':
        content = content.replace(/^\*/, '').replace(/\*$/, '');
        content = content.replace(/^_/, '').replace(/_$/, '');
        break;
      case 'bold-italic':
        content = content.replace(/^\*\*\*/, '').replace(/\*\*\*$/, '');
        break;
      case 'code':
        content = content.replace(/^``/, '').replace(/``$/, '');
        content = content.replace(/^`/, '').replace(/`$/, '');
        break;
      case 'strikethrough':
        content = content.replace(/^~~/, '').replace(/~~$/, '');
        break;
      case 'underline':
        content = content.replace(/^__/, '').replace(/__$/, '');
        break;
      case 'link':
        // Pour les liens [text](url), extraire seulement le text
        const linkMatch = content.match(/^\[([^\]]+)\]\([^)]+\)$/);
        if (linkMatch) {
          content = linkMatch[1];
        }
        break;
      case 'auto-link':
        // Pour les auto-links, garder l'URL complète
        break;
      case 'equation':
        content = content.replace(/^\$/, '').replace(/\$$/, '');
        break;
    }

    return content; // ✅ Espaces préservés
  }

  /**
   * Crée les annotations selon le type de formatage
   */
  private getAnnotationsForType(type: PatternMatch['type']): EnhancedTextToken['annotations'] {
    const annotations: EnhancedTextToken['annotations'] = {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false
    };

    switch (type) {
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

    return annotations;
  }

  /**
   * Helpers pour créer des tokens
   */
  private createTextToken(content: string, start: number, end: number): EnhancedTextToken {
    return {
      type: 'text',
      content,
      start,
      end,
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false
      }
    };
  }

  private createFormattedToken(
    content: string,
    start: number,
    end: number,
    annotations: EnhancedTextToken['annotations']
  ): EnhancedTextToken {
    return {
      type: 'text',
      content,
      start,
      end,
      annotations
    };
  }

  private createLinkToken(match: PatternMatch): EnhancedTextToken {
    return {
      type: 'link',
      content: match.content,
      start: match.start,
      end: match.end,
      url: match.url,
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false
      }
    };
  }

  private createEquationToken(match: PatternMatch): EnhancedTextToken {
    return {
      type: 'equation',
      content: match.content,
      start: match.start,
      end: match.end,
      expression: match.expression,
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false
      }
    };
  }

  /**
   * ✅ CORRECTION CRITIQUE: Convertit les tokens en rich text Notion sans supprimer les espaces
   * 
   * PROBLÈME RÉSOLU: Les espaces étaient supprimés lors de la conversion finale
   * SOLUTION: Ne pas filtrer les contenus avec espaces, accepter même les espaces seuls
   */
  private tokensToRichText(tokens: EnhancedTextToken[]): NotionRichText[] {
    if (tokens.length === 0) return [];

    const result: NotionRichText[] = [];

    for (const token of tokens) {
      // ✅ CORRECTION: NE PAS trim() le contenu !
      const content = this.restoreEscapes(token.content);

      if (token.type === 'equation') {
        result.push({
          type: 'equation',
          equation: { expression: token.expression! }
        });
      } else if (token.type === 'link') {
        // ✅ VALIDATION: S'assurer que l'URL n'est pas vide
        if (token.url && token.url.trim() !== '') {
          result.push({
            type: 'text',
            text: {
              content, // ✅ Espaces préservés
              link: { url: token.url }
            },
            annotations: this.hasAnnotations(token.annotations) ? token.annotations : undefined
          });
        } else {
          // Fallback: créer un texte normal si l'URL est vide
          result.push({
            type: 'text',
            text: { content }, // ✅ Espaces préservés
            annotations: this.hasAnnotations(token.annotations) ? token.annotations : undefined
          });
        }
      } else {
        // Texte normal
        result.push({
          type: 'text',
          text: { content }, // ✅ Espaces préservés
          annotations: this.hasAnnotations(token.annotations) ? token.annotations : undefined
        });
      }
    }

    // ✅ CORRECTION: Filtrer seulement les contenus complètement vides, pas les espaces
    return result.filter(item => {
      if (item.type === 'text' && item.text?.content === '') return false;
      return true;
    });
  }

  /**
   * Vérifie si les annotations contiennent du formatage
   */
  private hasAnnotations(annotations: EnhancedTextToken['annotations']): boolean {
    return annotations.bold || annotations.italic || annotations.strikethrough ||
           annotations.underline || annotations.code;
  }

  /**
   * Traite les échappements dans le texte
   */
  private processEscapes(text: string): string {
    this.escapeMap.clear();
    this.escapeCounter = 0;

    const escapedChars = ['*', '_', '`', '~', '[', ']', '(', ')', '#', '>', '|', '%', '&', '@', '!', '$'];
    let result = text;

    escapedChars.forEach(char => {
      const escapedPattern = new RegExp(`\\\\\\${char}`, 'g');
      result = result.replace(escapedPattern, () => {
        const placeholder = `§ESC${this.escapeCounter++}§`;
        this.escapeMap.set(placeholder, char);
        return placeholder;
      });
    });

    return result;
  }

  /**
   * Restaure les échappements
   */
  private restoreEscapes(text: string): string {
    let result = text;
    this.escapeMap.forEach((char, placeholder) => {
      result = result.replace(new RegExp(placeholder, 'g'), char);
    });
    return result;
  }

  /**
   * API publique simplifiée
   */
  createSimpleRichText(content: string): NotionRichText[] {
    return [{
      type: 'text',
      text: { content }
    }];
  }

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

  createLinkRichText(content: string, url: string): NotionRichText[] {
    return [{
      type: 'text',
      text: {
        content,
        link: { url: ContentSanitizer.sanitizeUrl(url) }
      }
    }];
  }

  createEquationRichText(expression: string): NotionRichText[] {
    return [{
      type: 'equation',
      equation: { expression }
    }];
  }

  combineRichText(...richTexts: NotionRichText[][]): NotionRichText[] {
    return richTexts.flat();
  }

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