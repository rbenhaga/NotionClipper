import type { NotionBlock, NotionColor } from '../types';

export interface FormattingOptions {
  color?: NotionColor;
  applyColorToAll?: boolean;
  normalizeWhitespace?: boolean;
  removeEmptyBlocks?: boolean;
  mergeConsecutiveParagraphs?: boolean;
  maxConsecutiveEmptyLines?: number;
}

export class BlockFormatter {
  format(blocks: NotionBlock[], options: FormattingOptions = {}): NotionBlock[] {
    let formattedBlocks = [...blocks];

    // Remove empty blocks if requested
    if (options.removeEmptyBlocks) {
      formattedBlocks = this.removeEmptyBlocks(formattedBlocks);
    }

    // Normalize whitespace if requested
    if (options.normalizeWhitespace) {
      formattedBlocks = this.normalizeWhitespace(formattedBlocks);
    }

    // Apply color if specified
    if (options.color && options.applyColorToAll) {
      formattedBlocks = this.applyColor(formattedBlocks, options.color);
    }

    // Merge consecutive paragraphs if requested
    if (options.mergeConsecutiveParagraphs) {
      formattedBlocks = this.mergeConsecutiveParagraphs(formattedBlocks);
    }

    // Limit consecutive empty lines
    if (options.maxConsecutiveEmptyLines !== undefined) {
      formattedBlocks = this.limitConsecutiveEmptyLines(
        formattedBlocks, 
        options.maxConsecutiveEmptyLines
      );
    }

    return formattedBlocks;
  }

  private removeEmptyBlocks(blocks: NotionBlock[]): NotionBlock[] {
    return blocks.filter(block => {
      switch (block.type) {
        case 'paragraph':
          return this.hasContent((block as any).paragraph?.rich_text);
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          const headingField = (block as any)[block.type];
          return this.hasContent(headingField?.rich_text);
        case 'bulleted_list_item':
        case 'numbered_list_item':
          const listField = (block as any)[block.type];
          return this.hasContent(listField?.rich_text);
        case 'to_do':
          return this.hasContent((block as any).to_do?.rich_text);
        case 'toggle':
          return this.hasContent((block as any).toggle?.rich_text);
        case 'quote':
          return this.hasContent((block as any).quote?.rich_text);
        case 'callout':
          return this.hasContent((block as any).callout?.rich_text);
        case 'code':
          return this.hasContent((block as any).code?.rich_text);
        default:
          return true; // Keep other block types
      }
    });
  }

  private hasContent(richText: any[]): boolean {
    if (!Array.isArray(richText)) return false;
    
    return richText.some(item => {
      const content = item.type === 'text' 
        ? item.text?.content || ''
        : item.type === 'equation'
        ? item.equation?.expression || ''
        : '';
      return content.trim().length > 0;
    });
  }

  private normalizeWhitespace(blocks: NotionBlock[]): NotionBlock[] {
    return blocks.map(block => {
      const clonedBlock = { ...block };

      switch (block.type) {
        case 'paragraph':
          (clonedBlock as any).paragraph = {
            ...(clonedBlock as any).paragraph,
            rich_text: this.normalizeRichTextWhitespace((clonedBlock as any).paragraph?.rich_text)
          };
          break;
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          const headingField = (clonedBlock as any)[block.type];
          (clonedBlock as any)[block.type] = {
            ...headingField,
            rich_text: this.normalizeRichTextWhitespace(headingField?.rich_text)
          };
          break;
        case 'bulleted_list_item':
        case 'numbered_list_item':
          const listField = (clonedBlock as any)[block.type];
          (clonedBlock as any)[block.type] = {
            ...listField,
            rich_text: this.normalizeRichTextWhitespace(listField?.rich_text)
          };
          break;
        case 'to_do':
          (clonedBlock as any).to_do = {
            ...(clonedBlock as any).to_do,
            rich_text: this.normalizeRichTextWhitespace((clonedBlock as any).to_do?.rich_text)
          };
          break;
        case 'toggle':
          (clonedBlock as any).toggle = {
            ...(clonedBlock as any).toggle,
            rich_text: this.normalizeRichTextWhitespace((clonedBlock as any).toggle?.rich_text)
          };
          break;
        case 'quote':
          (clonedBlock as any).quote = {
            ...(clonedBlock as any).quote,
            rich_text: this.normalizeRichTextWhitespace((clonedBlock as any).quote?.rich_text)
          };
          break;
        case 'callout':
          (clonedBlock as any).callout = {
            ...(clonedBlock as any).callout,
            rich_text: this.normalizeRichTextWhitespace((clonedBlock as any).callout?.rich_text)
          };
          break;
      }

      return clonedBlock;
    });
  }

  private normalizeRichTextWhitespace(richText: any[]): any[] {
    if (!Array.isArray(richText)) return richText;

    return richText.map(item => {
      if (item.type === 'text' && item.text?.content) {
        return {
          ...item,
          text: {
            ...item.text,
            content: item.text.content
              .replace(/\r\n/g, '\n')
              .replace(/\r/g, '\n')
              .replace(/\t/g, '  ')
              .replace(/[ ]+/g, ' ')
              .trim()
          }
        };
      }
      return item;
    });
  }

  private applyColor(blocks: NotionBlock[], color: NotionColor): NotionBlock[] {
    return blocks.map(block => {
      const clonedBlock = { ...block };

      switch (block.type) {
        case 'paragraph':
          (clonedBlock as any).paragraph = {
            ...(clonedBlock as any).paragraph,
            color
          };
          break;
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          (clonedBlock as any)[block.type] = {
            ...(clonedBlock as any)[block.type],
            color
          };
          break;
        case 'bulleted_list_item':
        case 'numbered_list_item':
          (clonedBlock as any)[block.type] = {
            ...(clonedBlock as any)[block.type],
            color
          };
          break;
        case 'to_do':
          (clonedBlock as any).to_do = {
            ...(clonedBlock as any).to_do,
            color
          };
          break;
        case 'toggle':
          (clonedBlock as any).toggle = {
            ...(clonedBlock as any).toggle,
            color
          };
          break;
        case 'quote':
          (clonedBlock as any).quote = {
            ...(clonedBlock as any).quote,
            color
          };
          break;
        case 'callout':
          (clonedBlock as any).callout = {
            ...(clonedBlock as any).callout,
            color
          };
          break;
      }

      return clonedBlock;
    });
  }

  private mergeConsecutiveParagraphs(blocks: NotionBlock[]): NotionBlock[] {
    const result: NotionBlock[] = [];
    let currentParagraph: any = null;

    for (const block of blocks) {
      if (block.type === 'paragraph') {
        if (currentParagraph) {
          // Merge with previous paragraph
          currentParagraph.paragraph.rich_text = [
            ...currentParagraph.paragraph.rich_text,
            { type: 'text', text: { content: ' ' } }, // Add space between merged paragraphs
            ...(block as any).paragraph.rich_text
          ];
        } else {
          currentParagraph = { ...block };
        }
      } else {
        // Push accumulated paragraph if exists
        if (currentParagraph) {
          result.push(currentParagraph);
          currentParagraph = null;
        }
        result.push(block);
      }
    }

    // Push final paragraph if exists
    if (currentParagraph) {
      result.push(currentParagraph);
    }

    return result;
  }

  private limitConsecutiveEmptyLines(blocks: NotionBlock[], maxEmpty: number): NotionBlock[] {
    const result: NotionBlock[] = [];
    let consecutiveEmptyCount = 0;

    for (const block of blocks) {
      const isEmpty = this.isEmptyBlock(block);

      if (isEmpty) {
        consecutiveEmptyCount++;
        if (consecutiveEmptyCount <= maxEmpty) {
          result.push(block);
        }
      } else {
        consecutiveEmptyCount = 0;
        result.push(block);
      }
    }

    return result;
  }

  private isEmptyBlock(block: NotionBlock): boolean {
    switch (block.type) {
      case 'paragraph':
        return !this.hasContent((block as any).paragraph?.rich_text);
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        const headingField = (block as any)[block.type];
        return !this.hasContent(headingField?.rich_text);
      default:
        return false;
    }
  }

  /**
   * Optimise les blocs pour réduire la taille
   */
  optimize(blocks: NotionBlock[]): NotionBlock[] {
    return this.format(blocks, {
      removeEmptyBlocks: true,
      normalizeWhitespace: true,
      maxConsecutiveEmptyLines: 1
    });
  }

  /**
   * Applique un style cohérent à tous les blocs
   */
  applyTheme(blocks: NotionBlock[], theme: { color?: NotionColor }): NotionBlock[] {
    return this.format(blocks, {
      color: theme.color,
      applyColorToAll: !!theme.color,
      normalizeWhitespace: true
    });
  }
}