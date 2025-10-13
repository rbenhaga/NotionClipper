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
}

/**
 * Convertisseur de texte enrichi avec gestion avancée du formatage
 * 
 * ✅ NOUVEAU: Refactoring complet du système de tokenization
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
      extractor: (match: RegExpExecArray) => { content: string; url?: string; expression?: string };
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

      // Priorité 7: Code inline (doubles backticks en premier)
      {
        regex: /``([^`\n]*(?:`[^`\n]*)*?)``/g,
        type: 'code',
        priority: 7,
        extractor: (m) => ({ content: m[1] })
      },
      {
        regex: /`([^`\n]+)`/g,
        type: 'code',
        priority: 6,
        extractor: (m) => ({ content: m[1] })
      },

      // Priorité 5: Bold + Italic (***text***)
      {
        regex: /\*\*\*([^*\n]+?)\*\*\*/g,
        type: 'bold-italic',
        priority: 5,
        extractor: (m) => ({ content: m[1] })
      },

      // Priorité 4: Bold (**text**)
      {
        regex: /\*\*([^*\n]+?)\*\*/g,
        type: 'bold',
        priority: 4,
        extractor: (m) => ({ content: m[1] })
      },

      // Priorité 3: Underline (__text__)
      {
        regex: /__([^_\n]+?)__/g,
        type: 'underline',
        priority: 3,
        extractor: (m) => ({ content: m[1] })
      },

      // Priorité 2: Strikethrough (~~text~~)
      {
        regex: /~~([^~\n]+?)~~/g,
        type: 'strikethrough',
        priority: 2,
        extractor: (m) => ({ content: m[1] })
      },

      // Priorité 1: Italic (*text* ou _text_) - Plus bas car plus susceptible de faux positifs
      {
        regex: /\*([^\s*\n][^*\n]*?[^\s*\n])\*/g,
        type: 'italic',
        priority: 1,
        extractor: (m) => ({ content: m[1] })
      },
      {
        regex: /_([^\s_\n][^_\n]*?[^\s_\n])_/g,
        type: 'italic',
        priority: 1,
        extractor: (m) => ({ content: m[1] })
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
          start: match.index,
          end: match.index + match[0].length,
          url: extracted.url,
          expression: extracted.expression,
          priority: pattern.priority
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
   * SOLUTION: Extraire le contenu avec espaces préservés et les inclure dans les tokens adjacents
   */
  private buildTokens(text: string, matches: PatternMatch[]): EnhancedTextToken[] {
    const tokens: EnhancedTextToken[] = [];
    let currentPos = 0;

    for (const match of matches) {
      // ✅ CORRECTION: Ajouter le texte avant ce match (avec espaces préservés)
      if (match.start > currentPos) {
        const textContent = text.substring(currentPos, match.start);
        if (textContent) {
          tokens.push(this.createTextToken(textContent, currentPos, match.start));
        }
      }

      // Traiter le match selon son type
      if (match.type === 'equation') {
        tokens.push(this.createEquationToken(match));
      } else if (match.type === 'link' || match.type === 'auto-link') {
        // ✅ VALIDATION: Ne créer un token link que si l'URL est valide
        if (match.url && match.url.trim() !== '') {
          // ✅ CORRECTION: Extraire le contenu avec espaces préservés
          const contentWithSpaces = this.extractContentWithSpaces(text, match.start, match.end, match.type);
          const linkToken = this.createLinkToken(match);
          linkToken.content = contentWithSpaces;
          tokens.push(linkToken);
        } else {
          // Fallback: créer un token texte normal avec espaces préservés
          const contentWithSpaces = this.extractContentWithSpaces(text, match.start, match.end, match.type);
          tokens.push(this.createTextToken(contentWithSpaces, match.start, match.end));
        }
      } else {
        // Formatage inline (bold, italic, code, etc.)
        // ✅ CORRECTION: Parser avec préservation des espaces
        const innerTokens = this.parseInnerFormattingWithSpaces(match, text);
        tokens.push(...innerTokens);
      }

      currentPos = match.end;
    }

    // ✅ CORRECTION: Ajouter le texte restant (avec espaces préservés)
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
  private parseInnerFormattingWithSpaces(match: PatternMatch, originalText: string): EnhancedTextToken[] {
    const annotations = this.getAnnotationsForType(match.type);
    
    // ✅ CORRECTION: Extraire le contenu avec espaces préservés
    const contentWithSpaces = this.extractContentWithSpaces(originalText, match.start, match.end, match.type);
    
    // Re-tokenizer le contenu pour détecter patterns imbriqués
    const innerMatches = this.detectAllPatterns(contentWithSpaces, { convertLinks: true });
    const resolvedInner = this.resolveConflicts(innerMatches);

    if (resolvedInner.length === 0) {
      // Pas de patterns imbriqués, retourner un token simple avec espaces préservés
      return [this.createFormattedToken(contentWithSpaces, match.start, match.end, annotations)];
    }

    // Patterns imbriqués détectés
    const tokens: EnhancedTextToken[] = [];
    let pos = 0;

    for (const inner of resolvedInner) {
      // ✅ CORRECTION: Texte avant (avec espaces préservés)
      if (inner.start > pos) {
        const textContent = contentWithSpaces.substring(pos, inner.start);
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
        // ✅ VALIDATION: Ne créer un token link que si l'URL est valide
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
          // Fallback: créer un token texte avec formatage
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

    // ✅ CORRECTION: Texte restant (avec espaces préservés)
    if (pos < contentWithSpaces.length) {
      const textContent = contentWithSpaces.substring(pos);
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