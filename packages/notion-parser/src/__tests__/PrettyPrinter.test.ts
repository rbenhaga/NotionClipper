/**
 * Unit tests for PrettyPrinter
 * Tests the conversion of AST nodes back to Markdown
 */

import { PrettyPrinter, printToMarkdown } from '../converters/PrettyPrinter';
import type { ASTNode } from '../types/ast';

describe('PrettyPrinter', () => {
  let printer: PrettyPrinter;

  beforeEach(() => {
    printer = new PrettyPrinter();
  });

  describe('print()', () => {
    test('should return empty string for empty array', () => {
      expect(printer.print([])).toBe('');
    });

    test('should return empty string for null/undefined', () => {
      expect(printer.print(null as any)).toBe('');
      expect(printer.print(undefined as any)).toBe('');
    });
  });

  describe('paragraph', () => {
    test('should print paragraph content', () => {
      const nodes: ASTNode[] = [
        { type: 'paragraph', content: 'Hello world' }
      ];
      expect(printer.print(nodes)).toBe('Hello world');
    });

    test('should handle empty paragraph', () => {
      const nodes: ASTNode[] = [
        { type: 'paragraph', content: '' }
      ];
      expect(printer.print(nodes)).toBe('');
    });
  });

  describe('headings', () => {
    test('should print heading_1 with # prefix', () => {
      const nodes: ASTNode[] = [
        { type: 'heading_1', content: 'Title' }
      ];
      expect(printer.print(nodes)).toBe('# Title');
    });

    test('should print heading_2 with ## prefix', () => {
      const nodes: ASTNode[] = [
        { type: 'heading_2', content: 'Subtitle' }
      ];
      expect(printer.print(nodes)).toBe('## Subtitle');
    });

    test('should print heading_3 with ### prefix', () => {
      const nodes: ASTNode[] = [
        { type: 'heading_3', content: 'Section' }
      ];
      expect(printer.print(nodes)).toBe('### Section');
    });
  });

  describe('list items', () => {
    test('should print bulleted list item', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'list_item', 
          content: 'Item 1',
          metadata: { listType: 'bulleted' }
        }
      ];
      expect(printer.print(nodes)).toBe('- Item 1');
    });

    test('should print numbered list item', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'list_item', 
          content: 'First item',
          metadata: { listType: 'numbered' }
        }
      ];
      expect(printer.print(nodes)).toBe('1. First item');
    });

    test('should print unchecked todo item', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'list_item', 
          content: 'Task',
          metadata: { listType: 'todo', checked: false }
        }
      ];
      expect(printer.print(nodes)).toBe('- [ ] Task');
    });

    test('should print checked todo item', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'list_item', 
          content: 'Done task',
          metadata: { listType: 'todo', checked: true }
        }
      ];
      expect(printer.print(nodes)).toBe('- [x] Done task');
    });

    test('should print toggleable list item with > prefix', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'list_item', 
          content: 'Toggle item',
          metadata: { listType: 'bulleted', isToggleable: true }
        }
      ];
      expect(printer.print(nodes)).toBe('> - Toggle item');
    });

    test('should print nested list items with indentation', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'list_item', 
          content: 'Parent',
          metadata: { listType: 'bulleted' },
          children: [
            {
              type: 'list_item',
              content: 'Child',
              metadata: { listType: 'bulleted' }
            }
          ]
        }
      ];
      const result = printer.print(nodes);
      expect(result).toContain('- Parent');
      expect(result).toContain('  - Child');
    });
  });

  describe('code blocks', () => {
    test('should print code block with language', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'code', 
          content: 'const x = 1;',
          metadata: { language: 'javascript', isBlock: true }
        }
      ];
      const result = printer.print(nodes);
      expect(result).toContain('```javascript');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('```');
    });

    test('should print code block without language', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'code', 
          content: 'plain code',
          metadata: { isBlock: true }
        }
      ];
      const result = printer.print(nodes);
      expect(result).toContain('```');
      expect(result).toContain('plain code');
    });

    test('should print inline code', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'code', 
          content: 'inline',
          metadata: { isBlock: false }
        }
      ];
      expect(printer.print(nodes)).toBe('`inline`');
    });
  });

  describe('tables', () => {
    test('should print markdown table with headers', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'table', 
          content: '',
          metadata: { 
            headers: ['Name', 'Age'],
            rows: [['Alice', '30'], ['Bob', '25']],
            tableType: 'markdown'
          }
        }
      ];
      const result = printer.print(nodes);
      expect(result).toContain('| Name | Age |');
      expect(result).toContain('| --- | --- |');
      expect(result).toContain('| Alice | 30 |');
      expect(result).toContain('| Bob | 25 |');
    });

    test('should print CSV table', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'table', 
          content: '',
          metadata: { 
            headers: ['A', 'B'],
            rows: [['1', '2']],
            tableType: 'csv'
          }
        }
      ];
      const result = printer.print(nodes);
      expect(result).toContain('A,B');
      expect(result).toContain('1,2');
    });

    test('should print TSV table', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'table', 
          content: '',
          metadata: { 
            headers: ['X', 'Y'],
            rows: [['10', '20']],
            tableType: 'tsv'
          }
        }
      ];
      const result = printer.print(nodes);
      expect(result).toContain('X\tY');
      expect(result).toContain('10\t20');
    });
  });

  describe('quote', () => {
    test('should print quote with >> prefix', () => {
      const nodes: ASTNode[] = [
        { type: 'quote', content: 'Famous quote' }
      ];
      expect(printer.print(nodes)).toBe('>> Famous quote');
    });
  });

  describe('toggle', () => {
    test('should print toggle with > prefix', () => {
      const nodes: ASTNode[] = [
        { type: 'toggle', content: 'Toggle content' }
      ];
      expect(printer.print(nodes)).toBe('> Toggle content');
    });

    test('should print toggle with children', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'toggle', 
          content: 'Parent toggle',
          children: [
            { type: 'paragraph', content: 'Child content' }
          ]
        }
      ];
      const result = printer.print(nodes);
      expect(result).toContain('> Parent toggle');
      expect(result).toContain('  Child content');
    });
  });

  describe('callout', () => {
    test('should print callout with type', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'callout', 
          content: 'Important note',
          metadata: { icon: '⚠️', color: 'yellow' }
        }
      ];
      expect(printer.print(nodes)).toBe('> [!warning] Important note');
    });

    test('should print callout with default type', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'callout', 
          content: 'Tip content',
          metadata: { icon: '💡' }
        }
      ];
      expect(printer.print(nodes)).toBe('> [!tip] Tip content');
    });
  });

  describe('divider', () => {
    test('should print divider as ---', () => {
      const nodes: ASTNode[] = [
        { type: 'divider' }
      ];
      expect(printer.print(nodes)).toBe('---');
    });
  });

  describe('image', () => {
    test('should print image with alt text', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'image', 
          content: '',
          metadata: { url: 'https://example.com/img.png', caption: 'My image' }
        }
      ];
      expect(printer.print(nodes)).toBe('![My image](https://example.com/img.png)');
    });

    test('should print image without alt text', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'image', 
          content: '',
          metadata: { url: 'https://example.com/img.png' }
        }
      ];
      expect(printer.print(nodes)).toBe('![](https://example.com/img.png)');
    });
  });

  describe('media (video/audio)', () => {
    test('should print video URL', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'video', 
          content: '',
          metadata: { url: 'https://youtube.com/watch?v=123' }
        }
      ];
      expect(printer.print(nodes)).toBe('https://youtube.com/watch?v=123');
    });

    test('should print audio URL', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'audio', 
          content: '',
          metadata: { url: 'https://spotify.com/track/123' }
        }
      ];
      expect(printer.print(nodes)).toBe('https://spotify.com/track/123');
    });
  });

  describe('bookmark', () => {
    test('should print bookmark as link', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'bookmark', 
          content: '',
          metadata: { url: 'https://example.com', title: 'Example Site' }
        }
      ];
      expect(printer.print(nodes)).toBe('[Example Site](https://example.com)');
    });
  });

  describe('equation', () => {
    test('should print block equation', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'equation', 
          content: 'E = mc^2',
          metadata: { isBlock: true }
        }
      ];
      const result = printer.print(nodes);
      expect(result).toContain('$$');
      expect(result).toContain('E = mc^2');
    });

    test('should print inline equation', () => {
      const nodes: ASTNode[] = [
        { 
          type: 'equation', 
          content: 'x^2',
          metadata: { isBlock: false }
        }
      ];
      expect(printer.print(nodes)).toBe('$x^2$');
    });
  });

  describe('options', () => {
    test('should use custom indent size', () => {
      const customPrinter = new PrettyPrinter({ indentSize: 4 });
      const nodes: ASTNode[] = [
        { 
          type: 'list_item', 
          content: 'Parent',
          metadata: { listType: 'bulleted' },
          children: [
            {
              type: 'list_item',
              content: 'Child',
              metadata: { listType: 'bulleted' }
            }
          ]
        }
      ];
      const result = customPrinter.print(nodes);
      expect(result).toContain('    - Child');
    });

    test('should use tabs for indentation', () => {
      const tabPrinter = new PrettyPrinter({ useTabs: true });
      const nodes: ASTNode[] = [
        { 
          type: 'list_item', 
          content: 'Parent',
          metadata: { listType: 'bulleted' },
          children: [
            {
              type: 'list_item',
              content: 'Child',
              metadata: { listType: 'bulleted' }
            }
          ]
        }
      ];
      const result = tabPrinter.print(nodes);
      expect(result).toContain('\t- Child');
    });

    test('should not add blank lines when disabled', () => {
      const compactPrinter = new PrettyPrinter({ addBlankLines: false });
      const nodes: ASTNode[] = [
        { type: 'paragraph', content: 'Line 1' },
        { type: 'paragraph', content: 'Line 2' }
      ];
      const result = compactPrinter.print(nodes);
      expect(result).toBe('Line 1\nLine 2');
    });
  });

  describe('printToMarkdown convenience function', () => {
    test('should work with default options', () => {
      const nodes: ASTNode[] = [
        { type: 'paragraph', content: 'Test' }
      ];
      expect(printToMarkdown(nodes)).toBe('Test');
    });

    test('should work with custom options', () => {
      const nodes: ASTNode[] = [
        { type: 'paragraph', content: 'A' },
        { type: 'paragraph', content: 'B' }
      ];
      expect(printToMarkdown(nodes, { addBlankLines: false })).toBe('A\nB');
    });
  });
});
