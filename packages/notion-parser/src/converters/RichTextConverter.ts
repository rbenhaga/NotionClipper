import type { NotionRichText, NotionColor } from '../types';

export class RichTextConverter {
  parseRichText(text: string): NotionRichText[] {
    if (!text) return [];

    // Parse text recursively to handle nested formatting
    return this.parseTextRecursive(text);
  }

  private parseTextRecursive(text: string): NotionRichText[] {
    if (!text) return [];

    const result: NotionRichText[] = [];
    
    // Process text in order of precedence to avoid conflicts
    // 1. Code blocks (highest priority - no nested formatting)
    const codeMatch = text.match(/^(.*?)`([^`]+)`(.*)$/s);
    if (codeMatch) {
      const [, before, code, after] = codeMatch;
      
      if (before) result.push(...this.parseTextRecursive(before));
      result.push({
        type: 'text',
        text: { content: code },
        annotations: { code: true }
      });
      if (after) result.push(...this.parseTextRecursive(after));
      
      return result;
    }

    // 2. Links (second priority)
    const linkMatch = text.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/s);
    if (linkMatch) {
      const [, before, linkText, url, after] = linkMatch;
      
      if (before) result.push(...this.parseTextRecursive(before));
      
      // Parse link text for nested formatting
      const parsedLinkText = this.parseTextRecursive(linkText);
      if (parsedLinkText.length === 1 && parsedLinkText[0].type === 'text') {
        result.push({
          type: 'text',
          text: { 
            content: parsedLinkText[0].text?.content || linkText,
            link: { url }
          },
          annotations: parsedLinkText[0].annotations
        });
      } else {
        // Fallback for complex nested formatting in links
        result.push({
          type: 'text',
          text: { 
            content: linkText,
            link: { url }
          }
        });
      }
      
      if (after) result.push(...this.parseTextRecursive(after));
      
      return result;
    }

    // 3. Equations
    const equationMatch = text.match(/^(.*?)\$([^$]+)\$(.*)$/s);
    if (equationMatch) {
      const [, before, equation, after] = equationMatch;
      
      if (before) result.push(...this.parseTextRecursive(before));
      result.push({
        type: 'equation',
        equation: { expression: equation }
      });
      if (after) result.push(...this.parseTextRecursive(after));
      
      return result;
    }

    // 4. Bold + Italic (***text***)
    const boldItalicMatch = text.match(/^(.*?)\*\*\*([^*]+)\*\*\*(.*)$/s);
    if (boldItalicMatch) {
      const [, before, content, after] = boldItalicMatch;
      
      if (before) result.push(...this.parseTextRecursive(before));
      result.push({
        type: 'text',
        text: { content },
        annotations: { bold: true, italic: true }
      });
      if (after) result.push(...this.parseTextRecursive(after));
      
      return result;
    }

    // 5. Bold (**text**)
    const boldMatch = text.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/s);
    if (boldMatch) {
      const [, before, content, after] = boldMatch;
      
      if (before) result.push(...this.parseTextRecursive(before));
      result.push({
        type: 'text',
        text: { content },
        annotations: { bold: true }
      });
      if (after) result.push(...this.parseTextRecursive(after));
      
      return result;
    }

    // 6. Underline (__text__)
    const underlineMatch = text.match(/^(.*?)__([^_]+)__(.*)$/s);
    if (underlineMatch) {
      const [, before, content, after] = underlineMatch;
      
      if (before) result.push(...this.parseTextRecursive(before));
      result.push({
        type: 'text',
        text: { content },
        annotations: { underline: true }
      });
      if (after) result.push(...this.parseTextRecursive(after));
      
      return result;
    }

    // 7. Italic (*text* or _text_)
    const italicMatch = text.match(/^(.*?)[\*_]([^*_]+)[\*_](.*)$/s);
    if (italicMatch) {
      const [, before, content, after] = italicMatch;
      
      if (before) result.push(...this.parseTextRecursive(before));
      result.push({
        type: 'text',
        text: { content },
        annotations: { italic: true }
      });
      if (after) result.push(...this.parseTextRecursive(after));
      
      return result;
    }

    // 8. Strikethrough (~~text~~)
    const strikethroughMatch = text.match(/^(.*?)~~([^~]+)~~(.*)$/s);
    if (strikethroughMatch) {
      const [, before, content, after] = strikethroughMatch;
      
      if (before) result.push(...this.parseTextRecursive(before));
      result.push({
        type: 'text',
        text: { content },
        annotations: { strikethrough: true }
      });
      if (after) result.push(...this.parseTextRecursive(after));
      
      return result;
    }

    // No formatting found, return as plain text
    return [{
      type: 'text',
      text: { content: text }
    }];
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