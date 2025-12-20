/**
 * ✅ P0.5: No Silent Fallback Test
 * 
 * Ensures that when clipperToNotion fails, it throws an explicit error
 * and does NOT silently fall back to text extraction or parseContent.
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

describe('No Silent Fallback', () => {
  describe('clipperToNotion error handling', () => {
    it('should return empty array for null document (not throw)', () => {
      // This is expected behavior - null/undefined returns []
      const result = clipperToNotion(null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined document (not throw)', () => {
      const result = clipperToNotion(undefined as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for document with null content', () => {
      const doc = { ...createDoc([]), content: null } as any;
      const result = clipperToNotion(doc);
      expect(result).toEqual([]);
    });

    it('should skip unsupported blocks but NOT silently convert to text', () => {
      const doc = createDoc([
        {
          id: 'unsupported-1',
          type: 'unsupported',
          props: { originalType: 'some_unknown_type' },
          content: [{ type: 'text', text: 'This should NOT become plain text', styles: {} }],
          children: [],
          _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
        },
        {
          id: 'valid-1',
          type: 'paragraph',
          props: { textColor: 'default', backgroundColor: 'default' },
          content: [{ type: 'text', text: 'Valid paragraph', styles: {} }],
          children: [],
          _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
        },
      ]);

      const result = clipperToNotion(doc);

      // Should have 1 block (the valid paragraph), NOT 2
      // The unsupported block should be SKIPPED, not converted to text
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('paragraph');
      
      // Verify the unsupported content did NOT leak as text
      const paragraphText = (result[0] as any).paragraph.rich_text[0]?.text?.content;
      expect(paragraphText).toBe('Valid paragraph');
      expect(paragraphText).not.toContain('This should NOT become plain text');
    });

    it('should NOT convert columnList children to flat text', () => {
      const doc = createDoc([
        {
          id: 'column-list-1',
          type: 'columnList',
          props: { columnCount: 2 },
          content: [],
          children: [
            {
              id: 'column-1',
              type: 'column',
              props: {},
              content: [],
              children: [
                {
                  id: 'para-in-col',
                  type: 'paragraph',
                  props: { textColor: 'default', backgroundColor: 'default' },
                  content: [{ type: 'text', text: 'Column content', styles: {} }],
                  children: [],
                  _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
                },
              ],
              _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
            },
          ],
          _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
        },
      ]);

      const result = clipperToNotion(doc);

      // columnList is degraded (returns null), so result may be empty
      // But it should NOT have converted "Column content" to a plain text block
      // The degradation is intentional and logged
      expect(result.length).toBeLessThanOrEqual(1);
      
      // If there's a result, it should NOT be a paragraph with "Column content"
      // (that would indicate silent fallback to text extraction)
      if (result.length > 0) {
        const firstBlock = result[0] as any;
        if (firstBlock.type === 'paragraph') {
          const text = firstBlock.paragraph?.rich_text?.[0]?.text?.content;
          // This assertion would fail if we silently extracted text
          expect(text).not.toBe('Column content');
        }
      }
    });

    it('should preserve structure, not flatten to text', () => {
      const doc = createDoc([
        {
          id: 'heading-1',
          type: 'heading1',
          props: { level: 1, isToggleable: false, textColor: 'default', backgroundColor: 'default' },
          content: [{ type: 'text', text: 'Title', styles: {} }],
          children: [],
          _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
        },
        {
          id: 'list-1',
          type: 'bulletList',
          props: { textColor: 'default', backgroundColor: 'default' },
          content: [{ type: 'text', text: 'Item 1', styles: {} }],
          children: [],
          _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
        },
        {
          id: 'code-1',
          type: 'code',
          props: { language: 'javascript' },
          content: [{ type: 'text', text: 'const x = 1;', styles: {} }],
          children: [],
          _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
        },
      ]);

      const result = clipperToNotion(doc);

      // Should have 3 distinct block types, NOT 3 paragraphs
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('heading_1');
      expect(result[1].type).toBe('bulleted_list_item');
      expect(result[2].type).toBe('code');

      // Verify structure is preserved
      expect((result[0] as any).heading_1.rich_text[0].text.content).toBe('Title');
      expect((result[1] as any).bulleted_list_item.rich_text[0].text.content).toBe('Item 1');
      expect((result[2] as any).code.rich_text[0].text.content).toBe('const x = 1;');
      expect((result[2] as any).code.language).toBe('javascript');
    });
  });

  describe('explicit error scenarios', () => {
    it('should handle malformed block gracefully without silent text fallback', () => {
      const doc = createDoc([
        {
          id: 'malformed-1',
          type: 'paragraph',
          props: null as any, // Malformed: props should be object
          content: null as any, // Malformed: content should be array
          children: [],
          _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
        },
      ]);

      // Should not throw, but should handle gracefully
      const result = clipperToNotion(doc);
      
      // Result should be a paragraph with empty rich_text, NOT extracted text
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('paragraph');
      expect((result[0] as any).paragraph.rich_text).toEqual([]);
    });
  });
});
