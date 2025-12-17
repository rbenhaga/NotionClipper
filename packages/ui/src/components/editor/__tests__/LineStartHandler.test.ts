/**
 * Unit tests for LineStartHandler
 * 
 * Tests the line-start Markdown shortcuts detection and conversion.
 * 
 * Requirements: 17.1-17.9
 */

import {
  LineStartHandler,
  lineStartHandler,
  LINE_START_PATTERNS,
  isBulletList,
  isTodo,
  isNumberedList,
  isHeading,
  isToggle,
  isQuote,
  isDivider
} from '../LineStartHandler';

describe('LineStartHandler', () => {
  let handler: LineStartHandler;

  beforeEach(() => {
    handler = new LineStartHandler();
  });

  describe('Bullet list shortcut (-, *, + + space)', () => {
    /**
     * Requirements: 17.1
     * WHEN the user types `*`, `-`, or `+` followed by space at the beginning of a line
     * THEN the NotionClipboardEditor SHALL convert the line to a bulleted list item
     */
    it('should convert "- text" to bulleted list', () => {
      const result = handler.processLineStart('- Hello world');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('bulleted_list');
      expect(result.content).toBe('Hello world');
    });

    it('should convert "* text" to bulleted list', () => {
      const result = handler.processLineStart('* Hello world');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('bulleted_list');
      expect(result.content).toBe('Hello world');
    });

    it('should convert "+ text" to bulleted list', () => {
      const result = handler.processLineStart('+ Hello world');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('bulleted_list');
      expect(result.content).toBe('Hello world');
    });

    it('should not match without space after marker', () => {
      const result = handler.processLineStart('-text');
      
      expect(result.converted).toBe(false);
      expect(result.blockType).toBe('paragraph');
    });

    it('should handle empty content after marker', () => {
      const result = handler.processLineStart('- ');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('bulleted_list');
      expect(result.content).toBe('');
    });
  });

  describe('Todo shortcut ([])', () => {
    /**
     * Requirements: 17.2
     * WHEN the user types `[]` at the beginning of a line
     * THEN the NotionClipboardEditor SHALL convert the line to a to-do checkbox
     */
    it('should convert "[] text" to unchecked todo', () => {
      const result = handler.processLineStart('[] Task item');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('todo');
      expect(result.content).toBe('Task item');
      expect(result.metadata?.checked).toBe(false);
    });

    it('should convert "[ ] text" to unchecked todo', () => {
      const result = handler.processLineStart('[ ] Task item');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('todo');
      expect(result.content).toBe('Task item');
      expect(result.metadata?.checked).toBe(false);
    });

    it('should convert "[x] text" to checked todo', () => {
      const result = handler.processLineStart('[x] Completed task');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('todo');
      expect(result.content).toBe('Completed task');
      expect(result.metadata?.checked).toBe(true);
    });

    it('should convert "[X] text" to checked todo (uppercase)', () => {
      const result = handler.processLineStart('[X] Completed task');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('todo');
      expect(result.content).toBe('Completed task');
      expect(result.metadata?.checked).toBe(true);
    });

    it('should handle todo without space after brackets', () => {
      const result = handler.processLineStart('[]Task');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('todo');
      expect(result.content).toBe('Task');
    });
  });

  describe('Numbered list shortcut (1., a., i. + space)', () => {
    /**
     * Requirements: 17.3
     * WHEN the user types `1.`, `a.`, or `i.` followed by space at the beginning of a line
     * THEN the NotionClipboardEditor SHALL convert the line to a numbered list item
     */
    it('should convert "1. text" to numbered list', () => {
      const result = handler.processLineStart('1. First item');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('numbered_list');
      expect(result.content).toBe('First item');
      expect(result.metadata?.listStyle).toBe('numeric');
    });

    it('should convert "a. text" to numbered list (alpha)', () => {
      const result = handler.processLineStart('a. Alpha item');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('numbered_list');
      expect(result.content).toBe('Alpha item');
      expect(result.metadata?.listStyle).toBe('alpha');
    });

    it('should convert "i. text" to numbered list (roman)', () => {
      const result = handler.processLineStart('i. Roman item');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('numbered_list');
      expect(result.content).toBe('Roman item');
      expect(result.metadata?.listStyle).toBe('roman');
    });

    it('should convert "10. text" to numbered list', () => {
      const result = handler.processLineStart('10. Tenth item');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('numbered_list');
      expect(result.content).toBe('Tenth item');
    });

    it('should not match without space after period', () => {
      const result = handler.processLineStart('1.text');
      
      expect(result.converted).toBe(false);
      expect(result.blockType).toBe('paragraph');
    });
  });

  describe('Heading shortcuts (#, ##, ### + space)', () => {
    /**
     * Requirements: 17.4
     * WHEN the user types `#` followed by space at the beginning of a line
     * THEN the NotionClipboardEditor SHALL convert the line to an H1 heading
     */
    it('should convert "# text" to heading 1', () => {
      const result = handler.processLineStart('# Main Title');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('heading_1');
      expect(result.content).toBe('Main Title');
    });

    /**
     * Requirements: 17.5
     * WHEN the user types `##` followed by space at the beginning of a line
     * THEN the NotionClipboardEditor SHALL convert the line to an H2 heading
     */
    it('should convert "## text" to heading 2', () => {
      const result = handler.processLineStart('## Section Title');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('heading_2');
      expect(result.content).toBe('Section Title');
    });

    /**
     * Requirements: 17.6
     * WHEN the user types `###` followed by space at the beginning of a line
     * THEN the NotionClipboardEditor SHALL convert the line to an H3 heading
     */
    it('should convert "### text" to heading 3', () => {
      const result = handler.processLineStart('### Subsection Title');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('heading_3');
      expect(result.content).toBe('Subsection Title');
    });

    it('should not match without space after hashes', () => {
      const result = handler.processLineStart('#text');
      
      expect(result.converted).toBe(false);
      expect(result.blockType).toBe('paragraph');
    });

    it('should handle empty content after heading marker', () => {
      const result = handler.processLineStart('# ');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('heading_1');
      expect(result.content).toBe('');
    });
  });

  describe('Toggle shortcut (> + space)', () => {
    /**
     * Requirements: 17.7
     * WHEN the user types `>` followed by space at the beginning of a line
     * THEN the NotionClipboardEditor SHALL convert the line to a toggle list
     */
    it('should convert "> text" to toggle', () => {
      const result = handler.processLineStart('> Toggle content');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('toggle');
      expect(result.content).toBe('Toggle content');
    });

    it('should not match callout syntax "> [!type]"', () => {
      const result = handler.processLineStart('> [!note] This is a callout');
      
      // Should not match toggle pattern (callout is handled separately)
      expect(result.blockType).not.toBe('toggle');
    });

    it('should not match without space after >', () => {
      const result = handler.processLineStart('>text');
      
      expect(result.converted).toBe(false);
      expect(result.blockType).toBe('paragraph');
    });
  });

  describe('Quote shortcut (" + space)', () => {
    /**
     * Requirements: 17.8
     * WHEN the user types `"` followed by space at the beginning of a line
     * THEN the NotionClipboardEditor SHALL convert the line to a quote block
     */
    it('should convert "" text" to quote', () => {
      const result = handler.processLineStart('" Famous quote here');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('quote');
      expect(result.content).toBe('Famous quote here');
    });

    it('should not match without space after quote', () => {
      const result = handler.processLineStart('"text');
      
      expect(result.converted).toBe(false);
      expect(result.blockType).toBe('paragraph');
    });
  });

  describe('Divider shortcut (---)', () => {
    /**
     * Requirements: 17.9
     * WHEN the user types `---` at the beginning of a line
     * THEN the NotionClipboardEditor SHALL insert a divider
     */
    it('should convert "---" to divider', () => {
      const result = handler.processLineStart('---');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('divider');
      expect(result.content).toBe('');
    });

    it('should not match with extra characters', () => {
      const result = handler.processLineStart('--- extra');
      
      expect(result.converted).toBe(false);
      expect(result.blockType).toBe('paragraph');
    });

    it('should not match with fewer dashes', () => {
      const result = handler.processLineStart('--');
      
      expect(result.converted).toBe(false);
      expect(result.blockType).toBe('paragraph');
    });
  });

  describe('hasShortcut', () => {
    it('should detect bullet list shortcuts', () => {
      expect(handler.hasShortcut('- item')).toBe(true);
      expect(handler.hasShortcut('* item')).toBe(true);
      expect(handler.hasShortcut('+ item')).toBe(true);
    });

    it('should detect heading shortcuts', () => {
      expect(handler.hasShortcut('# heading')).toBe(true);
      expect(handler.hasShortcut('## heading')).toBe(true);
      expect(handler.hasShortcut('### heading')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(handler.hasShortcut('Hello world')).toBe(false);
    });
  });

  describe('getMatchingPattern', () => {
    it('should return "bulletList" for bullet patterns', () => {
      expect(handler.getMatchingPattern('- item')).toBe('bulletList');
    });

    it('should return "heading1" for # pattern', () => {
      expect(handler.getMatchingPattern('# title')).toBe('heading1');
    });

    it('should return "heading2" for ## pattern', () => {
      expect(handler.getMatchingPattern('## title')).toBe('heading2');
    });

    it('should return "heading3" for ### pattern', () => {
      expect(handler.getMatchingPattern('### title')).toBe('heading3');
    });

    it('should return null for plain text', () => {
      expect(handler.getMatchingPattern('Hello world')).toBeNull();
    });
  });

  describe('getBlockType', () => {
    it('should return correct block type for shortcuts', () => {
      expect(handler.getBlockType('- item')).toBe('bulleted_list');
      expect(handler.getBlockType('1. item')).toBe('numbered_list');
      expect(handler.getBlockType('[] task')).toBe('todo');
      expect(handler.getBlockType('# title')).toBe('heading_1');
      expect(handler.getBlockType('> toggle')).toBe('toggle');
      expect(handler.getBlockType('" quote')).toBe('quote');
      expect(handler.getBlockType('---')).toBe('divider');
    });

    it('should return paragraph for plain text', () => {
      expect(handler.getBlockType('Hello world')).toBe('paragraph');
    });
  });

  describe('Standalone check functions', () => {
    it('isBulletList should work correctly', () => {
      expect(isBulletList('- item')).toBe(true);
      expect(isBulletList('* item')).toBe(true);
      expect(isBulletList('+ item')).toBe(true);
      expect(isBulletList('text')).toBe(false);
    });

    it('isTodo should work correctly', () => {
      expect(isTodo('[] task')).toBe(true);
      expect(isTodo('[ ] task')).toBe(true);
      expect(isTodo('[x] task')).toBe(true);
      expect(isTodo('text')).toBe(false);
    });

    it('isNumberedList should work correctly', () => {
      expect(isNumberedList('1. item')).toBe(true);
      expect(isNumberedList('a. item')).toBe(true);
      expect(isNumberedList('i. item')).toBe(true);
      expect(isNumberedList('text')).toBe(false);
    });

    it('isHeading should work correctly', () => {
      expect(isHeading('# title')).toBe(true);
      expect(isHeading('## title')).toBe(true);
      expect(isHeading('### title')).toBe(true);
      expect(isHeading('text')).toBe(false);
    });

    it('isToggle should work correctly', () => {
      expect(isToggle('> content')).toBe(true);
      expect(isToggle('text')).toBe(false);
    });

    it('isQuote should work correctly', () => {
      expect(isQuote('" quote')).toBe(true);
      expect(isQuote('text')).toBe(false);
    });

    it('isDivider should work correctly', () => {
      expect(isDivider('---')).toBe(true);
      expect(isDivider('text')).toBe(false);
    });
  });

  describe('Singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(lineStartHandler).toBeInstanceOf(LineStartHandler);
    });

    it('singleton should work correctly', () => {
      const result = lineStartHandler.processLineStart('# Title');
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('heading_1');
    });
  });

  describe('LINE_START_PATTERNS export', () => {
    it('should export all patterns', () => {
      expect(LINE_START_PATTERNS.bulletList).toBeDefined();
      expect(LINE_START_PATTERNS.numberedList).toBeDefined();
      expect(LINE_START_PATTERNS.todoUnchecked).toBeDefined();
      expect(LINE_START_PATTERNS.todoChecked).toBeDefined();
      expect(LINE_START_PATTERNS.heading1).toBeDefined();
      expect(LINE_START_PATTERNS.heading2).toBeDefined();
      expect(LINE_START_PATTERNS.heading3).toBeDefined();
      expect(LINE_START_PATTERNS.toggle).toBeDefined();
      expect(LINE_START_PATTERNS.quote).toBeDefined();
      expect(LINE_START_PATTERNS.divider).toBeDefined();
    });
  });

  describe('Leading whitespace handling', () => {
    it('should handle leading spaces', () => {
      const result = handler.processLineStart('  - indented item');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('bulleted_list');
      expect(result.content).toBe('indented item');
    });

    it('should handle leading tabs', () => {
      const result = handler.processLineStart('\t# heading');
      
      expect(result.converted).toBe(true);
      expect(result.blockType).toBe('heading_1');
      expect(result.content).toBe('heading');
    });
  });
});
