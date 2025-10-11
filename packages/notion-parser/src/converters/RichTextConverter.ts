import type { NotionRichText, NotionColor } from '../types';

export class RichTextConverter {
  parseRichText(text: string): NotionRichText[] {
    if (!text) return [];

    const result: NotionRichText[] = [];
    
    // Regex pour capturer tous les formats markdown
    // Ordre important: ***bold+italic*** avant **bold** et *italic*
    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`(.+?)`|\[(.+?)\]\((.+?)\)|~~(.+?)~~|\$(.+?)\$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Texte avant le match
      if (match.index > lastIndex) {
        const plainText = text.substring(lastIndex, match.index);
        if (plainText) {
          result.push({
            type: 'text',
            text: { content: plainText }
          });
        }
      }

      // Déterminer le type de formatage
      if (match[2]) { // ***bold+italic***
        result.push({
          type: 'text',
          text: { content: match[2] },
          annotations: { bold: true, italic: true }
        });
      } else if (match[3]) { // **bold**
        result.push({
          type: 'text',
          text: { content: match[3] },
          annotations: { bold: true }
        });
      } else if (match[4]) { // *italic*
        result.push({
          type: 'text',
          text: { content: match[4] },
          annotations: { italic: true }
        });
      } else if (match[5]) { // __underline__
        result.push({
          type: 'text',
          text: { content: match[5] },
          annotations: { underline: true }
        });
      } else if (match[6]) { // _italic_
        result.push({
          type: 'text',
          text: { content: match[6] },
          annotations: { italic: true }
        });
      } else if (match[7]) { // `code`
        result.push({
          type: 'text',
          text: { content: match[7] },
          annotations: { code: true }
        });
      } else if (match[8] && match[9]) { // [link](url)
        result.push({
          type: 'text',
          text: { 
            content: match[8],
            link: { url: match[9] }
          }
        });
      } else if (match[10]) { // ~~strikethrough~~
        result.push({
          type: 'text',
          text: { content: match[10] },
          annotations: { strikethrough: true }
        });
      } else if (match[11]) { // $equation$
        result.push({
          type: 'equation',
          equation: {
            expression: match[11]
          }
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Texte restant
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        result.push({
          type: 'text',
          text: { content: remainingText }
        });
      }
    }

    return result.length > 0 ? result : [{
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