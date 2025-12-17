/**
 * LiveMarkdownFormatter - Real-time Markdown formatting module
 * 
 * Converts Markdown syntax to HTML as the user types, providing
 * a Notion-like editing experience.
 * 
 * Supported patterns:
 * - Bold: **text** → <strong>text</strong>
 * - Italic: *text* → <em>text</em>
 * - Code: `text` → <code>text</code>
 * - Strikethrough: ~~text~~ → <s>text</s>
 * - Link: [text](url) → <a href="url">text</a>
 * 
 * Requirements: 16.1-16.5
 */

export interface FormattingResult {
  newText: string;
  newCursorPosition: number;
  applied: boolean;
}

export interface InlinePattern {
  name: string;
  regex: RegExp;
  replacement: (match: RegExpMatchArray) => string;
}

/**
 * Patterns for detecting inline Markdown formatting
 * Each pattern matches text that should be converted to HTML
 */
export const INLINE_PATTERNS: Record<string, InlinePattern> = {
  /**
   * Bold pattern: **text**
   * Matches text wrapped in double asterisks
   * Requirements: 16.1
   */
  bold: {
    name: 'bold',
    regex: /\*\*([^*]+)\*\*$/,
    replacement: (match) => `<strong>${match[1]}</strong>`
  },
  
  /**
   * Italic pattern: *text*
   * Matches text wrapped in single asterisks (not double)
   * Uses negative lookbehind to avoid matching bold
   * Requirements: 16.2
   */
  italic: {
    name: 'italic',
    regex: /(?<!\*)\*([^*]+)\*(?!\*)$/,
    replacement: (match) => `<em>${match[1]}</em>`
  },
  
  /**
   * Code pattern: `text`
   * Matches text wrapped in backticks
   * Requirements: 16.3
   */
  code: {
    name: 'code',
    regex: /`([^`]+)`$/,
    replacement: (match) => `<code>${match[1]}</code>`
  },
  
  /**
   * Strikethrough pattern: ~~text~~
   * Matches text wrapped in double tildes
   * Requirements: 16.4
   */
  strikethrough: {
    name: 'strikethrough',
    regex: /~~([^~]+)~~$/,
    replacement: (match) => `<s>${match[1]}</s>`
  },
  
  /**
   * Link pattern: [text](url)
   * Matches markdown link syntax
   * Requirements: 16.5
   */
  link: {
    name: 'link',
    regex: /\[([^\]]+)\]\(([^)]+)\)$/,
    replacement: (match) => `<a href="${match[2]}">${match[1]}</a>`
  }
};

/**
 * LiveMarkdownFormatter class
 * 
 * Provides real-time Markdown to HTML conversion for inline formatting.
 * Designed to be used with contenteditable elements.
 */
export class LiveMarkdownFormatter {
  private patterns: InlinePattern[];
  
  constructor(customPatterns?: InlinePattern[]) {
    this.patterns = customPatterns || Object.values(INLINE_PATTERNS);
  }
  
  /**
   * Process text for inline formatting
   * 
   * Detects Markdown patterns at the end of the text (before cursor)
   * and converts them to HTML.
   * 
   * @param text - The text to process
   * @param cursorPosition - Current cursor position in the text
   * @returns FormattingResult with new text, cursor position, and whether formatting was applied
   */
  processInlineFormatting(text: string, cursorPosition: number): FormattingResult {
    // Get text up to cursor position
    const textBeforeCursor = text.substring(0, cursorPosition);
    const textAfterCursor = text.substring(cursorPosition);
    
    // Try each pattern in order (bold before italic to handle ** vs *)
    for (const pattern of this.patterns) {
      const match = textBeforeCursor.match(pattern.regex);
      
      if (match) {
        const replacement = pattern.replacement(match);
        const matchStart = match.index!;
        const matchLength = match[0].length;
        
        // Build new text with replacement
        const newTextBeforeCursor = 
          textBeforeCursor.substring(0, matchStart) + replacement;
        const newText = newTextBeforeCursor + textAfterCursor;
        
        // Calculate new cursor position
        // Cursor should be after the replacement
        const newCursorPosition = newTextBeforeCursor.length;
        
        return {
          newText,
          newCursorPosition,
          applied: true
        };
      }
    }
    
    // No pattern matched
    return {
      newText: text,
      newCursorPosition: cursorPosition,
      applied: false
    };
  }
  
  /**
   * Check if text contains any unprocessed Markdown patterns
   * 
   * @param text - The text to check
   * @returns true if any pattern is found
   */
  hasUnprocessedPatterns(text: string): boolean {
    for (const pattern of this.patterns) {
      if (pattern.regex.test(text)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Process all patterns in text (not just at cursor)
   * 
   * Useful for processing pasted content or initial content.
   * 
   * @param text - The text to process
   * @returns Processed text with all patterns converted
   */
  processAllPatterns(text: string): string {
    let result = text;
    
    // Process patterns in order
    // Bold must be processed before italic
    const orderedPatterns = [
      INLINE_PATTERNS.bold,
      INLINE_PATTERNS.italic,
      INLINE_PATTERNS.code,
      INLINE_PATTERNS.strikethrough,
      INLINE_PATTERNS.link
    ];
    
    for (const pattern of orderedPatterns) {
      // Use global version of regex for full text processing
      const globalRegex = new RegExp(pattern.regex.source, 'g');
      result = result.replace(globalRegex, (...args) => {
        // Create match array from replace arguments
        const match = args.slice(0, -2) as RegExpMatchArray;
        match.index = args[args.length - 2];
        match.input = args[args.length - 1];
        return pattern.replacement(match);
      });
    }
    
    return result;
  }
  
  /**
   * Get the pattern that matches at the end of text
   * 
   * @param text - The text to check
   * @returns The matching pattern name or null
   */
  getMatchingPattern(text: string): string | null {
    for (const pattern of this.patterns) {
      if (pattern.regex.test(text)) {
        return pattern.name;
      }
    }
    return null;
  }
}

// Export singleton instance for convenience
export const liveMarkdownFormatter = new LiveMarkdownFormatter();

// Export individual formatting functions for direct use
export function formatBold(text: string): string {
  const match = text.match(INLINE_PATTERNS.bold.regex);
  if (match) {
    return text.replace(INLINE_PATTERNS.bold.regex, INLINE_PATTERNS.bold.replacement(match));
  }
  return text;
}

export function formatItalic(text: string): string {
  const match = text.match(INLINE_PATTERNS.italic.regex);
  if (match) {
    return text.replace(INLINE_PATTERNS.italic.regex, INLINE_PATTERNS.italic.replacement(match));
  }
  return text;
}

export function formatCode(text: string): string {
  const match = text.match(INLINE_PATTERNS.code.regex);
  if (match) {
    return text.replace(INLINE_PATTERNS.code.regex, INLINE_PATTERNS.code.replacement(match));
  }
  return text;
}

export function formatStrikethrough(text: string): string {
  const match = text.match(INLINE_PATTERNS.strikethrough.regex);
  if (match) {
    return text.replace(INLINE_PATTERNS.strikethrough.regex, INLINE_PATTERNS.strikethrough.replacement(match));
  }
  return text;
}

export function formatLink(text: string): string {
  const match = text.match(INLINE_PATTERNS.link.regex);
  if (match) {
    return text.replace(INLINE_PATTERNS.link.regex, INLINE_PATTERNS.link.replacement(match));
  }
  return text;
}
