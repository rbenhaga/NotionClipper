import type { ASTNode } from '../types/ast';

/**
 * Validateur de contenu pour l'AST
 */
export class ContentValidator {
  private static readonly MAX_TEXT_LENGTH = 2000;
  private static readonly MAX_CHILDREN_DEPTH = 10;
  private static readonly MAX_LIST_ITEMS = 100;

  /**
   * ✅ Valide un nœud AST
   */
  static validate(node: ASTNode): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation du type
    if (!node.type || typeof node.type !== 'string') {
      errors.push('Node type is required and must be a string');
    }

    // Validation du contenu
    if (node.content && typeof node.content !== 'string') {
      errors.push('Node content must be a string');
    }

    // Validation de la longueur du texte
    if (node.content && node.content.length > this.MAX_TEXT_LENGTH) {
      warnings.push(`Text content exceeds ${this.MAX_TEXT_LENGTH} characters and will be truncated`);
    }

    // Validation des enfants
    if (node.children) {
      if (!Array.isArray(node.children)) {
        errors.push('Node children must be an array');
      } else {
        const childValidation = this.validateChildren(node.children, 1);
        errors.push(...childValidation.errors);
        warnings.push(...childValidation.warnings);
      }
    }

    // Validations spécifiques par type
    const typeValidation = this.validateByType(node);
    errors.push(...typeValidation.errors);
    warnings.push(...typeValidation.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ✅ Valide les enfants récursivement
   */
  private static validateChildren(children: ASTNode[], depth: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (depth > this.MAX_CHILDREN_DEPTH) {
      errors.push(`Maximum nesting depth of ${this.MAX_CHILDREN_DEPTH} exceeded`);
      return { valid: false, errors, warnings };
    }

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childResult = this.validate(child);
      
      // Préfixer les erreurs avec l'index de l'enfant
      errors.push(...childResult.errors.map(err => `Child ${i}: ${err}`));
      warnings.push(...childResult.warnings.map(warn => `Child ${i}: ${warn}`));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ✅ Validations spécifiques par type de nœud
   */
  private static validateByType(node: ASTNode): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (node.type) {
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        if (!node.content?.trim()) {
          errors.push('Heading content cannot be empty');
        }
        if (node.content && node.content.length > 100) {
          warnings.push('Heading content is very long and may be truncated');
        }
        break;

      case 'code':
        if (node.metadata?.language && typeof node.metadata.language !== 'string') {
          errors.push('Code language must be a string');
        }
        break;

      case 'image':
      case 'video':
      case 'audio':
      case 'bookmark':
        if (!node.metadata?.url) {
          errors.push(`${node.type} requires a URL`);
        } else if (!this.isValidUrl(node.metadata.url)) {
          errors.push(`Invalid URL for ${node.type}`);
        }
        break;

      case 'table':
        const tableValidation = this.validateTable(node);
        errors.push(...tableValidation.errors);
        warnings.push(...tableValidation.warnings);
        break;

      case 'bulleted_list_item':
      case 'numbered_list_item':
      case 'to_do':
        if (!node.content?.trim()) {
          warnings.push('List item has empty content');
        }
        break;

      case 'callout':
        if (!node.metadata?.calloutType) {
          warnings.push('Callout missing type, defaulting to "note"');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ✅ Validation spécifique pour les tables
   */
  private static validateTable(node: ASTNode): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const headers = node.metadata?.headers;
    const rows = node.metadata?.rows;

    if (!headers && !rows) {
      errors.push('Table must have headers or rows');
      return { valid: false, errors, warnings };
    }

    if (headers && !Array.isArray(headers)) {
      errors.push('Table headers must be an array');
    }

    if (rows && !Array.isArray(rows)) {
      errors.push('Table rows must be an array');
    }

    if (headers && rows) {
      const headerLength = headers.length;
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) {
          errors.push(`Table row ${i} must be an array`);
          continue;
        }
        
        if (row.length !== headerLength) {
          warnings.push(`Table row ${i} has ${row.length} cells but header has ${headerLength} columns`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ✅ Valide une URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * ✅ Sanitize et répare un nœud
   */
  static sanitize(node: ASTNode): ASTNode {
    const sanitized = { ...node };

    // Sanitize le contenu
    if (sanitized.content) {
      sanitized.content = sanitized.content.substring(0, this.MAX_TEXT_LENGTH);
    }

    // Sanitize les métadonnées
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeMetadata(sanitized.metadata);
    }

    // Sanitize les enfants
    if (sanitized.children) {
      sanitized.children = sanitized.children
        .map(child => this.sanitize(child))
        .slice(0, this.MAX_LIST_ITEMS); // Limiter le nombre d'enfants
    }

    return sanitized;
  }

  /**
   * ✅ Sanitize les métadonnées
   */
  private static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (key === 'url' && typeof value === 'string') {
        // Sanitize URL
        try {
          const urlObj = new URL(value);
          if (['http:', 'https:'].includes(urlObj.protocol)) {
            sanitized[key] = urlObj.toString();
          }
        } catch {
          // URL invalide, ignorer
        }
      } else if (typeof value === 'string') {
        // Limiter la longueur des strings
        sanitized[key] = value.substring(0, 500);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // Limiter la taille des arrays
        sanitized[key] = value.slice(0, 50);
      }
      // Ignorer les autres types
    }

    return sanitized;
  }
}

/**
 * Résultat de validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}