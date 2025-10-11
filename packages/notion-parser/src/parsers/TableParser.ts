import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

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
    
    // Detect headers
    const hasColumnHeader = this.detectColumnHeaders(rows);
    const hasRowHeader = this.detectRowHeaders(rows);
    
    // Use first row as headers if detected
    const headers = hasColumnHeader ? rows[0] : [];
    const dataRows = hasColumnHeader ? rows.slice(1) : rows;

    // Normalize row lengths
    const maxColumns = Math.max(
      headers.length, 
      ...dataRows.map(row => row.length)
    );
    
    const normalizedHeaders = hasColumnHeader ? this.normalizeRow(headers, maxColumns) : [];
    const normalizedRows = dataRows.map(row => this.normalizeRow(row, maxColumns));

    return [this.createTableNode(normalizedHeaders, normalizedRows, {
      hasColumnHeader,
      hasRowHeader
    })];
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

    // Check for separator line (indicates headers)
    let dataStartIndex = 1;
    let hasColumnHeader = false;
    
    if (tableLines.length > 1 && this.isMarkdownSeparatorLine(tableLines[1])) {
      dataStartIndex = 2;
      hasColumnHeader = true;
    }

    // Parse data rows
    const dataRows = tableLines.slice(dataStartIndex)
      .map(line => this.parseMarkdownTableRow(line))
      .map(row => this.normalizeRow(row, headers.length));

    // Detect row headers
    const hasRowHeader = this.detectRowHeaders([headers, ...dataRows]);

    return [this.createTableNode(headers, dataRows, {
      hasColumnHeader,
      hasRowHeader
    })];
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
      .map(cell => ContentSanitizer.sanitizeTableCell(cell.trim()))
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
   * Détecte si la première ligne contient des headers de colonnes
   */
  private detectColumnHeaders(rows: string[][]): boolean {
    if (rows.length < 2) return false;
    
    const firstRow = rows[0];
    const secondRow = rows[1];
    
    // Heuristiques pour détecter les headers :
    // 1. Première ligne contient du texte, deuxième ligne contient des nombres
    const firstRowHasText = firstRow.some(cell => 
      cell && isNaN(Number(cell)) && cell.trim() !== ''
    );
    
    const secondRowHasNumbers = secondRow.some(cell => 
      cell && !isNaN(Number(cell))
    );
    
    // 2. Première ligne a des cellules plus longues (noms descriptifs)
    const avgFirstRowLength = firstRow.reduce((sum, cell) => sum + cell.length, 0) / firstRow.length;
    const avgSecondRowLength = secondRow.reduce((sum, cell) => sum + cell.length, 0) / secondRow.length;
    
    // 3. Première ligne contient des mots typiques de headers
    const headerKeywords = ['name', 'id', 'date', 'title', 'type', 'status', 'value', 'count'];
    const hasHeaderKeywords = firstRow.some(cell => 
      headerKeywords.some(keyword => 
        cell.toLowerCase().includes(keyword)
      )
    );
    
    return (firstRowHasText && secondRowHasNumbers) || 
           (avgFirstRowLength > avgSecondRowLength * 1.2) ||
           hasHeaderKeywords;
  }

  /**
   * Détecte si la première colonne contient des headers de lignes
   */
  private detectRowHeaders(rows: string[][]): boolean {
    if (rows.length < 2 || rows[0].length < 2) return false;
    
    // Vérifier si la première colonne contient du texte descriptif
    // tandis que les autres colonnes contiennent principalement des données
    const firstColumn = rows.map(row => row[0]).filter(cell => cell && cell.trim());
    const otherColumns = rows.map(row => row.slice(1)).flat().filter(cell => cell && cell.trim());
    
    if (firstColumn.length === 0 || otherColumns.length === 0) return false;
    
    // Première colonne majoritairement textuelle
    const firstColumnTextRatio = firstColumn.filter(cell => isNaN(Number(cell))).length / firstColumn.length;
    
    // Autres colonnes majoritairement numériques
    const otherColumnsNumericRatio = otherColumns.filter(cell => !isNaN(Number(cell))).length / otherColumns.length;
    
    return firstColumnTextRatio > 0.7 && otherColumnsNumericRatio > 0.5;
  }

  /**
   * Crée un nœud table avec les métadonnées de headers
   */
  protected createTableNode(headers: string[], rows: string[][], options: {
    hasColumnHeader: boolean;
    hasRowHeader: boolean;
  } = { hasColumnHeader: false, hasRowHeader: false }): ASTNode {
    return {
      type: 'table',
      content: '',
      metadata: {
        headers,
        rows,
        columnCount: Math.max(headers.length, ...rows.map(row => row.length)),
        rowCount: rows.length + (options.hasColumnHeader ? 1 : 0),
        hasColumnHeader: options.hasColumnHeader,
        hasRowHeader: options.hasRowHeader
      },
      children: []
    };
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