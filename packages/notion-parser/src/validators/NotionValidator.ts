import type { NotionBlock, NotionRichText, ValidationOptions } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'error';
  code: string;
  message: string;
  blockIndex?: number;
  field?: string;
}

export interface ValidationWarning {
  type: 'warning';
  code: string;
  message: string;
  blockIndex?: number;
  field?: string;
}

export class NotionValidator {
  private readonly limits = {
    maxRichTextLength: 2000,
    maxBlocksPerRequest: 100,
    maxCodeLength: 2000,
    maxEquationLength: 1000,
    maxUrlLength: 2000,
    maxCaptionLength: 500,
    maxTableWidth: 5,
    maxBlockDepth: 3
  };

  validate(blocks: NotionBlock[], options: ValidationOptions = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Merge options with defaults
    const validationOptions = {
      strictMode: false,
      validateRichText: true,
      validateBlockStructure: true,
      maxBlockDepth: this.limits.maxBlockDepth,
      ...options
    };

    // Validate block count
    if (blocks.length > this.limits.maxBlocksPerRequest) {
      if (validationOptions.strictMode) {
        errors.push({
          type: 'error',
          code: 'TOO_MANY_BLOCKS',
          message: `Too many blocks: ${blocks.length}. Maximum allowed: ${this.limits.maxBlocksPerRequest}`
        });
      } else {
        warnings.push({
          type: 'warning',
          code: 'TOO_MANY_BLOCKS',
          message: `Block count (${blocks.length}) exceeds recommended limit (${this.limits.maxBlocksPerRequest})`
        });
      }
    }

    // Validate each block
    blocks.forEach((block, index) => {
      const blockErrors = this.validateBlock(block, validationOptions);
      blockErrors.forEach(error => {
        if (error.type === 'error') {
          errors.push({ ...error, blockIndex: index });
        } else {
          warnings.push({ ...error, blockIndex: index });
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateBlock(block: NotionBlock, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    // Validate block type
    if (!block.type) {
      issues.push({
        type: 'error',
        code: 'MISSING_BLOCK_TYPE',
        message: 'Block is missing required type field'
      });
      return issues;
    }

    // Validate block structure based on type
    switch (block.type) {
      case 'paragraph':
        issues.push(...this.validateParagraphBlock(block, options));
        break;
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        issues.push(...this.validateHeadingBlock(block, options));
        break;
      case 'bulleted_list_item':
      case 'numbered_list_item':
        issues.push(...this.validateListItemBlock(block, options));
        break;
      case 'to_do':
        issues.push(...this.validateToDoBlock(block, options));
        break;
      case 'toggle':
        issues.push(...this.validateToggleBlock(block, options));
        break;
      case 'code':
        issues.push(...this.validateCodeBlock(block, options));
        break;
      case 'quote':
        issues.push(...this.validateQuoteBlock(block, options));
        break;
      case 'callout':
        issues.push(...this.validateCalloutBlock(block, options));
        break;
      case 'table':
        issues.push(...this.validateTableBlock(block, options));
        break;
      case 'image':
      case 'video':
      case 'pdf':
        issues.push(...this.validateMediaBlock(block, options));
        break;
      case 'bookmark':
        issues.push(...this.validateBookmarkBlock(block, options));
        break;
      case 'equation':
        issues.push(...this.validateEquationBlock(block, options));
        break;
      case 'divider':
        // Divider blocks don't need validation
        break;
      default:
        issues.push({
          type: 'warning',
          code: 'UNKNOWN_BLOCK_TYPE',
          message: `Unknown block type: ${block.type}`
        });
    }

    return issues;
  }

  private validateParagraphBlock(block: any, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.paragraph) {
      issues.push({
        type: 'error',
        code: 'MISSING_PARAGRAPH_CONTENT',
        message: 'Paragraph block is missing paragraph field'
      });
      return issues;
    }

    if (options.validateRichText && block.paragraph.rich_text) {
      issues.push(...this.validateRichText(block.paragraph.rich_text, 'paragraph.rich_text'));
    }

    return issues;
  }

  private validateHeadingBlock(block: any, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];
    const headingField = block[block.type];

    if (!headingField) {
      issues.push({
        type: 'error',
        code: 'MISSING_HEADING_CONTENT',
        message: `Heading block is missing ${block.type} field`
      });
      return issues;
    }

    if (options.validateRichText && headingField.rich_text) {
      issues.push(...this.validateRichText(headingField.rich_text, `${block.type}.rich_text`));
    }

    return issues;
  }

  private validateListItemBlock(block: any, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];
    const listField = block[block.type];

    if (!listField) {
      issues.push({
        type: 'error',
        code: 'MISSING_LIST_CONTENT',
        message: `List item block is missing ${block.type} field`
      });
      return issues;
    }

    if (options.validateRichText && listField.rich_text) {
      issues.push(...this.validateRichText(listField.rich_text, `${block.type}.rich_text`));
    }

    return issues;
  }

  private validateToDoBlock(block: any, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.to_do) {
      issues.push({
        type: 'error',
        code: 'MISSING_TODO_CONTENT',
        message: 'To-do block is missing to_do field'
      });
      return issues;
    }

    if (typeof block.to_do.checked !== 'boolean') {
      issues.push({
        type: 'error',
        code: 'INVALID_TODO_CHECKED',
        message: 'To-do block checked field must be a boolean'
      });
    }

    if (options.validateRichText && block.to_do.rich_text) {
      issues.push(...this.validateRichText(block.to_do.rich_text, 'to_do.rich_text'));
    }

    return issues;
  }

  private validateToggleBlock(block: any, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.toggle) {
      issues.push({
        type: 'error',
        code: 'MISSING_TOGGLE_CONTENT',
        message: 'Toggle block is missing toggle field'
      });
      return issues;
    }

    if (options.validateRichText && block.toggle.rich_text) {
      issues.push(...this.validateRichText(block.toggle.rich_text, 'toggle.rich_text'));
    }

    return issues;
  }

  private validateCodeBlock(block: any, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.code) {
      issues.push({
        type: 'error',
        code: 'MISSING_CODE_CONTENT',
        message: 'Code block is missing code field'
      });
      return issues;
    }

    if (options.validateRichText && block.code.rich_text) {
      const richTextIssues = this.validateRichText(block.code.rich_text, 'code.rich_text');
      
      // Check code length
      const totalLength = block.code.rich_text.reduce((sum: number, item: any) => {
        return sum + (item.text?.content?.length || 0);
      }, 0);

      if (totalLength > this.limits.maxCodeLength) {
        issues.push({
          type: 'warning',
          code: 'CODE_TOO_LONG',
          message: `Code content length (${totalLength}) exceeds recommended limit (${this.limits.maxCodeLength})`
        });
      }

      issues.push(...richTextIssues);
    }

    return issues;
  }

  private validateQuoteBlock(block: any, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.quote) {
      issues.push({
        type: 'error',
        code: 'MISSING_QUOTE_CONTENT',
        message: 'Quote block is missing quote field'
      });
      return issues;
    }

    if (options.validateRichText && block.quote.rich_text) {
      issues.push(...this.validateRichText(block.quote.rich_text, 'quote.rich_text'));
    }

    return issues;
  }

  private validateCalloutBlock(block: any, options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.callout) {
      issues.push({
        type: 'error',
        code: 'MISSING_CALLOUT_CONTENT',
        message: 'Callout block is missing callout field'
      });
      return issues;
    }

    if (options.validateRichText && block.callout.rich_text) {
      issues.push(...this.validateRichText(block.callout.rich_text, 'callout.rich_text'));
    }

    // Validate icon
    if (block.callout.icon) {
      if (!block.callout.icon.type || !['emoji', 'external', 'file'].includes(block.callout.icon.type)) {
        issues.push({
          type: 'error',
          code: 'INVALID_CALLOUT_ICON',
          message: 'Callout icon must have a valid type (emoji, external, or file)'
        });
      }
    }

    return issues;
  }

  private validateTableBlock(block: any, _options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.table) {
      issues.push({
        type: 'error',
        code: 'MISSING_TABLE_CONTENT',
        message: 'Table block is missing table field'
      });
      return issues;
    }

    // Validate table width
    if (typeof block.table.table_width !== 'number' || block.table.table_width < 1) {
      issues.push({
        type: 'error',
        code: 'INVALID_TABLE_WIDTH',
        message: 'Table width must be a positive number'
      });
    }

    if (block.table.table_width > this.limits.maxTableWidth) {
      issues.push({
        type: 'warning',
        code: 'TABLE_TOO_WIDE',
        message: `Table width (${block.table.table_width}) exceeds recommended limit (${this.limits.maxTableWidth})`
      });
    }

    return issues;
  }

  private validateMediaBlock(block: any, _options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];
    const mediaField = block[block.type];

    if (!mediaField) {
      issues.push({
        type: 'error',
        code: 'MISSING_MEDIA_CONTENT',
        message: `Media block is missing ${block.type} field`
      });
      return issues;
    }

    // Validate URL
    if (mediaField.type === 'external' && mediaField.external?.url) {
      const url = mediaField.external.url;
      if (url.length > this.limits.maxUrlLength) {
        issues.push({
          type: 'warning',
          code: 'URL_TOO_LONG',
          message: `URL length (${url.length}) exceeds recommended limit (${this.limits.maxUrlLength})`
        });
      }

      const urlPattern = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;
      if (!urlPattern.test(url) || !url.includes('.')) {
        issues.push({
          type: 'error',
          code: 'INVALID_URL',
          message: `Invalid URL: ${url}`
        });
      }
    }

    return issues;
  }

  private validateBookmarkBlock(block: any, _options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.bookmark) {
      issues.push({
        type: 'error',
        code: 'MISSING_BOOKMARK_CONTENT',
        message: 'Bookmark block is missing bookmark field'
      });
      return issues;
    }

    // Validate URL
    if (block.bookmark.url) {
      const urlPattern = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;
      if (!urlPattern.test(block.bookmark.url) || !block.bookmark.url.includes('.')) {
        issues.push({
          type: 'error',
          code: 'INVALID_BOOKMARK_URL',
          message: `Invalid bookmark URL: ${block.bookmark.url}`
        });
      }
    } else {
      issues.push({
        type: 'error',
        code: 'MISSING_BOOKMARK_URL',
        message: 'Bookmark block is missing URL'
      });
    }

    return issues;
  }

  private validateEquationBlock(block: any, _options: ValidationOptions): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!block.equation) {
      issues.push({
        type: 'error',
        code: 'MISSING_EQUATION_CONTENT',
        message: 'Equation block is missing equation field'
      });
      return issues;
    }

    if (!block.equation.expression) {
      issues.push({
        type: 'error',
        code: 'MISSING_EQUATION_EXPRESSION',
        message: 'Equation block is missing expression'
      });
    } else if (block.equation.expression.length > this.limits.maxEquationLength) {
      issues.push({
        type: 'warning',
        code: 'EQUATION_TOO_LONG',
        message: `Equation length (${block.equation.expression.length}) exceeds recommended limit (${this.limits.maxEquationLength})`
      });
    }

    return issues;
  }

  private validateRichText(richText: NotionRichText[], field: string): (ValidationError | ValidationWarning)[] {
    const issues: (ValidationError | ValidationWarning)[] = [];

    if (!Array.isArray(richText)) {
      issues.push({
        type: 'error',
        code: 'INVALID_RICH_TEXT_FORMAT',
        message: `${field} must be an array`,
        field
      });
      return issues;
    }

    // Calculate total length
    const totalLength = richText.reduce((sum, item) => {
      const content = item.type === 'text' 
        ? item.text?.content || ''
        : item.type === 'equation'
        ? item.equation?.expression || ''
        : '';
      return sum + content.length;
    }, 0);

    if (totalLength > this.limits.maxRichTextLength) {
      issues.push({
        type: 'warning',
        code: 'RICH_TEXT_TOO_LONG',
        message: `Rich text length (${totalLength}) exceeds recommended limit (${this.limits.maxRichTextLength})`,
        field
      });
    }

    // Validate each rich text item
    richText.forEach((item, index) => {
      if (!item.type || !['text', 'mention', 'equation'].includes(item.type)) {
        issues.push({
          type: 'error',
          code: 'INVALID_RICH_TEXT_TYPE',
          message: `Rich text item ${index} has invalid type: ${item.type}`,
          field: `${field}[${index}]`
        });
      }

      if (item.type === 'text' && !item.text) {
        issues.push({
          type: 'error',
          code: 'MISSING_TEXT_CONTENT',
          message: `Rich text item ${index} is missing text field`,
          field: `${field}[${index}]`
        });
      }

      if (item.type === 'equation' && !item.equation?.expression) {
        issues.push({
          type: 'error',
          code: 'MISSING_EQUATION_EXPRESSION',
          message: `Rich text equation ${index} is missing expression`,
          field: `${field}[${index}]`
        });
      }
    });

    return issues;
  }
}