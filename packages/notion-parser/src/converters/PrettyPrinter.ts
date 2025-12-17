/**
 * PrettyPrinter - Converts AST nodes back to Markdown
 * Used for round-trip testing to verify parsing correctness
 * 
 * @module converters/PrettyPrinter
 */

import type { ASTNode } from '../types/ast';

/**
 * Configuration options for the PrettyPrinter
 */
export interface PrettyPrinterOptions {
  /** Number of spaces per indentation level (default: 2) */
  indentSize?: number;
  /** Use tabs instead of spaces for indentation */
  useTabs?: boolean;
  /** Add blank lines between top-level blocks */
  addBlankLines?: boolean;
}

/**
 * PrettyPrinter class for converting AST nodes back to Markdown
 * Supports all AST node types and preserves indentation for nested lists
 */
export class PrettyPrinter {
  private options: Required<PrettyPrinterOptions>;

  constructor(options: PrettyPrinterOptions = {}) {
    this.options = {
      indentSize: options.indentSize ?? 2,
      useTabs: options.useTabs ?? false,
      addBlankLines: options.addBlankLines ?? true,
    };
  }

  /**
   * Convert an array of AST nodes to Markdown string
   * @param nodes - Array of AST nodes to convert
   * @returns Markdown string representation
   */
  print(nodes: ASTNode[]): string {
    if (!nodes || nodes.length === 0) {
      return '';
    }

    const lines: string[] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const printed = this.printNode(node, 0);
      
      if (printed) {
        lines.push(printed);
      }
    }

    return lines.join(this.options.addBlankLines ? '\n\n' : '\n');
  }

  /**
   * Convert a single AST node to Markdown string
   * @param node - AST node to convert
   * @param indent - Current indentation level
   * @returns Markdown string representation
   */
  printNode(node: ASTNode, indent: number = 0): string {
    if (!node) {
      return '';
    }

    const indentStr = this.getIndent(indent);

    switch (node.type) {
      case 'paragraph':
        return this.printParagraph(node, indentStr);
      
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return this.printHeading(node, indentStr);
      
      case 'list_item':
        return this.printListItem(node, indent);
      
      case 'code':
        return this.printCode(node, indentStr);
      
      case 'table':
        return this.printTable(node, indentStr);
      
      case 'quote':
        return this.printQuote(node, indentStr);
      
      case 'toggle':
        return this.printToggle(node, indent);
      
      case 'callout':
        return this.printCallout(node, indentStr);
      
      case 'divider':
        return `${indentStr}---`;
      
      case 'image':
        return this.printImage(node, indentStr);
      
      case 'video':
      case 'audio':
        return this.printMedia(node, indentStr);
      
      case 'bookmark':
        return this.printBookmark(node, indentStr);
      
      case 'equation':
        return this.printEquation(node, indentStr);
      
      case 'text':
        return `${indentStr}${node.content || ''}`;
      
      default:
        // Fallback for unknown types - treat as paragraph
        return node.content ? `${indentStr}${node.content}` : '';
    }
  }


  /**
   * Get indentation string for the given level
   */
  private getIndent(level: number): string {
    if (level <= 0) return '';
    const char = this.options.useTabs ? '\t' : ' '.repeat(this.options.indentSize);
    return char.repeat(level);
  }

  /**
   * Print a paragraph node
   */
  private printParagraph(node: ASTNode, indent: string): string {
    return `${indent}${node.content || ''}`;
  }

  /**
   * Print a heading node
   */
  private printHeading(node: ASTNode, indent: string): string {
    const level = this.getHeadingLevel(node.type);
    const prefix = '#'.repeat(level);
    return `${indent}${prefix} ${node.content || ''}`;
  }

  /**
   * Extract heading level from node type
   */
  private getHeadingLevel(type: string): number {
    const match = type.match(/heading_(\d)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Print a list item node with proper indentation and markers
   */
  private printListItem(node: ASTNode, indent: number): string {
    const indentStr = this.getIndent(indent);
    const listType = node.metadata?.listType || 'bulleted';
    const isToggleable = node.metadata?.isToggleable || false;
    
    let marker: string;
    let content = node.content || '';
    
    switch (listType) {
      case 'numbered':
        marker = '1.';
        break;
      case 'todo':
        const checked = node.metadata?.checked ? 'x' : ' ';
        marker = `- [${checked}]`;
        break;
      case 'bulleted':
      default:
        marker = '-';
        break;
    }
    
    // Add toggle prefix if toggleable
    const togglePrefix = isToggleable ? '> ' : '';
    
    const lines: string[] = [];
    lines.push(`${indentStr}${togglePrefix}${marker} ${content}`);
    
    // Print children with increased indentation
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childOutput = this.printNode(child, indent + 1);
        if (childOutput) {
          lines.push(childOutput);
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Print a code block node
   */
  private printCode(node: ASTNode, indent: string): string {
    const language = node.metadata?.language || '';
    const content = node.content || '';
    const isBlock = node.metadata?.isBlock !== false;
    
    if (isBlock) {
      return `${indent}\`\`\`${language}\n${indent}${content}\n${indent}\`\`\``;
    } else {
      return `${indent}\`${content}\``;
    }
  }

  /**
   * Print a table node
   */
  private printTable(node: ASTNode, indent: string): string {
    const headers = node.metadata?.headers || [];
    const rows = node.metadata?.rows || [];
    const tableType = node.metadata?.tableType || 'markdown';
    
    if (tableType === 'csv') {
      return this.printCsvTable(headers, rows, indent);
    } else if (tableType === 'tsv') {
      return this.printTsvTable(headers, rows, indent);
    }
    
    return this.printMarkdownTable(headers, rows, indent);
  }

  /**
   * Print a Markdown-style table
   */
  private printMarkdownTable(headers: string[], rows: string[][], indent: string): string {
    const lines: string[] = [];
    
    // Determine column widths
    const allRows = headers.length > 0 ? [headers, ...rows] : rows;
    const colCount = Math.max(...allRows.map(r => r.length), 0);
    
    if (colCount === 0) {
      return '';
    }
    
    // Print header row
    if (headers.length > 0) {
      const headerRow = headers.map(h => h || '').join(' | ');
      lines.push(`${indent}| ${headerRow} |`);
      
      // Print separator row
      const separator = headers.map(() => '---').join(' | ');
      lines.push(`${indent}| ${separator} |`);
    }
    
    // Print data rows
    for (const row of rows) {
      const rowStr = row.map(cell => cell || '').join(' | ');
      lines.push(`${indent}| ${rowStr} |`);
    }
    
    return lines.join('\n');
  }

  /**
   * Print a CSV-style table
   */
  private printCsvTable(headers: string[], rows: string[][], indent: string): string {
    const lines: string[] = [];
    
    if (headers.length > 0) {
      lines.push(`${indent}${headers.join(',')}`);
    }
    
    for (const row of rows) {
      lines.push(`${indent}${row.join(',')}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Print a TSV-style table
   */
  private printTsvTable(headers: string[], rows: string[][], indent: string): string {
    const lines: string[] = [];
    
    if (headers.length > 0) {
      lines.push(`${indent}${headers.join('\t')}`);
    }
    
    for (const row of rows) {
      lines.push(`${indent}${row.join('\t')}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Print a quote block node
   */
  private printQuote(node: ASTNode, indent: string): string {
    const content = node.content || '';
    // Use >> for quote blocks to distinguish from toggle lists
    return `${indent}>> ${content}`;
  }

  /**
   * Print a toggle list node
   */
  private printToggle(node: ASTNode, indent: number): string {
    const indentStr = this.getIndent(indent);
    const content = node.content || '';
    const lines: string[] = [];
    
    lines.push(`${indentStr}> ${content}`);
    
    // Print children with increased indentation
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childOutput = this.printNode(child, indent + 1);
        if (childOutput) {
          lines.push(childOutput);
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Print a callout node
   */
  private printCallout(node: ASTNode, indent: string): string {
    const content = node.content || '';
    const calloutType = this.getCalloutType(node);
    return `${indent}> [!${calloutType}] ${content}`;
  }

  /**
   * Get callout type from node metadata
   */
  private getCalloutType(node: ASTNode): string {
    const icon = node.metadata?.icon || '💡';
    const color = node.metadata?.color || 'gray';
    
    // Map icon/color back to callout type
    const iconMap: Record<string, string> = {
      '📝': 'note',
      'ℹ️': 'info',
      '💡': 'tip',
      '⚠️': 'warning',
      '🚨': 'danger',
      '✅': 'success',
    };
    
    return iconMap[icon] || 'tip';
  }

  /**
   * Print an image node
   */
  private printImage(node: ASTNode, indent: string): string {
    const url = node.metadata?.url || node.content || '';
    const alt = node.metadata?.caption || node.metadata?.alt || '';
    return `${indent}![${alt}](${url})`;
  }

  /**
   * Print a video or audio node
   */
  private printMedia(node: ASTNode, indent: string): string {
    const url = node.metadata?.url || node.content || '';
    return `${indent}${url}`;
  }

  /**
   * Print a bookmark node
   */
  private printBookmark(node: ASTNode, indent: string): string {
    const url = node.metadata?.url || node.content || '';
    const title = node.metadata?.title || url;
    return `${indent}[${title}](${url})`;
  }

  /**
   * Print an equation node
   */
  private printEquation(node: ASTNode, indent: string): string {
    const expression = node.content || '';
    const isBlock = node.metadata?.isBlock !== false;
    
    if (isBlock) {
      return `${indent}$$\n${indent}${expression}\n${indent}$$`;
    } else {
      return `${indent}$${expression}$`;
    }
  }
}

/**
 * Default PrettyPrinter instance for convenience
 */
export const prettyPrinter = new PrettyPrinter();

/**
 * Convenience function to print AST nodes to Markdown
 * @param nodes - Array of AST nodes to convert
 * @param options - Optional configuration
 * @returns Markdown string representation
 */
export function printToMarkdown(nodes: ASTNode[], options?: PrettyPrinterOptions): string {
  const printer = options ? new PrettyPrinter(options) : prettyPrinter;
  return printer.print(nodes);
}
