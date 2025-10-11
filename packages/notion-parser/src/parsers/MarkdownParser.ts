import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';

export class MarkdownParser extends BaseParser {
  constructor(options: ParseOptions = {}) {
    super(options);
  }

  parse(content: string): ASTNode[] {
    if (!content?.trim()) return [];

    const nodes: ASTNode[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        const { node, consumed } = this.parseCodeBlock(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Equation blocks
      if (trimmed === '$$') {
        const { node, consumed } = this.parseEquationBlock(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Tables
      if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('|')) {
        const { node, consumed } = this.parseTable(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Callouts
      if (trimmed.match(/^>\s*\[!(\w+)\]/)) {
        const { node, consumed } = this.parseCallout(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Single line parsing
      const node = this.parseLine(trimmed);
      if (node) nodes.push(node);

      i++;
    }

    return nodes.slice(0, this.options.maxBlocks || 100);
  }

  private parseLine(line: string): ASTNode | null {
    // Headers
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length as 1 | 2 | 3;
      return this.createHeadingNode(headerMatch[2], level);
    }

    // Images
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      return this.createMediaNode('image', imageMatch[2], imageMatch[1]);
    }

    // Lists
    const bulletMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (bulletMatch) {
      return this.createListItemNode(bulletMatch[1]);
    }

    const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (numberedMatch) {
      return this.createListItemNode(numberedMatch[1]);
    }

    // Checkboxes
    const checkboxMatch = line.match(/^[\s]*- \[([ x])\]\s+(.+)$/);
    if (checkboxMatch) {
      return this.createListItemNode(checkboxMatch[2], checkboxMatch[1] === 'x');
    }

    // Quotes
    if (line.startsWith('> ') && !line.match(/^>\s*\[!/)) {
      return this.createQuoteNode(line.substring(2));
    }

    // Dividers
    if (line.match(/^(---|\*\*\*|___)$/)) {
      return this.createDividerNode();
    }

    // URLs
    if (this.isValidUrl(line)) {
      return this.createBookmarkNode(line);
    }

    // Regular paragraph
    return this.createTextNode(line);
  }

  private parseCodeBlock(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const language = firstLine.replace('```', '').trim() || 'plain text';
    const codeLines: string[] = [];
    let i = startIdx + 1;

    while (i < lines.length && !lines[i].trim().startsWith('```')) {
      codeLines.push(lines[i]);
      i++;
    }

    const code = codeLines.join('\n');
    const truncatedCode = this.truncateContent(code, this.options.maxCodeLength || 2000);

    return {
      node: this.createCodeNode(truncatedCode, language, true),
      consumed: i - startIdx + 1
    };
  }

  private parseEquationBlock(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const equationLines: string[] = [];
    let i = startIdx + 1;

    while (i < lines.length && lines[i].trim() !== '$$') {
      equationLines.push(lines[i]);
      i++;
    }

    const expression = equationLines.join('\n').trim();
    
    if (!expression) {
      return { node: null, consumed: i - startIdx + 1 };
    }

    return {
      node: this.createEquationNode(expression, true),
      consumed: i - startIdx + 1
    };
  }

  private parseTable(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const tableLines: string[] = [];
    let i = startIdx;

    while (i < lines.length && lines[i].trim().startsWith('|')) {
      tableLines.push(lines[i]);
      i++;
    }

    if (tableLines.length < 2) {
      return { node: null, consumed: 1 };
    }

    const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
    const rows = tableLines.slice(2).map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
    );

    return {
      node: this.createTableNode(headers, rows),
      consumed: i - startIdx
    };
  }

  private parseCallout(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const match = firstLine.match(/^>\s*\[!(\w+)\]\s*(.*)$/);
    
    if (!match) return { node: null, consumed: 1 };

    const iconName = match[1].toLowerCase();
    const text = match[2] || '';
    
    const contentLines = [text];
    let i = startIdx + 1;
    
    while (i < lines.length && lines[i].trim().startsWith('>')) {
      const line = lines[i].trim();
      contentLines.push(line.substring(1).trim());
      i++;
    }

    const content = contentLines.filter(l => l).join('\n');
    const icon = this.getCalloutIcon(iconName);
    const color = this.getCalloutColor(iconName);

    return {
      node: this.createCalloutNode(content, icon, color),
      consumed: i - startIdx
    };
  }

  private getCalloutIcon(name: string): string {
    const icons: Record<string, string> = {
      'note': '📝',
      'info': 'ℹ️',
      'tip': '💡',
      'warning': '⚠️',
      'danger': '🚨',
      'success': '✅',
      'question': '❓',
      'quote': '💬',
      'example': '📌',
      'bug': '🐛',
      'todo': '☑️'
    };
    return icons[name] || '💡';
  }

  private getCalloutColor(name: string): string {
    const colors: Record<string, string> = {
      'note': 'blue_background',
      'info': 'blue_background',
      'tip': 'green_background',
      'warning': 'yellow_background',
      'danger': 'red_background',
      'success': 'green_background',
      'question': 'purple_background'
    };
    return colors[name] || 'gray_background';
  }
}