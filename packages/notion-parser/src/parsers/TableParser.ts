import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';

/**
 * Parser pour les tables (markdown, CSV, TSV)
 * ✅ PATCH #2: Formatage rich text dans les cellules
 */
export class TableParser extends BaseBlockParser {
  priority = 65;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'TABLE_ROW';
  }

  parse(stream: TokenStream): ASTNode | null {
    const tableRows: string[][] = [];
    let hasSeparator = false;
    let separatorIndex = -1;

    // Collecter toutes les lignes de table consécutives
    while (stream.hasNext()) {
      const token = stream.peek();
      
      if (!token || token.type !== 'TABLE_ROW') {
        break;
      }
      
      const rowToken = stream.next()!;
      const cells = this.parseTableRow(rowToken.content);
      
      // Vérifier si c'est une ligne de séparation
      if (this.isTableSeparator(rowToken.content)) {
        hasSeparator = true;
        separatorIndex = tableRows.length;
        continue; // Ne pas ajouter la ligne de séparation aux données
      }
      
      tableRows.push(cells);
    }

    if (tableRows.length === 0) {
      return null;
    }

    // Normaliser la largeur des colonnes
    const maxColumns = Math.max(...tableRows.map(row => row.length));
    const normalizedRows = tableRows.map(row => this.normalizeTableRow(row, maxColumns));

    // Déterminer les headers
    const hasColumnHeader = hasSeparator || this.detectColumnHeader(normalizedRows);
    const hasRowHeader = this.detectRowHeader(normalizedRows);

    // Séparer headers et data
    let headers: string[] = [];
    let dataRows: string[][] = normalizedRows;

    if (hasColumnHeader && normalizedRows.length > 0) {
      headers = normalizedRows[0];
      dataRows = normalizedRows.slice(1);
    }

    return this.createNode('table', '', {
      hasColumnHeader,
      hasRowHeader,
      headers: headers.map(h => this.parseRichTextForCell(h)), // ✅ PATCH #2
      rows: dataRows.map(row => 
        row.map(cell => this.parseRichTextForCell(cell)) // ✅ PATCH #2
      ),
      columnCount: maxColumns,
      rowCount: dataRows.length
    });
  }

  /**
   * Parse une ligne de table en cellules
   */
  private parseTableRow(line: string): string[] {
    // Supprimer les pipes de début/fin
    const trimmed = line.trim();
    const withoutOuterPipes = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
    const withoutTrailingPipe = withoutOuterPipes.endsWith('|') 
      ? withoutOuterPipes.slice(0, -1) 
      : withoutOuterPipes;

    return withoutTrailingPipe
      .split('|')
      .map(cell => cell.trim());
  }

  /**
   * Vérifie si c'est une ligne de séparation
   */
  private isTableSeparator(line: string): boolean {
    const trimmed = line.trim();
    return /^[\|\-:\s]+$/.test(trimmed) && trimmed.includes('-');
  }

  /**
   * Normalise une ligne de table à la largeur cible
   */
  private normalizeTableRow(row: string[], targetLength: number): string[] {
    const normalized = [...row];

    // Compléter avec des cellules vides
    while (normalized.length < targetLength) {
      normalized.push('');
    }

    // Tronquer si trop long
    if (normalized.length > targetLength) {
      normalized.length = targetLength;
    }

    return normalized;
  }

  /**
   * Détecte si la première ligne est un header
   */
  private detectColumnHeader(rows: string[][]): boolean {
    if (rows.length === 0) return false;

    const firstRow = rows[0];
    
    // Heuristique: si plus de la moitié des cellules commencent par une majuscule
    const capitalizedCount = firstRow.filter(cell => {
      const trimmed = cell.trim();
      return trimmed.length > 0 && /^[A-Z]/.test(trimmed);
    }).length;

    return capitalizedCount > firstRow.length / 2;
  }

  /**
   * Détecte si la première colonne contient des headers de ligne
   */
  private detectRowHeader(rows: string[][]): boolean {
    if (rows.length < 2) return false;

    const firstColumn = rows.map(row => row[0] || '');
    
    // Heuristique: si la première colonne contient principalement du texte (pas des nombres)
    const textCount = firstColumn.filter(cell => {
      const trimmed = cell.trim();
      return trimmed.length > 0 && isNaN(Number(trimmed));
    }).length;

    return textCount > firstColumn.length * 0.8;
  }

  /**
   * ✅ PATCH #2: Parse le rich text pour une cellule
   */
  private parseRichTextForCell(cellContent: string): string {
    // Pour l'instant, retourner le markdown brut
    // Sera traité par RichTextBuilder lors de la conversion
    return cellContent.trim();
  }
}