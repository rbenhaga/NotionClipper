import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';

export class TableParser extends BaseParser {
  constructor(options: ParseOptions = {}) {
    super(options);
  }

  parse(content: string): ASTNode[] {
    if (!content?.trim()) return [];

    const contentType = this.options.contentType;
    
    switch (contentType) {
      case 'csv':
        return this.parseCsv(content);
      case 'tsv':
        return this.parseTsv(content);
      case 'table':
      default:
        return this.parseMarkdownTable(content);
    }
  }

  private parseCsv(content: string): ASTNode[] {
    return this.parseDelimitedTable(content, ',');
  }

  private parseTsv(content: string): ASTNode[] {
    return this.parseDelimitedTable(content, '\t');
  }

  private parseDelimitedTable(content: string, delimiter: string): ASTNode[] {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      // Not enough data for a table, return as text
      return [this.createTextNode(content)];
    }

    // Parse CSV/TSV with proper quote handling
    const rows = lines.map(line => this.parseDelimitedLine(line, delimiter));
    
    // Use first row as headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Normalize row lengths
    const maxColumns = Math.max(headers.length, ...dataRows.map(row => row.length));
    
    const normalizedHeaders = this.normalizeRow(headers, maxColumns);
    const normalizedRows = dataRows.map(row => this.normalizeRow(row, maxColumns));

    return [this.createTableNode(normalizedHeaders, normalizedRows)];
  }

  private parseDelimitedLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());

    return result;
  }

  private parseMarkdownTable(content: string): ASTNode[] {
    const lines = content.split('\n').filter(line => line.trim());
    
    // Find table lines (containing |)
    const tableLines = lines.filter(line => line.includes('|'));
    
    if (tableLines.length < 2) {
      return [this.createTextNode(content)];
    }

    // Parse headers
    const headerLine = tableLines[0];
    const headers = this.parseMarkdownTableRow(headerLine);

    // Skip separator line if it exists
    let dataStartIndex = 1;
    if (tableLines.length > 1 && this.isMarkdownSeparatorLine(tableLines[1])) {
      dataStartIndex = 2;
    }

    // Parse data rows
    const dataRows = tableLines.slice(dataStartIndex)
      .map(line => this.parseMarkdownTableRow(line))
      .map(row => this.normalizeRow(row, headers.length));

    return [this.createTableNode(headers, dataRows)];
  }

  private parseMarkdownTableRow(line: string): string[] {
    // Remove leading/trailing pipes and split
    const trimmed = line.trim();
    const withoutOuterPipes = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
    const withoutTrailingPipe = withoutOuterPipes.endsWith('|') 
      ? withoutOuterPipes.slice(0, -1) 
      : withoutOuterPipes;

    return withoutTrailingPipe
      .split('|')
      .map(cell => cell.trim())
      .filter((cell, index, array) => {
        // Remove empty cells at the beginning and end
        return !(cell === '' && (index === 0 || index === array.length - 1));
      });
  }

  private isMarkdownSeparatorLine(line: string): boolean {
    const trimmed = line.trim();
    // Check if line contains only |, -, :, and spaces
    return /^[\|\-:\s]+$/.test(trimmed) && trimmed.includes('-');
  }

  private normalizeRow(row: string[], targetLength: number): string[] {
    const normalized = [...row];
    
    // Pad with empty strings if too short
    while (normalized.length < targetLength) {
      normalized.push('');
    }
    
    // Truncate if too long
    if (normalized.length > targetLength) {
      normalized.length = targetLength;
    }
    
    return normalized;
  }

  /**
   * Detect table format from content
   */
  static detectTableFormat(content: string): 'csv' | 'tsv' | 'markdown' | 'none' {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return 'none';

    // Check for markdown table
    const pipeLines = lines.filter(line => line.includes('|')).length;
    if (pipeLines >= 2 && pipeLines / lines.length > 0.5) {
      return 'markdown';
    }

    // Check for TSV (tab-separated)
    const tabLines = lines.filter(line => line.includes('\t')).length;
    if (tabLines / lines.length > 0.7) {
      return 'tsv';
    }

    // Check for CSV (comma-separated)
    const commaLines = lines.filter(line => line.includes(',')).length;
    if (commaLines / lines.length > 0.7) {
      return 'csv';
    }

    return 'none';
  }
}