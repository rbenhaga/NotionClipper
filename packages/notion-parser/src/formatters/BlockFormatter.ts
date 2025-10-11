import type { NotionBlock, NotionColor } from '../types';

export interface FormattingOptions {
  color?: NotionColor;
  applyColorToAll?: boolean;
  normalizeWhitespace?: boolean;
  removeEmptyBlocks?: boolean;
  mergeConsecutiveParagraphs?: boolean;
  maxConsecutiveEmptyLines?: number;
  mergeSimilarBlocks?: boolean;
  trimRichText?: boolean;
  enforceBlockLimits?: boolean;
  optimizeStructure?: boolean;
  maxBlockDepth?: number;
  maxChildrenPerBlock?: number;
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

    // Merge similar blocks if requested
    if (options.mergeSimilarBlocks) {
      formattedBlocks = this.mergeSimilarBlocks(formattedBlocks);
    }

    // Trim rich text if requested
    if (options.trimRichText) {
      formattedBlocks = this.trimRichText(formattedBlocks);
    }

    // Enforce block limits if requested
    if (options.enforceBlockLimits) {
      formattedBlocks = this.enforceBlockLimits(formattedBlocks, options);
    }

    // Optimize structure if requested
    if (options.optimizeStructure) {
      formattedBlocks = this.optimizeStructure(formattedBlocks, options);
    }

    return formattedBlocks;
  }

  private removeEmptyBlocks(blocks: NotionBlock[]): NotionBlock[] {
    // Filtrer les null/undefined d'abord
    const validBlocks = blocks.filter(block => block != null);
    
    return validBlocks.filter(block => {
      // Protection supplémentaire
      if (!block || !block.type) return false;
      
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

  private mergeSimilarBlocks(blocks: NotionBlock[]): NotionBlock[] {
    const result: NotionBlock[] = [];
    let i = 0;

    while (i < blocks.length) {
      const currentBlock = blocks[i];
      
      // Look for consecutive blocks of the same type that can be merged
      if (this.canMergeBlockType(currentBlock.type)) {
        const similarBlocks = [currentBlock];
        let j = i + 1;
        
        while (j < blocks.length && this.areBlocksSimilar(currentBlock, blocks[j])) {
          similarBlocks.push(blocks[j]);
          j++;
        }
        
        if (similarBlocks.length > 1) {
          const mergedBlock = this.mergeBlocks(similarBlocks);
          result.push(mergedBlock);
        } else {
          result.push(currentBlock);
        }
        
        i = j;
      } else {
        result.push(currentBlock);
        i++;
      }
    }

    return result;
  }

  private canMergeBlockType(type: string): boolean {
    return ['paragraph', 'code'].includes(type);
  }

  private areBlocksSimilar(block1: NotionBlock, block2: NotionBlock): boolean {
    if (block1.type !== block2.type) return false;
    
    switch (block1.type) {
      case 'code':
        const code1 = (block1 as any).code;
        const code2 = (block2 as any).code;
        return code1?.language === code2?.language;
      case 'paragraph':
        return true;
      default:
        return false;
    }
  }

  private mergeBlocks(blocks: NotionBlock[]): NotionBlock {
    const firstBlock = blocks[0];
    const type = firstBlock.type;
    
    switch (type) {
      case 'paragraph':
        const mergedRichText = blocks.flatMap((block, index) => {
          const richText = (block as any).paragraph?.rich_text || [];
          if (index > 0) {
            return [
              { type: 'text', text: { content: '\n' } },
              ...richText
            ];
          }
          return richText;
        });
        
        return {
          type: 'paragraph',
          paragraph: {
            rich_text: mergedRichText,
            color: (firstBlock as any).paragraph?.color
          }
        };
        
      case 'code':
        const mergedCode = blocks.map(block => 
          (block as any).code?.rich_text?.[0]?.text?.content || ''
        ).join('\n');
        
        return {
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: mergedCode } }],
            language: (firstBlock as any).code?.language || 'plain text'
          }
        };
        
      default:
        return firstBlock;
    }
  }

  private trimRichText(blocks: NotionBlock[]): NotionBlock[] {
    return blocks.map(block => {
      const clonedBlock = { ...block };
      
      const richTextFields = this.getRichTextFields(block);
      
      for (const field of richTextFields) {
        const richText = this.getNestedProperty(clonedBlock, field);
        if (Array.isArray(richText)) {
          this.setNestedProperty(clonedBlock, field, this.trimRichTextArray(richText));
        }
      }
      
      return clonedBlock;
    });
  }

  private trimRichTextArray(richText: any[]): any[] {
    if (!Array.isArray(richText) || richText.length === 0) return richText;
    
    return richText.map(item => {
      if (item.type === 'text' && item.text?.content) {
        const trimmed = item.text.content.trim();
        return {
          ...item,
          text: { ...item.text, content: trimmed },
          plain_text: trimmed
        };
      }
      return item;
    });
  }

  private isEmptyRichTextItem(item: any): boolean {
    if (item.type === 'text') {
      return !item.text?.content?.trim();
    }
    return false;
  }

  private enforceBlockLimits(blocks: NotionBlock[], options: FormattingOptions): NotionBlock[] {
    return blocks.map(block => {
      const clonedBlock = { ...block };
      
      // Limite de texte (2000 caractères)
      if (block.type === 'paragraph' || block.type.startsWith('heading_')) {
        const field = (clonedBlock as any)[block.type];
        if (field?.rich_text) {
          field.rich_text = this.limitRichTextLength(field.rich_text, 2000);
        }
      }
      
      // Limite de largeur de table (5 colonnes max)
      if (block.type === 'table') {
        const table = (clonedBlock as any).table;
        if (table && table.table_width > 5) {
          table.table_width = 5;
          // Tronquer les cellules excédentaires
          if (table.children) {
            table.children = table.children.map((row: any) => {
              if (row.table_row?.cells && row.table_row.cells.length > 5) {
                row.table_row.cells = row.table_row.cells.slice(0, 5);
              }
              return row;
            });
          }
        }
      }
      
      return clonedBlock;
    });
  }

  private limitRichTextLength(richText: any[], maxLength: number): any[] {
    let totalLength = 0;
    const result = [];
    
    for (const item of richText) {
      if (item.type === 'text' && item.text?.content) {
        const remaining = maxLength - totalLength;
        if (remaining <= 0) break;
        
        if (item.text.content.length <= remaining) {
          result.push(item);
          totalLength += item.text.content.length;
        } else {
          // Tronquer le texte
          result.push({
            ...item,
            text: { ...item.text, content: item.text.content.substring(0, remaining) },
            plain_text: item.text.content.substring(0, remaining)
          });
          break;
        }
      }
    }
    
    return result;
  }

  private limitBlockDepth(blocks: NotionBlock[], maxDepth: number, currentDepth = 0): NotionBlock[] {
    if (currentDepth >= maxDepth) {
      return blocks.map(block => ({ ...block, children: undefined }));
    }
    
    return blocks.map(block => {
      const clonedBlock = { ...block };
      
      if ((clonedBlock as any).children) {
        (clonedBlock as any).children = this.limitBlockDepth(
          (clonedBlock as any).children,
          maxDepth,
          currentDepth + 1
        );
      }
      
      return clonedBlock;
    });
  }

  private optimizeStructure(blocks: NotionBlock[], _options: FormattingOptions): NotionBlock[] {
    let result = [...blocks];
    
    // Remove redundant nesting
    result = this.flattenUnnecessaryNesting(result);
    
    // Optimize list structures
    result = this.optimizeListStructures(result);
    
    // Remove duplicate consecutive blocks
    result = this.removeDuplicateBlocks(result);
    
    return result;
  }

  private flattenUnnecessaryNesting(blocks: NotionBlock[]): NotionBlock[] {
    return blocks.map(block => {
      const clonedBlock = { ...block };
      
      // If a block has only one child and they're the same type, flatten
      if ((clonedBlock as any).children?.length === 1) {
        const child = (clonedBlock as any).children[0];
        if (child.type === block.type) {
          return child;
        }
      }
      
      return clonedBlock;
    });
  }

  private optimizeListStructures(blocks: NotionBlock[]): NotionBlock[] {
    // Group consecutive list items
    const result: NotionBlock[] = [];
    let i = 0;
    
    while (i < blocks.length) {
      const block = blocks[i];
      
      if (this.isListItem(block)) {
        const listItems = [block];
        let j = i + 1;
        
        while (j < blocks.length && this.isListItem(blocks[j]) && 
               this.isSameListType(block, blocks[j])) {
          listItems.push(blocks[j]);
          j++;
        }
        
        result.push(...listItems);
        i = j;
      } else {
        result.push(block);
        i++;
      }
    }
    
    return result;
  }

  private isListItem(block: NotionBlock): boolean {
    return ['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(block.type);
  }

  private isSameListType(block1: NotionBlock, block2: NotionBlock): boolean {
    return block1.type === block2.type;
  }

  private removeDuplicateBlocks(blocks: NotionBlock[]): NotionBlock[] {
    const result: NotionBlock[] = [];
    let lastBlock: NotionBlock | null = null;
    
    for (const block of blocks) {
      if (!lastBlock || !this.areBlocksIdentical(lastBlock, block)) {
        result.push(block);
        lastBlock = block;
      }
    }
    
    return result;
  }

  private areBlocksIdentical(block1: NotionBlock, block2: NotionBlock): boolean {
    return JSON.stringify(block1) === JSON.stringify(block2);
  }

  private getRichTextFields(block: NotionBlock): string[] {
    switch (block.type) {
      case 'paragraph':
        return ['paragraph.rich_text'];
      case 'heading_1':
        return ['heading_1.rich_text'];
      case 'heading_2':
        return ['heading_2.rich_text'];
      case 'heading_3':
        return ['heading_3.rich_text'];
      case 'bulleted_list_item':
        return ['bulleted_list_item.rich_text'];
      case 'numbered_list_item':
        return ['numbered_list_item.rich_text'];
      case 'to_do':
        return ['to_do.rich_text'];
      case 'toggle':
        return ['toggle.rich_text'];
      case 'quote':
        return ['quote.rich_text'];
      case 'callout':
        return ['callout.rich_text'];
      case 'code':
        return ['code.rich_text'];
      default:
        return [];
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}