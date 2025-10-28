// packages/ui/src/lib/validators/index.ts
// 🎯 Validation schemas and functions

import { VALIDATION_LIMITS } from '../constants';

// ============================================
// VALIDATION RESULT TYPE
// ============================================
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================
// BASIC VALIDATORS
// ============================================
export const validators = {
  /**
   * Validates required field
   */
  required: (value: any, fieldName = 'Field'): ValidationResult => {
    const isValid = value !== null && value !== undefined && value !== '';
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} is required`],
    };
  },

  /**
   * Validates string length
   */
  stringLength: (
    value: string,
    min: number,
    max: number,
    fieldName = 'Field'
  ): ValidationResult => {
    const length = value?.length || 0;
    const isValid = length >= min && length <= max;
    const errors: string[] = [];

    if (length < min) {
      errors.push(`${fieldName} must be at least ${min} characters`);
    }
    if (length > max) {
      errors.push(`${fieldName} must be no more than ${max} characters`);
    }

    return { isValid, errors };
  },

  /**
   * Validates email format
   */
  email: (value: string): ValidationResult => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);
    return {
      isValid,
      errors: isValid ? [] : ['Invalid email format'],
    };
  },

  /**
   * Validates URL format
   */
  url: (value: string): ValidationResult => {
    try {
      new URL(value);
      return { isValid: true, errors: [] };
    } catch {
      return { isValid: false, errors: ['Invalid URL format'] };
    }
  },

  /**
   * Validates Notion token format
   */
  notionToken: (value: string): ValidationResult => {
    const isValid = /^ntn_[a-zA-Z0-9]{43}$/.test(value);
    return {
      isValid,
      errors: isValid ? [] : ['Invalid Notion token format'],
    };
  },

  /**
   * Validates file size
   */
  fileSize: (file: File, maxSize: number): ValidationResult => {
    const isValid = file.size <= maxSize;
    return {
      isValid,
      errors: isValid ? [] : [`File size must be less than ${maxSize} bytes`],
    };
  },

  /**
   * Validates file type
   */
  fileType: (file: File, allowedTypes: string[]): ValidationResult => {
    const isValid = allowedTypes.includes(file.type);
    return {
      isValid,
      errors: isValid ? [] : [`File type ${file.type} is not allowed`],
    };
  },
};

// ============================================
// COMPOSITE VALIDATORS
// ============================================
export const compositeValidators = {
  /**
   * Validates clipboard content
   */
  clipboardContent: (content: any): ValidationResult => {
    const errors: string[] = [];

    if (!content) {
      errors.push('Content is required');
      return { isValid: false, errors };
    }

    if (content.text) {
      const textValidation = validators.stringLength(
        content.text,
        1,
        VALIDATION_LIMITS.MAX_CLIPBOARD_LENGTH,
        'Clipboard text'
      );
      errors.push(...textValidation.errors);
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Validates page selection
   */
  pageSelection: (selectedPage: any, selectedPages: string[]): ValidationResult => {
    const hasSelection = selectedPage || selectedPages.length > 0;
    return {
      isValid: hasSelection,
      errors: hasSelection ? [] : ['Please select at least one page'],
    };
  },

  /**
   * Validates configuration
   */
  config: (config: any): ValidationResult => {
    const errors: string[] = [];

    if (config.notionToken) {
      const tokenValidation = validators.notionToken(config.notionToken);
      errors.push(...tokenValidation.errors);
    }

    if (config.workspaceName) {
      const nameValidation = validators.stringLength(
        config.workspaceName,
        1,
        100,
        'Workspace name'
      );
      errors.push(...nameValidation.errors);
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Validates file upload
   */
  fileUpload: (
    files: File[],
    maxSize: number,
    allowedTypes: string[]
  ): ValidationResult => {
    const errors: string[] = [];

    if (files.length === 0) {
      errors.push('Please select at least one file');
      return { isValid: false, errors };
    }

    files.forEach((file, index) => {
      const sizeValidation = validators.fileSize(file, maxSize);
      const typeValidation = validators.fileType(file, allowedTypes);

      sizeValidation.errors.forEach(error => {
        errors.push(`File ${index + 1}: ${error}`);
      });

      typeValidation.errors.forEach(error => {
        errors.push(`File ${index + 1}: ${error}`);
      });
    });

    return { isValid: errors.length === 0, errors };
  },
};

// ============================================
// VALIDATION UTILITIES
// ============================================
/**
 * Combines multiple validation results
 */
export function combineValidations(...validations: ValidationResult[]): ValidationResult {
  const allErrors = validations.flatMap(v => v.errors);
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Validates object against schema
 */
export function validateSchema<T>(
  obj: T,
  schema: Record<keyof T, (value: any) => ValidationResult>
): ValidationResult {
  const errors: string[] = [];

  Object.entries(schema).forEach(([key, validator]) => {
    const value = obj[key as keyof T];
    if (typeof validator === 'function') {
      const result = validator(value);
      errors.push(...result.errors);
    }
  });

  return { isValid: errors.length === 0, errors };
}

// ============================================
// FORM VALIDATION HELPERS
// ============================================
export type FormValidationConfig<T> = {
  [K in keyof T]?: (value: T[K]) => ValidationResult;
};

export class FormValidator<T extends Record<string, any>> {
  private schema: FormValidationConfig<T>;

  constructor(schema: FormValidationConfig<T>) {
    this.schema = schema;
  }

  validate(data: T): ValidationResult {
    return validateSchema(data, this.schema as any);
  }

  validateField(field: keyof T, value: T[keyof T]): ValidationResult {
    const validator = this.schema[field];
    if (!validator) {
      return { isValid: true, errors: [] };
    }
    return validator(value);
  }
}