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
      if (trimmed === '$' || trimmed.startsWith('$$')) {
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

      // Toggle headings (> # Heading)
      if (trimmed.match(/^>\s*#{1,3}\s+/)) {
        const { node, consumed } = this.parseToggleHeading(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Multi-line callouts
      if (trimmed.match(/^>\s*\[!(\w+)\]/)) {
        const { node, consumed } = this.parseCallout(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Toggle blocks (> content with children)
      if (trimmed.startsWith('> ') && !trimmed.match(/^>\s*\[!/) && !trimmed.match(/^>\s*#{1,3}\s+/)) {
        const { node, consumed } = this.parseToggleBlock(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Nested lists (up to 3 levels)
      if (this.isListLine(trimmed)) {
        const { nodes: listNodes, consumed } = this.parseNestedList(lines, i);
        nodes.push(...listNodes);
        i += consumed;
        continue;
      }

      // DÉSACTIVÉ: Multi-line paragraphs détruit le formatage Markdown
      // Utiliser le parsing ligne par ligne qui respecte mieux la structure
      // if (this.isParagraphStart(trimmed)) {
      //   const { node, consumed } = this.parseMultiLineParagraph(lines, i);
      //   if (node) nodes.push(node);
      //   i += consumed;
      //   continue;
      // }

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

    // Images with inline content
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
    if (imageMatch) {
      const imageNode = this.createMediaNode('image', imageMatch[2], imageMatch[1]);

      // If there's additional content after the image, create a paragraph
      if (imageMatch[3].trim()) {
        return this.createTextNode(line); // Keep as text to preserve mixed content
      }

      return imageNode;
    }

    // Lists (will be handled by parseNestedList for proper nesting)
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      return this.createListItemNode(bulletMatch[2], 'bulleted');
    }

    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numberedMatch) {
      return this.createListItemNode(numberedMatch[2], 'numbered');
    }

    // Checkboxes
    const checkboxMatch = line.match(/^(\s*)- \[([ x])\]\s+(.+)$/);
    if (checkboxMatch) {
      return this.createListItemNode(checkboxMatch[3], 'todo', checkboxMatch[2] === 'x');
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

    // HTML inline handling
    if (line.includes('<') && line.includes('>')) {
      return this.parseHtmlInline(line);
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

    if (i >= lines.length) {
      // No closing ```, treat as text
      return { node: this.createTextNode(firstLine), consumed: 1 };
    }

    const code = codeLines.join('\n');
    const truncatedCode = this.truncateContent(code, this.options.maxCodeLength || 2000);

    return {
      node: this.createCodeNode(truncatedCode, language, true),
      consumed: i - startIdx + 1
    };
  }

  private parseEquationBlock(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];

    // Handle $$equation$$ single line
    if (firstLine.startsWith('$$') && firstLine.endsWith('$$') && firstLine.length > 4) {
      const expression = firstLine.slice(2, -2).trim();
      return {
        node: this.createEquationNode(expression, true),
        consumed: 1
      };
    }

    // Handle multi-line $ or $$
    const equationLines: string[] = [];
    let i = startIdx + 1;
    const delimiter = firstLine.startsWith('$$') ? '$$' : '$';

    while (i < lines.length && lines[i].trim() !== delimiter) {
      equationLines.push(lines[i]);
      i++;
    }

    if (i >= lines.length) {
      // No closing delimiter, treat as text
      return { node: this.createTextNode(firstLine), consumed: 1 };
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

    // Collect all table lines
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      tableLines.push(lines[i]);
      i++;
    }

    if (tableLines.length < 2) {
      return { node: null, consumed: 1 };
    }

    // Parse headers
    const headers = this.parseTableRow(tableLines[0]);

    // Check for separator line
    let dataStartIndex = 1;
    if (tableLines.length > 1 && this.isTableSeparator(tableLines[1])) {
      dataStartIndex = 2;
    }

    // Parse data rows
    const rows = tableLines.slice(dataStartIndex).map(line => this.parseTableRow(line));

    // Normalize row lengths
    const maxColumns = Math.max(headers.length, ...rows.map(row => row.length));
    const normalizedHeaders = this.normalizeTableRow(headers, maxColumns);
    const normalizedRows = rows.map(row => this.normalizeTableRow(row, maxColumns));

    return {
      node: this.createTableNode(normalizedHeaders, normalizedRows),
      consumed: i - startIdx
    };
  }

  private parseTableRow(line: string): string[] {
    // Remove leading/trailing pipes and split
    const trimmed = line.trim();
    const withoutOuterPipes = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
    const withoutTrailingPipe = withoutOuterPipes.endsWith('|')
      ? withoutOuterPipes.slice(0, -1)
      : withoutOuterPipes;

    return withoutTrailingPipe
      .split('|')
      .map(cell => cell.trim());
  }

  private isTableSeparator(line: string): boolean {
    const trimmed = line.trim();
    return /^[\|\-:\s]+$/.test(trimmed) && trimmed.includes('-');
  }

  private normalizeTableRow(row: string[], targetLength: number): string[] {
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

  private parseToggleHeading(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const match = firstLine.match(/^>\s*(#{1,3})\s+(.+)$/);

    if (!match) return { node: null, consumed: 1 };

    const level = match[1].length as 1 | 2 | 3;
    const title = match[2];

    const children: ASTNode[] = [];
    let i = startIdx + 1;

    // Parse toggle content (lines starting with >)
    while (i < lines.length) {
      const line = lines[i].trim();

      if (line.startsWith('>')) {
        // Remove > prefix and parse as normal content
        const content = line.substring(1).trim();
        if (content) {
          // Recursively parse the content
          const contentNodes = this.parse(content);
          children.push(...contentNodes);
        }
        i++;
      } else if (!line) {
        // Empty line within toggle
        i++;
      } else {
        // End of toggle
        break;
      }
    }

    return {
      node: this.createToggleHeadingNode(title, level, children),
      consumed: i - startIdx
    };
  }

  private parseToggleBlock(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const content = firstLine.substring(2).trim(); // Remove "> "

    if (!content) return { node: null, consumed: 1 };

    const children: ASTNode[] = [];
    let i = startIdx + 1;

    // Parse toggle content (lines starting with >)
    while (i < lines.length) {
      const line = lines[i].trim();

      if (line.startsWith('>')) {
        // Remove > prefix and parse as normal content
        const childContent = line.substring(1).trim();
        if (childContent) {
          // Recursively parse the content
          const contentNodes = this.parse(childContent);
          children.push(...contentNodes);
        }
        i++;
      } else if (!line) {
        // Empty line within toggle
        i++;
      } else {
        // End of toggle
        break;
      }
    }

    // If no children, treat as a simple quote
    if (children.length === 0) {
      return { node: this.createQuoteNode(content), consumed: 1 };
    }

    return {
      node: this.createToggleNode(content, children),
      consumed: i - startIdx
    };
  }

  private parseCallout(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const match = firstLine.match(/^>\s*\[!(\w+)\]\s*(.*)$/);

    if (!match) return { node: null, consumed: 1 };

    const iconName = match[1].toLowerCase();
    const firstContent = match[2] || '';

    const contentLines = [firstContent];
    let i = startIdx + 1;

    // Parse multi-line callout content
    while (i < lines.length) {
      const line = lines[i].trim();

      if (line.startsWith('>')) {
        // Check if this is a new callout
        if (line.match(/^>\s*\[!(\w+)\]/)) {
          // This is a new callout, stop parsing current one
          break;
        }

        // Continue callout content
        const content = line.substring(1).trim();
        contentLines.push(content);
        i++;
      } else if (!line) {
        // Empty line within callout
        contentLines.push('');
        i++;
      } else {
        // End of callout
        break;
      }
    }

    const content = contentLines.filter(l => l !== '').join('\n');
    const icon = this.getCalloutIcon(iconName);
    const color = this.getCalloutColor(iconName);

    return {
      node: this.createCalloutNode(content, icon, color),
      consumed: i - startIdx
    };
  }

  private isListLine(line: string): boolean {
    return /^(\s*)[-*+]\s+/.test(line) ||
      /^(\s*)\d+\.\s+/.test(line) ||
      /^(\s*)- \[([ x])\]\s+/.test(line);
  }

  private parseNestedList(lines: string[], startIdx: number): { nodes: ASTNode[]; consumed: number } {
    const listItems: Array<{ node: ASTNode; level: number; type: string }> = [];
    let i = startIdx;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!this.isListLine(trimmed)) {
        break;
      }

      const level = this.getIndentationLevel(line);
      const listItem = this.parseListItem(trimmed);

      if (listItem) {
        listItems.push({
          node: listItem.node,
          level,
          type: listItem.type
        });
      }

      i++;
    }

    // Convert flat list to nested structure
    const nestedNodes = this.buildNestedListStructure(listItems);

    return {
      nodes: nestedNodes,
      consumed: i - startIdx
    };
  }

  private getIndentationLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    const spaces = match ? match[1].length : 0;
    return Math.floor(spaces / 2); // 2 spaces = 1 level
  }

  private parseListItem(line: string): { node: ASTNode; type: string } | null {
    // Checkbox
    const checkboxMatch = line.match(/^(\s*)- \[([ x])\]\s+(.+)$/);
    if (checkboxMatch) {
      return {
        node: this.createListItemNode(checkboxMatch[3], 'todo', checkboxMatch[2] === 'x'),
        type: 'todo'
      };
    }

    // Bulleted list
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      return {
        node: this.createListItemNode(bulletMatch[2], 'bulleted'),
        type: 'bulleted'
      };
    }

    // Numbered list
    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numberedMatch) {
      return {
        node: this.createListItemNode(numberedMatch[2], 'numbered'),
        type: 'numbered'
      };
    }

    return null;
  }

  private buildNestedListStructure(items: Array<{ node: ASTNode; level: number; type: string }>): ASTNode[] {
    if (items.length === 0) return [];

    const result: ASTNode[] = [];
    const stack: Array<{ node: ASTNode; level: number; children: ASTNode[] }> = [];

    for (const item of items) {
      // Pop items from stack that are at same or higher level
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        const popped = stack.pop()!;
        if (popped.children.length > 0) {
          (popped.node as any).children = popped.children;
        }

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(popped.node);
        } else {
          result.push(popped.node);
        }
      }

      // Add current item to stack
      stack.push({
        node: item.node,
        level: item.level,
        children: []
      });
    }

    // Pop remaining items from stack
    while (stack.length > 0) {
      const popped = stack.pop()!;
      if (popped.children.length > 0) {
        (popped.node as any).children = popped.children;
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(popped.node);
      } else {
        result.push(popped.node);
      }
    }

    return result;
  }

  private isParagraphStart(line: string): boolean {
    // Not a special markdown element
    return !line.match(/^(#{1,3}\s|[-*+]\s|\d+\.\s|>\s|\|.*\||```|---|\*\*\*|___|!\[)/);
  }

  private parseMultiLineParagraph(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const paragraphLines: string[] = [];
    let i = startIdx;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line ends paragraph
      if (!trimmed) {
        break;
      }

      // Special markdown elements end paragraph
      if (this.isSpecialMarkdownLine(trimmed)) {
        break;
      }

      paragraphLines.push(line);
      i++;
    }

    if (paragraphLines.length === 0) {
      return { node: null, consumed: 1 };
    }

    // Join lines with soft breaks (spaces)
    const content = paragraphLines.join(' ');

    return {
      node: this.createTextNode(content),
      consumed: i - startIdx
    };
  }

  private isSpecialMarkdownLine(line: string): boolean {
    return /^(#{1,3}\s|[-*+]\s|\d+\.\s|>\s|\|.*\||```|---|\*\*\*|___|!\[)/.test(line);
  }

  private parseHtmlInline(line: string): ASTNode {
    // Simple HTML tag removal for now
    // In a more complete implementation, you'd parse HTML properly
    const cleanText = line.replace(/<[^>]*>/g, '');
    return this.createTextNode(cleanText);
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
      'todo': '☑️',
      'abstract': '📄',
      'summary': '📋',
      'tldr': '📋',
      'failure': '❌',
      'fail': '❌',
      'missing': '❓',
      'check': '✅',
      'done': '✅'
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
      'question': 'purple_background',
      'quote': 'gray_background',
      'example': 'blue_background',
      'bug': 'red_background',
      'todo': 'blue_background',
      'abstract': 'purple_background',
      'summary': 'purple_background',
      'tldr': 'purple_background',
      'failure': 'red_background',
      'fail': 'red_background',
      'missing': 'yellow_background',
      'check': 'green_background',
      'done': 'green_background'
    };
    return colors[name] || 'gray_background';
  }



  /**
   * Enhanced list parsing with better nesting support
   */
  static parseMarkdownList(content: string): ASTNode[] {
    const parser = new MarkdownParser();
    const lines = content.split('\n');
    const { nodes } = parser.parseNestedList(lines, 0);
    return nodes;
  }

  /**
   * Parse markdown tables with advanced features
   */
  static parseMarkdownTable(content: string): ASTNode | null {
    const parser = new MarkdownParser();
    const lines = content.split('\n');
    const { node } = parser.parseTable(lines, 0);
    return node;
  }
}