/**
 * Unit tests for LiveMarkdownFormatter
 * 
 * Tests the real-time Markdown to HTML conversion functionality.
 * 
 * Requirements: 16.1-16.5
 */

import {
  LiveMarkdownFormatter,
  liveMarkdownFormatter,
  INLINE_PATTERNS,
  formatBold,
  formatItalic,
  formatCode,
  formatStrikethrough,
  formatLink
} from '../LiveMarkdownFormatter';

describe('LiveMarkdownFormatter', () => {
  let formatter: LiveMarkdownFormatter;

  beforeEach(() => {
    formatter = new LiveMarkdownFormatter();
  });

  describe('Bold formatting (**text**)', () => {
    /**
     * Requirements: 16.1
     * WHEN the user types `**texte**` and presses space or continues typing
     * THEN the NotionClipboardEditor SHALL convert it to bold text and remove the asterisks
     */
    it('should convert **text** to <strong>text</strong>', () => {
      const result = formatter.processInlineFormatting('Hello **world**', 15);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('Hello <strong>world</strong>');
    });

    it('should handle bold at the start of text', () => {
      const result = formatter.processInlineFormatting('**bold**', 8);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('<strong>bold</strong>');
    });

    it('should handle bold with multiple words', () => {
      const result = formatter.processInlineFormatting('**bold text here**', 18);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('<strong>bold text here</strong>');
    });

    it('should not match incomplete bold patterns', () => {
      const result = formatter.processInlineFormatting('Hello **world', 13);
      
      expect(result.applied).toBe(false);
      expect(result.newText).toBe('Hello **world');
    });
  });

  describe('Italic formatting (*text*)', () => {
    /**
     * Requirements: 16.2
     * WHEN the user types `*texte*` and presses space or continues typing
     * THEN the NotionClipboardEditor SHALL convert it to italic text and remove the asterisks
     */
    it('should convert *text* to <em>text</em>', () => {
      const result = formatter.processInlineFormatting('Hello *world*', 13);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('Hello <em>world</em>');
    });

    it('should handle italic at the start of text', () => {
      const result = formatter.processInlineFormatting('*italic*', 8);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('<em>italic</em>');
    });

    it('should not match incomplete italic patterns', () => {
      const result = formatter.processInlineFormatting('Hello *world', 12);
      
      expect(result.applied).toBe(false);
      expect(result.newText).toBe('Hello *world');
    });
  });

  describe('Code formatting (`text`)', () => {
    /**
     * Requirements: 16.3
     * WHEN the user types `code` and presses space or continues typing
     * THEN the NotionClipboardEditor SHALL convert it to inline code and remove the backticks
     */
    it('should convert `text` to <code>text</code>', () => {
      const result = formatter.processInlineFormatting('Hello `code`', 12);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('Hello <code>code</code>');
    });

    it('should handle code at the start of text', () => {
      const result = formatter.processInlineFormatting('`myFunction`', 12);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('<code>myFunction</code>');
    });

    it('should handle code with special characters', () => {
      const result = formatter.processInlineFormatting('Use `npm install`', 17);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('Use <code>npm install</code>');
    });

    it('should not match incomplete code patterns', () => {
      const result = formatter.processInlineFormatting('Hello `code', 11);
      
      expect(result.applied).toBe(false);
      expect(result.newText).toBe('Hello `code');
    });
  });

  describe('Strikethrough formatting (~~text~~)', () => {
    /**
     * Requirements: 16.4
     * WHEN the user types `~~texte~~` and presses space or continues typing
     * THEN the NotionClipboardEditor SHALL convert it to strikethrough text and remove the tildes
     */
    it('should convert ~~text~~ to <s>text</s>', () => {
      const result = formatter.processInlineFormatting('Hello ~~world~~', 15);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('Hello <s>world</s>');
    });

    it('should handle strikethrough at the start of text', () => {
      const result = formatter.processInlineFormatting('~~deleted~~', 11);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('<s>deleted</s>');
    });

    it('should not match incomplete strikethrough patterns', () => {
      const result = formatter.processInlineFormatting('Hello ~~world', 13);
      
      expect(result.applied).toBe(false);
      expect(result.newText).toBe('Hello ~~world');
    });
  });

  describe('Link formatting ([text](url))', () => {
    /**
     * Requirements: 16.5
     * WHEN the user types `[texte](url)` THEN the NotionClipboardEditor SHALL convert it to a clickable link
     */
    it('should convert [text](url) to <a href="url">text</a>', () => {
      const result = formatter.processInlineFormatting('Check [Google](https://google.com)', 34);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('Check <a href="https://google.com">Google</a>');
    });

    it('should handle link at the start of text', () => {
      const result = formatter.processInlineFormatting('[Click here](https://example.com)', 33);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('<a href="https://example.com">Click here</a>');
    });

    it('should handle links with complex URLs', () => {
      const result = formatter.processInlineFormatting('[API](https://api.example.com/v1/users?id=123)', 46);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('<a href="https://api.example.com/v1/users?id=123">API</a>');
    });

    it('should not match incomplete link patterns', () => {
      const result = formatter.processInlineFormatting('[text](url', 10);
      
      expect(result.applied).toBe(false);
      expect(result.newText).toBe('[text](url');
    });
  });

  describe('Cursor position handling', () => {
    it('should update cursor position correctly after bold formatting', () => {
      const result = formatter.processInlineFormatting('Hello **world**', 15);
      
      // Original: "Hello **world**" (15 chars)
      // New: "Hello <strong>world</strong>" (28 chars)
      expect(result.newCursorPosition).toBe(28);
    });

    it('should handle cursor in the middle of text', () => {
      const text = 'Start **bold** end';
      const cursorPos = 14; // After **bold**
      
      const result = formatter.processInlineFormatting(text.substring(0, cursorPos), cursorPos);
      
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('Start <strong>bold</strong>');
    });
  });

  describe('hasUnprocessedPatterns', () => {
    it('should detect bold patterns', () => {
      expect(formatter.hasUnprocessedPatterns('Hello **world**')).toBe(true);
    });

    it('should detect italic patterns', () => {
      expect(formatter.hasUnprocessedPatterns('Hello *world*')).toBe(true);
    });

    it('should detect code patterns', () => {
      expect(formatter.hasUnprocessedPatterns('Hello `code`')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(formatter.hasUnprocessedPatterns('Hello world')).toBe(false);
    });
  });

  describe('getMatchingPattern', () => {
    it('should return "bold" for bold patterns', () => {
      expect(formatter.getMatchingPattern('Hello **world**')).toBe('bold');
    });

    it('should return "italic" for italic patterns', () => {
      expect(formatter.getMatchingPattern('Hello *world*')).toBe('italic');
    });

    it('should return "code" for code patterns', () => {
      expect(formatter.getMatchingPattern('Hello `code`')).toBe('code');
    });

    it('should return null for plain text', () => {
      expect(formatter.getMatchingPattern('Hello world')).toBeNull();
    });
  });

  describe('Standalone formatting functions', () => {
    it('formatBold should work correctly', () => {
      expect(formatBold('Hello **world**')).toBe('Hello <strong>world</strong>');
    });

    it('formatItalic should work correctly', () => {
      expect(formatItalic('Hello *world*')).toBe('Hello <em>world</em>');
    });

    it('formatCode should work correctly', () => {
      expect(formatCode('Hello `code`')).toBe('Hello <code>code</code>');
    });

    it('formatStrikethrough should work correctly', () => {
      expect(formatStrikethrough('Hello ~~world~~')).toBe('Hello <s>world</s>');
    });

    it('formatLink should work correctly', () => {
      expect(formatLink('[text](url)')).toBe('<a href="url">text</a>');
    });
  });

  describe('Singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(liveMarkdownFormatter).toBeInstanceOf(LiveMarkdownFormatter);
    });

    it('singleton should work correctly', () => {
      const result = liveMarkdownFormatter.processInlineFormatting('**bold**', 8);
      expect(result.applied).toBe(true);
      expect(result.newText).toBe('<strong>bold</strong>');
    });
  });

  describe('INLINE_PATTERNS export', () => {
    it('should export all patterns', () => {
      expect(INLINE_PATTERNS.bold).toBeDefined();
      expect(INLINE_PATTERNS.italic).toBeDefined();
      expect(INLINE_PATTERNS.code).toBeDefined();
      expect(INLINE_PATTERNS.strikethrough).toBeDefined();
      expect(INLINE_PATTERNS.link).toBeDefined();
    });
  });
});
