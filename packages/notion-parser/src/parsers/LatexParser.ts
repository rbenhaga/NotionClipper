import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';

export class LatexParser extends BaseParser {
  private readonly maxEquationLength = 1000;

  constructor(options: ParseOptions = {}) {
    super(options);
  }

  parse(content: string): ASTNode[] {
    if (!content?.trim()) return [];

    const nodes: ASTNode[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Block equations ($$...$$)
      if (line === '$$') {
        const { node, consumed } = this.parseBlockEquation(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // LaTeX environments
      if (line.match(/\\begin\{(\w+)\}/)) {
        const { node, consumed } = this.parseLatexEnvironment(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Inline equations and text
      const lineNodes = this.parseLineWithInlineEquations(line);
      nodes.push(...lineNodes);

      i++;
    }

    return nodes.slice(0, this.options.maxBlocks || 100);
  }

  private parseBlockEquation(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const equationLines: string[] = [];
    let i = startIdx + 1;

    while (i < lines.length && lines[i].trim() !== '$$') {
      equationLines.push(lines[i]);
      i++;
    }

    if (i >= lines.length) {
      // No closing $$, treat as text
      return { node: this.createTextNode(lines[startIdx]), consumed: 1 };
    }

    const expression = equationLines.join('\n').trim();
    
    if (!expression) {
      return { node: null, consumed: i - startIdx + 1 };
    }

    const truncatedExpression = this.truncateContent(expression, this.maxEquationLength);
    
    return {
      node: this.createEquationNode(truncatedExpression, true),
      consumed: i - startIdx + 1
    };
  }

  private parseLatexEnvironment(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const startLine = lines[startIdx];
    const envMatch = startLine.match(/\\begin\{(\w+)\}/);
    
    if (!envMatch) {
      return { node: this.createTextNode(startLine), consumed: 1 };
    }

    const envName = envMatch[1];
    const envLines: string[] = [startLine];
    let i = startIdx + 1;

    // Find matching \end{environment}
    while (i < lines.length) {
      envLines.push(lines[i]);
      if (lines[i].includes(`\\end{${envName}}`)) {
        break;
      }
      i++;
    }

    const content = envLines.join('\n');

    // Handle different LaTeX environments
    switch (envName) {
      case 'equation':
      case 'align':
      case 'gather':
      case 'multline':
        return {
          node: this.createEquationNode(content, true),
          consumed: i - startIdx + 1
        };

      case 'itemize':
      case 'enumerate':
        return {
          node: this.parseLatexList(content, envName),
          consumed: i - startIdx + 1
        };

      case 'tabular':
      case 'array':
        return {
          node: this.parseLatexTable(content),
          consumed: i - startIdx + 1
        };

      default:
        // Unknown environment, treat as code
        return {
          node: this.createCodeNode(content, 'latex', true),
          consumed: i - startIdx + 1
        };
    }
  }

  private parseLineWithInlineEquations(line: string): ASTNode[] {
    if (!line.includes('$')) {
      return line.trim() ? [this.createTextNode(line)] : [];
    }

    const nodes: ASTNode[] = [];
    const parts = this.splitInlineEquations(line);

    for (const part of parts) {
      if (part.isEquation) {
        const truncatedExpression = this.truncateContent(part.content, this.maxEquationLength);
        nodes.push(this.createEquationNode(truncatedExpression, false));
      } else if (part.content.trim()) {
        nodes.push(this.createTextNode(part.content));
      }
    }

    return nodes;
  }

  private splitInlineEquations(line: string): Array<{ content: string; isEquation: boolean }> {
    const parts: Array<{ content: string; isEquation: boolean }> = [];
    let current = '';
    let inEquation = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '$') {
        if (nextChar === '$') {
          // Double $$ - skip for now (should be handled as block)
          current += '$$';
          i += 2;
        } else {
          // Single $ - inline equation delimiter
          if (current) {
            parts.push({ content: current, isEquation: inEquation });
            current = '';
          }
          inEquation = !inEquation;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    }

    if (current) {
      parts.push({ content: current, isEquation: inEquation });
    }

    return parts;
  }

  private parseLatexList(content: string, envType: string): ASTNode {
    const items: ASTNode[] = [];
    const itemMatches = content.match(/\\item\s+([^\n\\]+)/g);

    if (itemMatches) {
      for (const match of itemMatches) {
        const itemContent = match.replace(/\\item\s+/, '').trim();
        items.push(this.createListItemNode(itemContent));
      }
    }

    const listType = envType === 'enumerate' ? 'numbered' : 'bulleted';
    return this.createListNode(items, listType);
  }

  private parseLatexTable(content: string): ASTNode {
    // Simple LaTeX table parsing
    const lines = content.split('\n').filter(line => 
      line.trim() && 
      !line.includes('\\begin') && 
      !line.includes('\\end') &&
      !line.includes('\\hline')
    );

    if (lines.length === 0) {
      return this.createTextNode(content);
    }

    // Parse table rows (split by &, end with \\)
    const rows = lines.map(line => {
      const cleaned = line.replace(/\\\\/g, '').trim();
      return cleaned.split('&').map(cell => cell.trim());
    });

    if (rows.length === 0) {
      return this.createTextNode(content);
    }

    // Use first row as headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    return this.createTableNode(headers, dataRows);
  }

  /**
   * Validate LaTeX syntax (basic validation)
   */
  static validateLatex(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for balanced braces
    let braceCount = 0;
    for (const char of content) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (braceCount < 0) {
        errors.push('Unmatched closing brace');
        break;
      }
    }
    if (braceCount > 0) {
      errors.push('Unmatched opening brace');
    }

    // Check for balanced environments
    const beginMatches = content.match(/\\begin\{(\w+)\}/g) || [];
    const endMatches = content.match(/\\end\{(\w+)\}/g) || [];
    
    if (beginMatches.length !== endMatches.length) {
      errors.push('Unmatched LaTeX environments');
    }

    // Check for balanced equation delimiters
    const dollarCount = (content.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
      errors.push('Unmatched equation delimiters ($)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}