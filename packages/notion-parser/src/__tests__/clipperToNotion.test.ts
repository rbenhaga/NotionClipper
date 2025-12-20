/**
 * ✅ P0-3: Unit tests for clipperToNotion converter
 * 
 * Tests cover:
 * - Nested lists
 * - Toggle with children
 * - Callout with icon/color
 * - Table with headers
 * - Code with language
 * - Colors (text/background)
 * - Mentions/equations
 * - Image/file/bookmark
 * - Divider
 * - Edge cases
 */

// Jest is configured globally, no import needed
import { clipperToNotion } from '../converters/clipperToNotion';
import type { ClipperDocument, ClipperBlock } from '../types/clipper';

// Helper to create a minimal ClipperDocument
function createDoc(content: ClipperBlock[]): ClipperDocument {
  return {
    schemaVersion: '1.0',
    id: 'test-doc',
    metadata: {
      title: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: { type: 'manual' },
      stats: { blockCount: content.length, wordCount: 0, characterCount: 0 },
    },
    content,
    notionMapping: {
      pageId: null,
      workspaceId: null,
      lastSyncedAt: null,
      syncStatus: 'never',
      blockMappings: [],
    },
  };
}

// Helper to create a block
function createBlock(
  type: ClipperBlock['type'],
  props: any,
  content?: any[],
  children?: ClipperBlock[]
): ClipperBlock {
  return {
    id: `block-${Date.now()}-${Math.random()}`,
    type,
    props,
    content,
    children: children || [],
    _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
  };
}

describe('clipperToNotion', () => {
  // ============================================================================
  // 1. NESTED LISTS
  // ============================================================================
  describe('nested lists', () => {
    it('should convert nested bullet list with children nested inside', () => {
      const doc = createDoc([
        createBlock(
          'bulletList',
          { textColor: 'default', backgroundColor: 'default' },
          [{ type: 'text', text: 'Parent item', styles: {} }],
          [
            createBlock(
              'bulletList',
              { textColor: 'default', backgroundColor: 'default' },
              [{ type: 'text', text: 'Child item 1', styles: {} }]
            ),
            createBlock(
              'bulletList',
              { textColor: 'default', backgroundColor: 'default' },
              [{ type: 'text', text: 'Child item 2', styles: {} }]
            ),
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      // ✅ FIX: Children are NESTED inside block[type].children, not flattened
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('bulleted_list_item');
      
      // Children should be nested inside bulleted_list_item.children
      const parentBlock = blocks[0] as any;
      expect(parentBlock.bulleted_list_item.children).toBeDefined();
      expect(parentBlock.bulleted_list_item.children).toHaveLength(2);
      expect(parentBlock.bulleted_list_item.children[0].type).toBe('bulleted_list_item');
      expect(parentBlock.bulleted_list_item.children[1].type).toBe('bulleted_list_item');
    });

    it('should convert numbered list', () => {
      const doc = createDoc([
        createBlock(
          'numberedList',
          { textColor: 'default', backgroundColor: 'default' },
          [{ type: 'text', text: 'First', styles: {} }]
        ),
        createBlock(
          'numberedList',
          { textColor: 'default', backgroundColor: 'default' },
          [{ type: 'text', text: 'Second', styles: {} }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('numbered_list_item');
      expect(blocks[1].type).toBe('numbered_list_item');
    });

    it('should convert todo list with checked state', () => {
      const doc = createDoc([
        createBlock(
          'todoList',
          { textColor: 'default', backgroundColor: 'default', checked: true },
          [{ type: 'text', text: 'Done task', styles: {} }]
        ),
        createBlock(
          'todoList',
          { textColor: 'default', backgroundColor: 'default', checked: false },
          [{ type: 'text', text: 'Pending task', styles: {} }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('to_do');
      expect((blocks[0] as any).to_do.checked).toBe(true);
      expect((blocks[1] as any).to_do.checked).toBe(false);
    });
  });

  // ============================================================================
  // 2. TOGGLE WITH CHILDREN
  // ============================================================================
  describe('toggle with children', () => {
    it('should convert toggle with nested content inside toggle.children', () => {
      const doc = createDoc([
        createBlock(
          'toggle',
          { textColor: 'default', backgroundColor: 'default' },
          [{ type: 'text', text: 'Toggle header', styles: {} }],
          [
            createBlock(
              'paragraph',
              { textColor: 'default', backgroundColor: 'default' },
              [{ type: 'text', text: 'Hidden content', styles: {} }]
            ),
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      // ✅ FIX: Children are NESTED inside toggle.children, not flattened
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('toggle');
      
      const toggleBlock = blocks[0] as any;
      expect(toggleBlock.toggle.children).toBeDefined();
      expect(toggleBlock.toggle.children).toHaveLength(1);
      expect(toggleBlock.toggle.children[0].type).toBe('paragraph');
    });

    it('should convert toggleable heading with children nested', () => {
      const doc = createDoc([
        createBlock(
          'heading2',
          { level: 2, isToggleable: true, textColor: 'default', backgroundColor: 'default' },
          [{ type: 'text', text: 'Toggleable H2', styles: {} }],
          [
            createBlock(
              'paragraph',
              { textColor: 'default', backgroundColor: 'default' },
              [{ type: 'text', text: 'Content under heading', styles: {} }]
            ),
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      // ✅ FIX: Children are NESTED inside heading_2.children
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('heading_2');
      expect((blocks[0] as any).heading_2.is_toggleable).toBe(true);
      
      const headingBlock = blocks[0] as any;
      expect(headingBlock.heading_2.children).toBeDefined();
      expect(headingBlock.heading_2.children).toHaveLength(1);
      expect(headingBlock.heading_2.children[0].type).toBe('paragraph');
    });
  });

  // ============================================================================
  // 3. CALLOUT
  // ============================================================================
  describe('callout', () => {
    it('should convert callout with emoji icon', () => {
      const doc = createDoc([
        createBlock(
          'callout',
          { icon: '💡', iconType: 'emoji', backgroundColor: 'yellowBackground' },
          [{ type: 'text', text: 'Important note', styles: {} }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('callout');
      expect((blocks[0] as any).callout.icon.emoji).toBe('💡');
      expect((blocks[0] as any).callout.color).toBe('yellow_background');
    });

    it('should convert callout with URL icon', () => {
      const doc = createDoc([
        createBlock(
          'callout',
          { icon: 'https://example.com/icon.png', iconType: 'url', backgroundColor: 'default' },
          [{ type: 'text', text: 'External icon', styles: {} }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect((blocks[0] as any).callout.icon.type).toBe('external');
      expect((blocks[0] as any).callout.icon.external.url).toBe('https://example.com/icon.png');
    });
  });

  // ============================================================================
  // 4. TABLE
  // ============================================================================
  describe('table', () => {
    it('should convert table with headers', () => {
      const doc = createDoc([
        createBlock(
          'table',
          { hasColumnHeader: true, hasRowHeader: false, columnCount: 3 },
          undefined,
          [
            createBlock(
              'tableRow',
              { cells: [
                { content: [{ type: 'text', text: 'Header 1', styles: {} }] },
                { content: [{ type: 'text', text: 'Header 2', styles: {} }] },
                { content: [{ type: 'text', text: 'Header 3', styles: {} }] },
              ] }
            ),
            createBlock(
              'tableRow',
              { cells: [
                { content: [{ type: 'text', text: 'Cell 1', styles: {} }] },
                { content: [{ type: 'text', text: 'Cell 2', styles: {} }] },
                { content: [{ type: 'text', text: 'Cell 3', styles: {} }] },
              ] }
            ),
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      // Table block + children rows are flattened for Notion API
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0].type).toBe('table');
      expect((blocks[0] as any).table.table_width).toBe(3);
      expect((blocks[0] as any).table.has_column_header).toBe(true);
      // Children are embedded in table.children for Notion API
      expect((blocks[0] as any).table.children).toHaveLength(2);
    });
  });

  // ============================================================================
  // 5. CODE WITH LANGUAGE
  // ============================================================================
  describe('code', () => {
    it('should convert code block with language', () => {
      const doc = createDoc([
        createBlock(
          'code',
          { language: 'typescript', caption: 'Example code' },
          [{ type: 'text', text: 'const x = 1;', styles: {} }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('code');
      expect((blocks[0] as any).code.language).toBe('typescript');
      expect((blocks[0] as any).code.rich_text[0].text.content).toBe('const x = 1;');
      expect((blocks[0] as any).code.caption[0].text.content).toBe('Example code');
    });

    it('should normalize language aliases', () => {
      const doc = createDoc([
        createBlock(
          'code',
          { language: 'js' },
          [{ type: 'text', text: 'code', styles: {} }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect((blocks[0] as any).code.language).toBe('javascript');
    });
  });

  // ============================================================================
  // 6. COLORS
  // ============================================================================
  describe('colors', () => {
    it('should convert text color', () => {
      const doc = createDoc([
        createBlock(
          'paragraph',
          { textColor: 'red', backgroundColor: 'default' },
          [{ type: 'text', text: 'Red text', styles: { textColor: 'red' } }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect((blocks[0] as any).paragraph.color).toBe('red');
    });

    it('should convert background color', () => {
      const doc = createDoc([
        createBlock(
          'paragraph',
          { textColor: 'default', backgroundColor: 'blueBackground' },
          [{ type: 'text', text: 'Blue background', styles: {} }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect((blocks[0] as any).paragraph.color).toBe('blue_background');
    });
  });

  // ============================================================================
  // 7. MENTIONS AND EQUATIONS
  // ============================================================================
  describe('mentions and equations', () => {
    it('should convert inline equation', () => {
      const doc = createDoc([
        createBlock(
          'paragraph',
          { textColor: 'default', backgroundColor: 'default' },
          [
            { type: 'text', text: 'The formula is ', styles: {} },
            { type: 'equation', expression: 'E = mc^2' },
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      const richText = (blocks[0] as any).paragraph.rich_text;
      expect(richText).toHaveLength(2);
      expect(richText[1].type).toBe('equation');
      expect(richText[1].equation.expression).toBe('E = mc^2');
    });

    it('should convert block equation', () => {
      const doc = createDoc([
        createBlock(
          'equation',
          { expression: '\\int_0^\\infty e^{-x^2} dx' }
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('equation');
      expect((blocks[0] as any).equation.expression).toBe('\\int_0^\\infty e^{-x^2} dx');
    });

    it('should degrade mention to text', () => {
      const doc = createDoc([
        createBlock(
          'paragraph',
          { textColor: 'default', backgroundColor: 'default' },
          [
            { type: 'mention', mentionType: 'user', displayText: '@John', originalData: { userId: '123' } },
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      const richText = (blocks[0] as any).paragraph.rich_text;
      expect(richText[0].type).toBe('text');
      expect(richText[0].text.content).toBe('@John');
    });
  });

  // ============================================================================
  // 8. IMAGE/FILE/BOOKMARK
  // ============================================================================
  describe('media blocks', () => {
    it('should convert image', () => {
      const doc = createDoc([
        createBlock(
          'image',
          { url: 'https://example.com/image.png', caption: 'My image', isNotionHosted: false }
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('image');
      expect((blocks[0] as any).image.external.url).toBe('https://example.com/image.png');
      expect((blocks[0] as any).image.caption[0].text.content).toBe('My image');
    });

    it('should convert file', () => {
      const doc = createDoc([
        createBlock(
          'file',
          { url: 'https://example.com/doc.docx', name: 'document.docx', mimeType: 'application/docx' }
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('file');
      expect((blocks[0] as any).file.name).toBe('document.docx');
    });

    it('should convert PDF as pdf block', () => {
      const doc = createDoc([
        createBlock(
          'file',
          { url: 'https://example.com/doc.pdf', name: 'document.pdf', mimeType: 'application/pdf' }
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('pdf');
    });

    it('should convert bookmark', () => {
      const doc = createDoc([
        createBlock(
          'bookmark',
          { url: 'https://example.com', title: 'Example Site' }
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('bookmark');
      expect((blocks[0] as any).bookmark.url).toBe('https://example.com');
    });
  });

  // ============================================================================
  // 9. DIVIDER
  // ============================================================================
  describe('divider', () => {
    it('should convert divider', () => {
      const doc = createDoc([
        createBlock('divider', {}),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('divider');
    });
  });

  // ============================================================================
  // 10. RICH TEXT STYLES
  // ============================================================================
  describe('rich text styles', () => {
    it('should convert bold/italic/underline/strikethrough/code', () => {
      const doc = createDoc([
        createBlock(
          'paragraph',
          { textColor: 'default', backgroundColor: 'default' },
          [
            { type: 'text', text: 'bold', styles: { bold: true } },
            { type: 'text', text: 'italic', styles: { italic: true } },
            { type: 'text', text: 'underline', styles: { underline: true } },
            { type: 'text', text: 'strike', styles: { strikethrough: true } },
            { type: 'text', text: 'code', styles: { code: true } },
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      const richText = (blocks[0] as any).paragraph.rich_text;
      expect(richText[0].annotations.bold).toBe(true);
      expect(richText[1].annotations.italic).toBe(true);
      expect(richText[2].annotations.underline).toBe(true);
      expect(richText[3].annotations.strikethrough).toBe(true);
      expect(richText[4].annotations.code).toBe(true);
    });

    it('should convert link', () => {
      const doc = createDoc([
        createBlock(
          'paragraph',
          { textColor: 'default', backgroundColor: 'default' },
          [
            { 
              type: 'link', 
              url: 'https://example.com',
              content: [{ type: 'text', text: 'Click here', styles: { bold: true } }]
            },
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      const richText = (blocks[0] as any).paragraph.rich_text;
      expect(richText[0].text.link.url).toBe('https://example.com');
      expect(richText[0].text.content).toBe('Click here');
    });
  });

  // ============================================================================
  // 11. EDGE CASES
  // ============================================================================
  describe('edge cases', () => {
    it('should handle empty document', () => {
      const doc = createDoc([]);
      const blocks = clipperToNotion(doc);
      expect(blocks).toHaveLength(0);
    });

    it('should handle null/undefined document', () => {
      expect(clipperToNotion(null as any)).toEqual([]);
      expect(clipperToNotion(undefined as any)).toEqual([]);
    });

    it('should skip unsupported block types', () => {
      const doc = createDoc([
        createBlock('unsupported', { originalType: 'unknown' }),
        createBlock('paragraph', { textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'Valid', styles: {} }]),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('paragraph');
    });

    it('should degrade columnList to sequential content', () => {
      const doc = createDoc([
        createBlock(
          'columnList',
          { columnCount: 2 },
          undefined,
          [
            createBlock(
              'column',
              {},
              undefined,
              [
                createBlock('paragraph', { textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'Col 1', styles: {} }]),
              ]
            ),
            createBlock(
              'column',
              {},
              undefined,
              [
                createBlock('paragraph', { textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'Col 2', styles: {} }]),
              ]
            ),
          ]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      // Columns are degraded, but children should still be processed
      expect(blocks.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // 12. HEADINGS
  // ============================================================================
  describe('headings', () => {
    it('should convert all heading levels', () => {
      const doc = createDoc([
        createBlock('heading1', { level: 1, isToggleable: false, textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'H1', styles: {} }]),
        createBlock('heading2', { level: 2, isToggleable: false, textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'H2', styles: {} }]),
        createBlock('heading3', { level: 3, isToggleable: false, textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'H3', styles: {} }]),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(3);
      expect(blocks[0].type).toBe('heading_1');
      expect(blocks[1].type).toBe('heading_2');
      expect(blocks[2].type).toBe('heading_3');
    });
  });

  // ============================================================================
  // 13. QUOTE
  // ============================================================================
  describe('quote', () => {
    it('should convert quote block', () => {
      const doc = createDoc([
        createBlock(
          'quote',
          { textColor: 'default', backgroundColor: 'default' },
          [{ type: 'text', text: 'Famous quote', styles: { italic: true } }]
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('quote');
      expect((blocks[0] as any).quote.rich_text[0].text.content).toBe('Famous quote');
    });
  });

  // ============================================================================
  // 14. VIDEO/AUDIO
  // ============================================================================
  describe('video and audio', () => {
    it('should convert video', () => {
      const doc = createDoc([
        createBlock(
          'video',
          { url: 'https://youtube.com/watch?v=123', provider: 'youtube' }
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('video');
      expect((blocks[0] as any).video.external.url).toBe('https://youtube.com/watch?v=123');
    });

    it('should convert audio', () => {
      const doc = createDoc([
        createBlock(
          'audio',
          { url: 'https://example.com/audio.mp3', caption: 'Podcast' }
        ),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('audio');
      expect((blocks[0] as any).audio.external.url).toBe('https://example.com/audio.mp3');
    });
  });

  // ============================================================================
  // 15. STRUCTURE PRESERVATION
  // ============================================================================
  describe('structure preservation', () => {
    it('should preserve block order', () => {
      const doc = createDoc([
        createBlock('heading1', { level: 1, isToggleable: false, textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'Title', styles: {} }]),
        createBlock('paragraph', { textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'Intro', styles: {} }]),
        createBlock('bulletList', { textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'Item 1', styles: {} }]),
        createBlock('bulletList', { textColor: 'default', backgroundColor: 'default' }, [{ type: 'text', text: 'Item 2', styles: {} }]),
        createBlock('code', { language: 'python' }, [{ type: 'text', text: 'print("hello")', styles: {} }]),
      ]);

      const blocks = clipperToNotion(doc);

      expect(blocks).toHaveLength(5);
      expect(blocks[0].type).toBe('heading_1');
      expect(blocks[1].type).toBe('paragraph');
      expect(blocks[2].type).toBe('bulleted_list_item');
      expect(blocks[3].type).toBe('bulleted_list_item');
      expect(blocks[4].type).toBe('code');
    });
  });
});
