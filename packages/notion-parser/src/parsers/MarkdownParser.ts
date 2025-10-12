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

      // Toggle blocks and quotes (> content without heading or callout)
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

    // Ne plus limiter arbitrairement - laisser le chunking gérer les gros documents
    return nodes;
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

    // Quotes are handled in the main parse() method, not here

    // Dividers
    if (line.match(/^(---|\*\*\*|___)$/)) {
      return this.createDividerNode();
    }

    // URLs - Check for audio first, then other media, then bookmark
    if (this.isValidUrl(line)) {
      // Check if it's an audio URL
      if (this.isAudioUrl(line)) {
        return this.createMediaNode('audio', line);
      }
      
      // Check if it's a video URL
      if (this.isVideoUrl(line)) {
        return this.createMediaNode('video', line);
      }
      
      // Check if it's an image URL
      if (this.isImageUrl(line)) {
        return this.createMediaNode('image', line);
      }
      
      // Default to bookmark
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

    // Detect headers
    const hasColumnHeader = this.detectColumnHeader(normalizedHeaders, normalizedRows, dataStartIndex > 1);
    const hasRowHeader = this.detectRowHeader(normalizedHeaders, normalizedRows);

    return {
      node: this.createTableNode(normalizedHeaders, normalizedRows, {
        hasColumnHeader,
        hasRowHeader
      }),
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

  private detectColumnHeader(headers: string[], rows: string[][], hasSeparator: boolean): boolean {
    // If there's a separator line (|---|---|), it's definitely a header
    if (hasSeparator) {
      return true;
    }

    // If no data rows, can't determine
    if (rows.length === 0) {
      return false;
    }

    // Heuristic: If first row has capitalized words, it's likely a header
    const capitalizedCount = headers.filter(cell => {
      const trimmed = cell.trim();
      return trimmed.length > 0 && /^[A-Z]/.test(trimmed);
    }).length;

    // If more than half the cells are capitalized, consider it a header
    return capitalizedCount > headers.length / 2;
  }

  private detectRowHeader(headers: string[], rows: string[][]): boolean {
    if (rows.length < 2) return false;

    // Get first column (including header)
    const firstColumn = [headers[0], ...rows.map(row => row[0] || '')];

    // Heuristic 1: If first column contains mostly text (not numbers), it might be row headers
    const textCount = firstColumn.filter(cell => {
      const trimmed = cell.trim();
      return trimmed.length > 0 && isNaN(Number(trimmed));
    }).length;

    // Heuristic 2: Check if first column looks like labels/categories vs data
    const looksLikeLabels = firstColumn.filter(cell => {
      const trimmed = cell.trim().toLowerCase();
      // Exclude email-like patterns, URLs, and other data patterns
      if (trimmed.includes('@') || trimmed.includes('.com') || trimmed.includes('http')) {
        return false;
      }
      // Look for typical label patterns (single words, short phrases)
      return trimmed.length > 0 && trimmed.length < 20 && !trimmed.includes(' ');
    }).length;

    // If more than 80% of first column looks like labels AND mostly text, consider it row headers
    return textCount > firstColumn.length * 0.8 && looksLikeLabels > firstColumn.length * 0.6;
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
          // Parse the content to handle inline formatting
          const parsedNodes = this.parse(content);
          children.push(...parsedNodes);
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

  private parseBlockquote(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const content = firstLine.substring(2).trim(); // Remove "> "
    
    if (!content) return { node: null, consumed: 1 };
    
    // For single line quotes, just create a simple quote
    return {
      node: this.createQuoteNode(content),
      consumed: 1
    };
  }

  private parseNestedBlockquotes(lines: string[], startIdx: number): { nodes: ASTNode[]; consumed: number } {
    const quoteItems: Array<{ content: string; level: number }> = [];
    let i = startIdx;

    // Collect all consecutive blockquote lines with their levels
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Stop if not a blockquote line or empty line
      if (!trimmed.startsWith('>')) {
        break;
      }

      // Count the level of nesting (number of > symbols)
      const level = this.getBlockquoteLevel(trimmed);
      const content = this.extractBlockquoteContent(trimmed, level);
      
      if (content) {
        quoteItems.push({ content, level });
      }
      
      i++;
    }

    if (quoteItems.length === 0) {
      return { nodes: [], consumed: 0 };
    }

    // Group by level and create separate quotes
    const groupedByLevel = new Map<number, string[]>();
    
    quoteItems.forEach(item => {
      if (!groupedByLevel.has(item.level)) {
        groupedByLevel.set(item.level, []);
      }
      groupedByLevel.get(item.level)!.push(item.content);
    });

    // Create quotes for each level
    const nodes: ASTNode[] = [];
    
    // Sort levels to process in order
    const sortedLevels = Array.from(groupedByLevel.keys()).sort((a, b) => a - b);
    
    sortedLevels.forEach(level => {
      const contents = groupedByLevel.get(level)!;
      const combinedContent = contents.join(' ');
      nodes.push(this.createQuoteNode(combinedContent));
    });

    return {
      nodes,
      consumed: i - startIdx
    };
  }

  private getBlockquoteLevel(line: string): number {
    let level = 0;
    let pos = 0;
    
    // Skip leading whitespace
    while (pos < line.length && line[pos] === ' ') {
      pos++;
    }
    
    // Count > symbols
    while (pos < line.length && line[pos] === '>') {
      level++;
      pos++;
      // Skip optional space after >
      if (pos < line.length && line[pos] === ' ') {
        pos++;
      }
    }
    
    return level;
  }

  private extractBlockquoteContent(line: string, level: number): string {
    let pos = 0;
    let currentLevel = 0;
    
    // Skip leading whitespace
    while (pos < line.length && line[pos] === ' ') {
      pos++;
    }
    
    // Skip the > symbols and spaces
    while (pos < line.length && currentLevel < level) {
      if (line[pos] === '>') {
        currentLevel++;
        pos++;
        // Skip optional space after >
        if (pos < line.length && line[pos] === ' ') {
          pos++;
        }
      } else {
        break;
      }
    }
    
    return line.substring(pos).trim();
  }

  private parseToggleBlock(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const contentLines: string[] = [];
    let i = startIdx;

    // Collect all consecutive lines starting with >
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed.startsWith('>')) {
        break;
      }

      // Remove > prefix and collect content
      const content = trimmed.substring(1).trim();
      if (content) {
        contentLines.push(content);
      }
      
      i++;
    }

    if (contentLines.length === 0) {
      return { node: null, consumed: 1 };
    }

    // Always create toggles for multi-line > blocks
    if (contentLines.length === 1) {
      // Single line - could be quote or toggle, let's make it a quote for now
      return {
        node: this.createQuoteNode(contentLines[0]),
        consumed: i - startIdx
      };
    }

    // Multiple lines: first line is toggle title, rest are children
    const title = contentLines[0];
    const childrenContent = contentLines.slice(1);

    const children: ASTNode[] = [];
    
    // Parse each child line as a paragraph
    childrenContent.forEach(childContent => {
      if (childContent.trim()) {
        children.push(this.createTextNode(childContent));
      }
    });

    return {
      node: this.createToggleNode(title, children),
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