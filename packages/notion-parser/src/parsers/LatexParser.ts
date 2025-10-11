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
      if (line.startsWith('$$')) {
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
    const startLine = lines[startIdx];
    let equationContent = '';
    let i = startIdx;

    // Handle single line $$equation$$
    if (startLine.startsWith('$$') && startLine.endsWith('$$') && startLine.length > 4) {
      equationContent = startLine.slice(2, -2).trim();
      return {
        node: this.createEquationNode(equationContent, true),
        consumed: 1
      };
    }

    // Handle multi-line $$...$$
    if (startLine === '$$') {
      i++;
      const equationLines: string[] = [];
      
      while (i < lines.length && lines[i].trim() !== '$$') {
        equationLines.push(lines[i]);
        i++;
      }

      if (i >= lines.length) {
        // No closing $$, treat as text
        return { node: this.createTextNode(lines[startIdx]), consumed: 1 };
      }

      equationContent = equationLines.join('\n').trim();
    } else {
      // Single line starting with $$
      equationContent = startLine.slice(2).trim();
    }

    if (!equationContent) {
      return { node: null, consumed: i - startIdx + 1 };
    }

    const truncatedExpression = this.truncateContent(equationContent, this.maxEquationLength);
    
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

    if (i >= lines.length) {
      // No matching \end found
      return { node: this.createTextNode(startLine), consumed: 1 };
    }

    const content = envLines.join('\n');

    // Handle different LaTeX environments
    switch (envName) {
      case 'equation':
      case 'align':
      case 'gather':
      case 'multline':
      case 'eqnarray':
      case 'alignat':
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
      case 'matrix':
      case 'pmatrix':
      case 'bmatrix':
        return {
          node: this.parseLatexTable(content),
          consumed: i - startIdx + 1
        };

      case 'figure':
      case 'table':
        return {
          node: this.parseLatexFloat(content, envName),
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

  private splitByInlineMath(content: string): Array<{content: string, isEquation: boolean}> {
    const parts = [];
    const pattern = /\$([^$\n]+?)\$/g;
    let lastIndex = 0;
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      // Texte avant l'équation
      if (match.index > lastIndex) {
        parts.push({
          content: content.substring(lastIndex, match.index),
          isEquation: false
        });
      }
      
      // L'équation elle-même
      parts.push({
        content: match[1],
        isEquation: true
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Texte restant
    if (lastIndex < content.length) {
      parts.push({
        content: content.substring(lastIndex),
        isEquation: false
      });
    }
    
    return parts;
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
          // Double $ - skip for now (should be handled as block)
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
    
    // Extract content between \begin and \end
    const contentMatch = content.match(/\\begin\{\w+\}([\s\S]*?)\\end\{\w+\}/);
    const listContent = contentMatch ? contentMatch[1] : content;
    
    // Find all \item entries
    const itemMatches = listContent.match(/\\item\s*([^\n\\]*(?:\n(?!\\item)[^\n\\]*)*)/g);

    if (itemMatches) {
      for (const match of itemMatches) {
        const itemContent = match.replace(/\\item\s*/, '').trim();
        if (itemContent) {
          items.push(this.createListItemNode(itemContent));
        }
      }
    }

    const listType = envType === 'enumerate' ? 'numbered' : 'bulleted';
    return this.createListNode(items, listType);
  }

  private parseLatexTable(content: string): ASTNode {
    // Extract content between \begin and \end
    const contentMatch = content.match(/\\begin\{\w+\}(?:\{[^}]*\})?([\s\S]*?)\\end\{\w+\}/);
    const tableContent = contentMatch ? contentMatch[1] : content;
    
    // Split by lines and filter out LaTeX commands
    const lines = tableContent.split('\n')
      .map(line => line.trim())
      .filter(line => 
        line && 
        !line.startsWith('\\hline') && 
        !line.startsWith('\\cline') &&
        !line.startsWith('\\toprule') &&
        !line.startsWith('\\midrule') &&
        !line.startsWith('\\bottomrule')
      );

    if (lines.length === 0) {
      return this.createTextNode(content);
    }

    // Parse table rows (split by &, end with \\)
    const rows = lines.map(line => {
      const cleaned = line.replace(/\\\\/g, '').trim();
      return cleaned.split('&').map(cell => cell.trim());
    }).filter(row => row.length > 1);

    if (rows.length === 0) {
      return this.createTextNode(content);
    }

    // Use first row as headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    return this.createTableNode(headers, dataRows);
  }

  private parseLatexFloat(content: string, _envType: string): ASTNode {
    // Extract content between \begin and \end
    const contentMatch = content.match(/\\begin\{\w+\}([\s\S]*?)\\end\{\w+\}/);
    const floatContent = contentMatch ? contentMatch[1] : content;
    
    // Look for \caption
    const captionMatch = floatContent.match(/\\caption\{([^}]*)\}/);
    const caption = captionMatch ? captionMatch[1] : '';
    
    // Look for \includegraphics or \centering content
    const includeMatch = floatContent.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/);
    
    if (includeMatch) {
      const imagePath = includeMatch[1];
      return this.createMediaNode('image', imagePath, caption);
    }
    
    // If no specific content found, treat as text block
    const cleanContent = floatContent
      .replace(/\\caption\{[^}]*\}/g, '')
      .replace(/\\centering/g, '')
      .replace(/\\label\{[^}]*\}/g, '')
      .trim();
    
    if (cleanContent) {
      return this.createTextNode(cleanContent + (caption ? `\n\n${caption}` : ''));
    }
    
    return this.createTextNode(caption || content);
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
    const singleDollarCount = (content.match(/(?<!\$)\$(?!\$)/g) || []).length;
    if (singleDollarCount % 2 !== 0) {
      errors.push('Unmatched equation delimiters ($)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract all equations from LaTeX content
   */
  static extractEquations(content: string): string[] {
    const equations: string[] = [];
    
    // Block equations $$...$$
    const blockMatches = content.match(/\$\$([\s\S]*?)\$\$/g);
    if (blockMatches) {
      equations.push(...blockMatches.map(match => match.slice(2, -2).trim()));
    }
    
    // Inline equations $...$
    const inlineMatches = content.match(/(?<!\$)\$([^$]+)\$(?!\$)/g);
    if (inlineMatches) {
      equations.push(...inlineMatches.map(match => match.slice(1, -1).trim()));
    }
    
    // Environment equations
    const envMatches = content.match(/\\begin\{(equation|align|gather|multline)\}([\s\S]*?)\\end\{\1\}/g);
    if (envMatches) {
      equations.push(...envMatches);
    }
    
    return equations;
  }
}