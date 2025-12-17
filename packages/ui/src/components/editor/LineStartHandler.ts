/**
 * LineStartHandler - Line-start Markdown shortcuts module
 * 
 * Detects and converts Markdown shortcuts at the beginning of lines
 * to their corresponding block types, providing a Notion-like editing experience.
 * 
 * Supported shortcuts:
 * - Bullet list: `-`, `*`, `+` + space → bulleted list item
 * - Todo: `[]` or `[ ]` → checkbox
 * - Numbered list: `1.`, `a.`, `i.` + space → numbered list item
 * - Heading 1: `#` + space → H1
 * - Heading 2: `##` + space → H2
 * - Heading 3: `###` + space → H3
 * - Toggle: `>` + space (not `[!`) → toggle list
 * - Quote: `"` + space → quote block
 * - Divider: `---` → horizontal rule
 * 
 * Requirements: 17.1-17.9
 */

/**
 * Block types that can be created from line-start shortcuts
 */
export type BlockType = 
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'todo'
  | 'toggle'
  | 'quote'
  | 'divider'
  | 'callout';

/**
 * Result of processing a line-start shortcut
 */
export interface LineStartResult {
  /** The block type to convert to */
  blockType: BlockType;
  /** The remaining content after removing the shortcut */
  content: string;
  /** Whether a conversion was applied */
  converted: boolean;
  /** Additional metadata for the block (e.g., checked state for todo) */
  metadata?: {
    checked?: boolean;
    listStyle?: 'numeric' | 'alpha' | 'roman';
  };
}

/**
 * Pattern definition for line-start shortcuts
 */
export interface LineStartPattern {
  name: string;
  regex: RegExp;
  blockType: BlockType;
  extractContent: (match: RegExpMatchArray) => string;
  metadata?: (match: RegExpMatchArray) => Record<string, any>;
}

/**
 * Patterns for detecting line-start Markdown shortcuts
 * Each pattern matches text at the beginning of a line
 */
export const LINE_START_PATTERNS: Record<string, LineStartPattern> = {
  /**
   * Heading 3 pattern: ### + space
   * Must be checked before heading 2 and 1
   * Requirements: 17.6
   */
  heading3: {
    name: 'heading3',
    regex: /^###\s(.*)$/,
    blockType: 'heading_3',
    extractContent: (match) => match[1] || ''
  },

  /**
   * Heading 2 pattern: ## + space
   * Must be checked before heading 1
   * Requirements: 17.5
   */
  heading2: {
    name: 'heading2',
    regex: /^##\s(.*)$/,
    blockType: 'heading_2',
    extractContent: (match) => match[1] || ''
  },

  /**
   * Heading 1 pattern: # + space
   * Requirements: 17.4
   */
  heading1: {
    name: 'heading1',
    regex: /^#\s(.*)$/,
    blockType: 'heading_1',
    extractContent: (match) => match[1] || ''
  },

  /**
   * Divider pattern: ---
   * Requirements: 17.9
   */
  divider: {
    name: 'divider',
    regex: /^---$/,
    blockType: 'divider',
    extractContent: () => ''
  },

  /**
   * Todo checked pattern: [x] or [X]
   * Must be checked before unchecked todo
   * Requirements: 17.2
   */
  todoChecked: {
    name: 'todoChecked',
    regex: /^\[x\]\s?(.*)$/i,
    blockType: 'todo',
    extractContent: (match) => match[1] || '',
    metadata: () => ({ checked: true })
  },

  /**
   * Todo unchecked pattern: [] or [ ]
   * Requirements: 17.2
   */
  todoUnchecked: {
    name: 'todoUnchecked',
    regex: /^\[\s?\]\s?(.*)$/,
    blockType: 'todo',
    extractContent: (match) => match[1] || '',
    metadata: () => ({ checked: false })
  },

  /**
   * Numbered list pattern: 1., a., i. + space
   * Supports numeric (1.), alphabetic (a.), and roman (i.) styles
   * Requirements: 17.3
   */
  numberedList: {
    name: 'numberedList',
    regex: /^(\d+|[a-z]|[ivxlcdm]+)\.\s(.*)$/i,
    blockType: 'numbered_list',
    extractContent: (match) => match[2] || '',
    metadata: (match) => {
      const marker = match[1].toLowerCase();
      if (/^\d+$/.test(marker)) {
        return { listStyle: 'numeric' };
      } else if (/^[ivxlcdm]+$/.test(marker)) {
        return { listStyle: 'roman' };
      } else {
        return { listStyle: 'alpha' };
      }
    }
  },

  /**
   * Bullet list pattern: -, *, + followed by space
   * Requirements: 17.1
   */
  bulletList: {
    name: 'bulletList',
    regex: /^[-*+]\s(.*)$/,
    blockType: 'bulleted_list',
    extractContent: (match) => match[1] || ''
  },

  /**
   * Toggle pattern: > + space (not followed by [!)
   * Must check that it's not a callout
   * Requirements: 17.7
   */
  toggle: {
    name: 'toggle',
    regex: /^>\s(?!\[!)(.*)$/,
    blockType: 'toggle',
    extractContent: (match) => match[1] || ''
  },

  /**
   * Quote pattern: " + space
   * Requirements: 17.8
   */
  quote: {
    name: 'quote',
    regex: /^"\s(.*)$/,
    blockType: 'quote',
    extractContent: (match) => match[1] || ''
  }
};

/**
 * LineStartHandler class
 * 
 * Provides detection and conversion of line-start Markdown shortcuts.
 * Designed to be used with contenteditable elements.
 */
export class LineStartHandler {
  private patterns: LineStartPattern[];
  
  constructor(customPatterns?: LineStartPattern[]) {
    // Use custom patterns or default patterns in priority order
    // Order matters: more specific patterns (###) must come before less specific (#)
    this.patterns = customPatterns || [
      LINE_START_PATTERNS.heading3,
      LINE_START_PATTERNS.heading2,
      LINE_START_PATTERNS.heading1,
      LINE_START_PATTERNS.divider,
      LINE_START_PATTERNS.todoChecked,
      LINE_START_PATTERNS.todoUnchecked,
      LINE_START_PATTERNS.numberedList,
      LINE_START_PATTERNS.bulletList,
      LINE_START_PATTERNS.toggle,
      LINE_START_PATTERNS.quote
    ];
  }
  
  /**
   * Process a line for line-start shortcuts
   * 
   * Detects Markdown shortcuts at the beginning of the line
   * and returns the block type and remaining content.
   * 
   * @param line - The line to process
   * @returns LineStartResult with block type, content, and whether conversion was applied
   */
  processLineStart(line: string): LineStartResult {
    // Trim leading whitespace for pattern matching but preserve it for indentation detection
    const trimmedLine = line.trimStart();
    
    // Try each pattern in order
    for (const pattern of this.patterns) {
      const match = trimmedLine.match(pattern.regex);
      
      if (match) {
        const content = pattern.extractContent(match);
        const metadata = pattern.metadata?.(match);
        
        return {
          blockType: pattern.blockType,
          content,
          converted: true,
          metadata
        };
      }
    }
    
    // No pattern matched - return as paragraph
    return {
      blockType: 'paragraph',
      content: line,
      converted: false
    };
  }
  
  /**
   * Check if a line starts with any shortcut pattern
   * 
   * @param line - The line to check
   * @returns true if any pattern matches
   */
  hasShortcut(line: string): boolean {
    const trimmedLine = line.trimStart();
    
    for (const pattern of this.patterns) {
      if (pattern.regex.test(trimmedLine)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get the pattern that matches a line
   * 
   * @param line - The line to check
   * @returns The matching pattern name or null
   */
  getMatchingPattern(line: string): string | null {
    const trimmedLine = line.trimStart();
    
    for (const pattern of this.patterns) {
      if (pattern.regex.test(trimmedLine)) {
        return pattern.name;
      }
    }
    return null;
  }
  
  /**
   * Get the block type for a line
   * 
   * @param line - The line to check
   * @returns The block type or 'paragraph' if no match
   */
  getBlockType(line: string): BlockType {
    const result = this.processLineStart(line);
    return result.blockType;
  }
}

// Export singleton instance for convenience
export const lineStartHandler = new LineStartHandler();

// Export individual check functions for direct use

/**
 * Check if line is a bullet list shortcut
 * Requirements: 17.1
 */
export function isBulletList(line: string): boolean {
  return LINE_START_PATTERNS.bulletList.regex.test(line.trimStart());
}

/**
 * Check if line is a todo shortcut
 * Requirements: 17.2
 */
export function isTodo(line: string): boolean {
  const trimmed = line.trimStart();
  return LINE_START_PATTERNS.todoUnchecked.regex.test(trimmed) ||
         LINE_START_PATTERNS.todoChecked.regex.test(trimmed);
}

/**
 * Check if line is a numbered list shortcut
 * Requirements: 17.3
 */
export function isNumberedList(line: string): boolean {
  return LINE_START_PATTERNS.numberedList.regex.test(line.trimStart());
}

/**
 * Check if line is a heading shortcut (any level)
 * Requirements: 17.4, 17.5, 17.6
 */
export function isHeading(line: string): boolean {
  const trimmed = line.trimStart();
  return LINE_START_PATTERNS.heading1.regex.test(trimmed) ||
         LINE_START_PATTERNS.heading2.regex.test(trimmed) ||
         LINE_START_PATTERNS.heading3.regex.test(trimmed);
}

/**
 * Check if line is a toggle shortcut
 * Requirements: 17.7
 */
export function isToggle(line: string): boolean {
  return LINE_START_PATTERNS.toggle.regex.test(line.trimStart());
}

/**
 * Check if line is a quote shortcut
 * Requirements: 17.8
 */
export function isQuote(line: string): boolean {
  return LINE_START_PATTERNS.quote.regex.test(line.trimStart());
}

/**
 * Check if line is a divider shortcut
 * Requirements: 17.9
 */
export function isDivider(line: string): boolean {
  return LINE_START_PATTERNS.divider.regex.test(line.trimStart());
}
