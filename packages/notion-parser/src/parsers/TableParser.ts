import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';

export class TableParser extends BaseParser {
  constructor(options: ParseOptions = {}) {
    super(options);
  }

  parse(content: string): ASTNode[] {
    if (!content?.trim()) return [];

    const lines = content.split('\n').filter(line => line.trim());
    
    // Detect table format
    if (this.isMarkdownTable(lines)) {
      return [this.parseMarkdownTable(lines)];
    }
    
    if (this.isCsvTable(content)) {
      return [this.parseCsvTable(content)];
    }
    
    if (this.isTsvTable(content)) {
      return [this.parseTsvTable(content)];
    }

    // Fallback to simple table parsing
    return [this.parseSimpleTable(lines)];
  }

  private isMarkdownTable(lines: string[]): boolean {
    if (lines.length < 2) return false;
    
    const pipeLines = lines.filter(line => line.includes('|')).length;
    if (pipeLines < 2) return false;
    
    // Check for header separator
    return lines.some(line => line.match(/^\|?[\s]*:?-+:?[\s]*(\|[\s]*:?-+:?[\s]*)*\|?$/));
  }

  private isCsvTable(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;
    
    const commaLines = lines.filter(line => line.includes(',')).length;
    return commaLines / lines.length > 0.7;
  }

  private isTsvTable(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;
    
    const tabLines = lines.filter(line => line.includes('\t')).length;
    return tabLines / lines.length > 0.7;
  }

  private parseMarkdownTable(lines: string[]): ASTNode {
    const rows: string[][] = [];
    let headerSeparatorIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip header separator line
      if (line.match(/^\|?[\s]*:?-+:?[\s]*(\|[\s]*:?-+:?[\s]*)*\|?$/)) {
        headerSeparatorIndex = i;
        continue;
      }
      
      if (line.includes('|')) {
        const cells = line.split('|')
          .map(cell => cell.trim())
          .filter((cell, index, array) => {
            // Remove empty cells at start/end (from leading/trailing |)
            return !(cell === '' && (index === 0 || index === array.length - 1));
          });
        
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
    }

    return this.parseTable(rows, { detectTableHeaders: headerSeparatorIndex >= 0 });
  }

  private parseCsvTable(content: string): ASTNode {
    const lines = content.split('\n').filter(line => line.trim());
    const rows = lines.map(line => this.parseCsvLine(line));
    
    return this.parseTable(rows);
  }

  private parseTsvTable(content: string): ASTNode {
    const lines = content.split('\n').filter(line => line.trim());
    const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
    
    return this.parseTable(rows);
  }

  private parseSimpleTable(lines: string[]): ASTNode {
    // Try to detect columns by consistent spacing or delimiters
    const rows: string[][] = [];
    
    for (const line of lines) {
      // Try multiple delimiters
      let cells: string[] = [];
      
      if (line.includes('\t')) {
        cells = line.split('\t');
      } else if (line.includes('|')) {
        cells = line.split('|');
      } else if (line.includes(',')) {
        cells = line.split(',');
      } else {
        // Try to split by multiple spaces
        cells = line.split(/\s{2,}/);
      }
      
      cells = cells.map(cell => cell.trim()).filter(cell => cell);
      
      if (cells.length > 1) {
        rows.push(cells);
      }
    }

    return this.parseTable(rows);
  }

  private parseTable(rows: string[][], options?: ParseOptions): ASTNode {
    if (rows.length === 0) {
      return this.createTextNode('Empty table');
    }

    // Limiter à 5 colonnes (Notion limite)
    const limitedRows = rows.map(row => row.slice(0, 5));
    const tableWidth = Math.min(
      Math.max(...limitedRows.map(row => row.length)),
      5
    );

    const hasColumnHeader = options?.detectTableHeaders !== false
      ? this.detectColumnHeader(rows)
      : false;
      
    const hasRowHeader = options?.detectTableHeaders !== false
      ? this.detectRowHeader(rows) 
      : false;

    return this.createTableNodeFromRows(
      limitedRows,
      {
        hasColumnHeader,
        hasRowHeader,
        tableWidth
      }
    );
  }

  private detectColumnHeader(rows: string[][]): boolean {
    if (rows.length < 2) return false;
    
    const firstRow = rows[0];
    const secondRow = rows[1];
    
    // Heuristiques pour détecter un header de colonne
    // 1. Première ligne contient que du texte
    const firstRowAllText = firstRow.every(cell =>
      isNaN(Number(cell)) && !cell.match(/^\d+$/)
    );
    
    // 2. Deuxième ligne contient des nombres ou dates
    const secondRowHasNumbers = secondRow.some(cell =>
      !isNaN(Number(cell)) || cell.match(/^\d{4}-\d{2}-\d{2}/)
    );
    
    // 3. Première ligne a des labels typiques
    const hasTypicalHeaders = firstRow.some(cell =>
      /^(name|id|date|title|description|value|amount|price|quantity|status|type)/i.test(cell)
    );
    
    return firstRowAllText || hasTypicalHeaders ||
           (firstRowAllText && secondRowHasNumbers);
  }

  private detectRowHeader(rows: string[][]): boolean {
    if (rows.length < 2) return false;
    
    // Première colonne contient des labels
    const firstColumn = rows.map(row => row[0]);
    
    // Heuristiques pour row headers
    const allText = firstColumn.every(cell =>
      isNaN(Number(cell)) && !cell.match(/^\d+$/)
    );
    
    const hasLabels = firstColumn.some(cell =>
      /^(total|subtotal|average|sum|count|row\s*\d+)/i.test(cell)
    );
    
    return allText && (hasLabels || firstColumn.length > 3);
  }

  private parseCsvLine(line: string): string[] {
    const cells: string[] = [];
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
      } else if (char === ',' && !inQuotes) {
        // End of cell
        cells.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add final cell
    cells.push(current.trim());

    return cells;
  }

  private createTableNodeFromRows(rows: string[][], options: {
    hasColumnHeader?: boolean;
    hasRowHeader?: boolean;
    tableWidth?: number;
  } = {}): ASTNode {
    const headers = options.hasColumnHeader && rows.length > 0 ? rows[0] : [];
    const dataRows = options.hasColumnHeader && rows.length > 0 ? rows.slice(1) : rows;
    
    return this.createTableNode(headers, dataRows, {
      hasColumnHeader: options.hasColumnHeader,
      hasRowHeader: options.hasRowHeader
    });
  }


}