import type { NotionBlock } from '../types';

export interface ValidationOptions {
  strictMode?: boolean;
  validateNestedBlocks?: boolean;
  validateRichText?: boolean;
  validateUrls?: boolean;
  maxBlockDepth?: number;
  maxRichTextLength?: number;
  maxTableWidth?: number;
}

export interface ValidationError {
  code: string;
  message: string;
  blockIndex?: number;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class NotionValidator {
  private readonly validBlockTypes = [
    'paragraph', 'heading_1', 'heading_2', 'heading_3',
    'bulleted_list_item', 'numbered_list_item', 'to_do',
    'toggle', 'code', 'quote', 'callout', 'divider',
    'table', 'table_row', 'image', 'video', 'audio',
    'file', 'pdf', 'bookmark', 'equation', 'breadcrumb',
    'column_list', 'column', 'table_of_contents'
  ];

  validate(blocks: NotionBlock[], options: ValidationOptions = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      // Skip null/undefined blocks
      if (!block) {
        errors.push({
          code: 'NULL_BLOCK',
          message: 'Block is null or undefined',
          blockIndex: i
        });
        continue;
      }
      
      // Validate block type
      const typeResult = this.validateBlockType(block);
      if (!typeResult.isValid) {
        if (options.strictMode) {
          errors.push({
            code: 'INVALID_BLOCK_TYPE',
            message: `Invalid block type: ${block?.type || 'undefined'}`,
            blockIndex: i
          });
        } else {
          warnings.push({
            code: 'INVALID_BLOCK_TYPE',
            message: `Invalid block type: ${block?.type || 'undefined'}`,
            blockIndex: i
          });
        }
      }

      // Validate rich text
      if (options.validateRichText) {
        const richTextResult = this.validateRichTextInBlock(block, options);
        errors.push(...richTextResult.errors.map(e => ({ ...e, blockIndex: i })));
        warnings.push(...richTextResult.warnings.map(w => ({ ...w, blockIndex: i })));
      }

      // Validate URLs
      if (options.validateUrls) {
        const urlResult = this.validateUrlsInBlock(block);
        errors.push(...urlResult.errors.map(e => ({ ...e, blockIndex: i })));
        warnings.push(...urlResult.warnings.map(w => ({ ...w, blockIndex: i })));
      }

      // Validate table structure
      if (block.type === 'table') {
        const tableResult = this.validateTable(block);
        errors.push(...tableResult.errors.map(e => ({ ...e, blockIndex: i })));
        warnings.push(...tableResult.warnings.map(w => ({ ...w, blockIndex: i })));
      }

      // Validate nested blocks
      if (options.validateNestedBlocks && (block as any).children) {
        const nestedResult = this.validateNestedBlocks(
          (block as any).children, 
          options, 
          1
        );
        errors.push(...nestedResult.errors.map(e => ({ ...e, blockIndex: i })));
        warnings.push(...nestedResult.warnings.map(w => ({ ...w, blockIndex: i })));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateBlockType(block: NotionBlock): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!block || !block.type) {
      errors.push({
        code: 'MISSING_BLOCK_TYPE',
        message: 'Block must have a type property'
      });
    } else if (!this.validBlockTypes.includes(block.type)) {
      errors.push({
        code: 'INVALID_BLOCK_TYPE',
        message: `Invalid block type: ${block.type}`
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateTable(block: NotionBlock): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (block.type !== 'table') {
      return { isValid: true, errors, warnings };
    }

    const table = (block as any).table;
    
    if (!table) {
      errors.push({
        code: 'MISSING_TABLE_PROPERTY',
        message: 'Table block must have table property'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate table width
    if (table.table_width > 5) {
      errors.push({
        code: 'TABLE_TOO_WIDE',
        message: `Table width ${table.table_width} exceeds maximum of 5 columns`
      });
    }

    // Validate table rows
    if (table.children && Array.isArray(table.children)) {
      for (let i = 0; i < table.children.length; i++) {
        const row = table.children[i];
        
        if (row.type !== 'table_row') {
          errors.push({
            code: 'INVALID_TABLE_ROW',
            message: `Table child at index ${i} must be table_row type`
          });
        }

        if (row.table_row?.cells) {
          if (row.table_row.cells.length !== table.table_width) {
            warnings.push({
              code: 'TABLE_ROW_CELL_MISMATCH',
              message: `Row ${i} has ${row.table_row.cells.length} cells but table width is ${table.table_width}`
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateRichTextInBlock(block: NotionBlock, options: ValidationOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const richTextFields = this.getRichTextFields(block.type);
    
    for (const field of richTextFields) {
      const richText = this.getNestedProperty(block, field);
      
      if (Array.isArray(richText)) {
        const result = this.validateRichText(richText, options);
        errors.push(...result.errors.map(e => ({ ...e, field })));
        warnings.push(...result.warnings.map(w => ({ ...w, field })));
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateRichText(richText: any[], options: ValidationOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    let totalLength = 0;

    for (let i = 0; i < richText.length; i++) {
      const item = richText[i];

      if (!item.type) {
        errors.push({
          code: 'MISSING_RICH_TEXT_TYPE',
          message: `Rich text item at index ${i} missing type`
        });
        continue;
      }

      if (item.type === 'text') {
        if (!item.text || typeof item.text.content !== 'string') {
          errors.push({
            code: 'INVALID_TEXT_CONTENT',
            message: `Text item at index ${i} missing or invalid content`
          });
        } else {
          totalLength += item.text.content.length;
        }
      }

      if (item.href && !this.isValidUrl(item.href)) {
        errors.push({
          code: 'INVALID_HREF',
          message: `Invalid href URL at index ${i}: ${item.href}`
        });
      }
    }

    // Check total length
    const maxLength = options.maxRichTextLength || 2000;
    if (totalLength > maxLength) {
      errors.push({
        code: 'TEXT_TOO_LONG',
        message: `Rich text length ${totalLength} exceeds maximum of ${maxLength}`
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateUrlsInBlock(block: NotionBlock): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check media blocks
    if (['image', 'video', 'audio'].includes(block.type)) {
      const mediaField = (block as any)[block.type];
      if (mediaField?.external?.url) {
        if (!this.isValidUrl(mediaField.external.url)) {
          errors.push({
            code: 'INVALID_MEDIA_URL',
            message: `Invalid ${block.type} URL: ${mediaField.external.url}`
          });
        }
      }
    }

    // Check bookmark URLs
    if (block.type === 'bookmark') {
      const bookmark = (block as any).bookmark;
      if (bookmark?.url && !this.isValidUrl(bookmark.url)) {
        errors.push({
          code: 'INVALID_BOOKMARK_URL',
          message: `Invalid bookmark URL: ${bookmark.url}`
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateNestedBlocks(
    children: NotionBlock[], 
    options: ValidationOptions, 
    currentDepth: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check depth limit
    const maxDepth = options.maxBlockDepth || 10;
    if (currentDepth > maxDepth) {
      errors.push({
        code: 'MAX_DEPTH_EXCEEDED',
        message: `Block nesting depth ${currentDepth} exceeds maximum of ${maxDepth}`
      });
      return { isValid: false, errors, warnings };
    }

    // Recursively validate children
    const childResult = this.validate(children, {
      ...options,
      validateNestedBlocks: true
    });

    errors.push(...childResult.errors);
    warnings.push(...childResult.warnings);

    // Continue checking nested children
    for (const child of children) {
      if ((child as any).children) {
        const nestedResult = this.validateNestedBlocks(
          (child as any).children,
          options,
          currentDepth + 1
        );
        errors.push(...nestedResult.errors);
        warnings.push(...nestedResult.warnings);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const allowedProtocols = ['http:', 'https:'];
      return allowedProtocols.includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  private getRichTextFields(blockType: string): string[] {
    switch (blockType) {
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
}