/**
 * Round-trip tests for ClipperDoc ↔ Plate converters
 * 
 * These tests verify that:
 * 1. ClipperDoc → Plate → ClipperDoc produces equivalent structure
 * 2. All supported block types are correctly converted
 * 3. Inline styles (bold, italic, code, links) are preserved
 */

import { clipperDocToPlate } from '../convert/clipperDocToPlate';
import { plateToClipperDoc } from '../convert/plateToClipperDoc';
import type { ClipperDocument, ClipperBlock } from '../types';

// Helper to create a minimal ClipperDocument
function createDoc(content: ClipperBlock[]): ClipperDocument {
  return {
    id: 'test-doc',
    version: '1.0',
    metadata: {
      title: 'Test Document',
      createdAt: '2026-01-06T00:00:00Z',
      updatedAt: '2026-01-06T00:00:00Z',
      source: { type: 'clipboard' },
    },
    content,
  };
}

// Helper to create a block with defaults
function block(
  type: ClipperBlock['type'],
  content: ClipperBlock['content'],
  props: Partial<ClipperBlock['props']> = {}
): ClipperBlock {
  return {
    id: `block-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content,
    props: { textColor: 'default', backgroundColor: 'default', ...props },
    children: [],
    _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
  };
}

describe('ClipperDoc ↔ Plate Round-trip', () => {
  describe('Basic block types', () => {
    it('paragraph with plain text', () => {
      const original = createDoc([
        block('paragraph', [{ type: 'text', text: 'Hello world', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value, { title: 'Test' });

      expect(document.content).toHaveLength(1);
      expect(document.content[0].type).toBe('paragraph');
      expect(document.content[0].content[0]).toMatchObject({
        type: 'text',
        text: 'Hello world',
      });
    });

    it('heading1', () => {
      const original = createDoc([
        block('heading1', [{ type: 'text', text: 'Title', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('heading1');
      expect(document.content[0].content[0]).toMatchObject({ text: 'Title' });
    });

    it('heading2', () => {
      const original = createDoc([
        block('heading2', [{ type: 'text', text: 'Subtitle', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('heading2');
    });

    it('heading3', () => {
      const original = createDoc([
        block('heading3', [{ type: 'text', text: 'Section', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('heading3');
    });

    it('bulletList', () => {
      const original = createDoc([
        block('bulletList', [{ type: 'text', text: 'Item 1', styles: {} }]),
        block('bulletList', [{ type: 'text', text: 'Item 2', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content).toHaveLength(2);
      expect(document.content[0].type).toBe('bulletList');
      expect(document.content[1].type).toBe('bulletList');
    });

    it('numberedList', () => {
      const original = createDoc([
        block('numberedList', [{ type: 'text', text: 'Step 1', styles: {} }]),
        block('numberedList', [{ type: 'text', text: 'Step 2', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('numberedList');
      expect(document.content[1].type).toBe('numberedList');
    });

    it('todoList with checked state', () => {
      const original = createDoc([
        block('todoList', [{ type: 'text', text: 'Done task', styles: {} }], { checked: true }),
        block('todoList', [{ type: 'text', text: 'Pending task', styles: {} }], { checked: false }),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('todoList');
      expect(document.content[0].props?.checked).toBe(true);
      expect(document.content[1].props?.checked).toBe(false);
    });

    it('quote', () => {
      const original = createDoc([
        block('quote', [{ type: 'text', text: 'Famous quote', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('quote');
    });

    it('divider', () => {
      const original = createDoc([
        block('divider', []),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('divider');
    });

    it('code block with language', () => {
      const original = createDoc([
        block('code', [{ type: 'text', text: 'const x = 1;', styles: {} }], { language: 'typescript' }),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('code');
      expect(document.content[0].props?.language).toBe('typescript');
    });

    it('callout with icon', () => {
      const original = createDoc([
        block('callout', [{ type: 'text', text: 'Important note', styles: {} }], { icon: '⚠️' }),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('callout');
      expect(document.content[0].props?.icon).toBe('⚠️');
    });

    it('image with url', () => {
      const original = createDoc([
        block('image', [], { url: 'https://example.com/image.png' }),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('image');
      expect(document.content[0].props?.url).toBe('https://example.com/image.png');
    });
  });

  describe('Inline styles', () => {
    it('bold text', () => {
      const original = createDoc([
        block('paragraph', [
          { type: 'text', text: 'normal ', styles: {} },
          { type: 'text', text: 'bold', styles: { bold: true } },
          { type: 'text', text: ' normal', styles: {} },
        ]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      const content = document.content[0].content;
      expect(content).toHaveLength(3);
      expect(content[1].styles?.bold).toBe(true);
    });

    it('italic text', () => {
      const original = createDoc([
        block('paragraph', [
          { type: 'text', text: 'emphasis', styles: { italic: true } },
        ]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].content[0].styles?.italic).toBe(true);
    });

    it('code inline', () => {
      const original = createDoc([
        block('paragraph', [
          { type: 'text', text: 'variable', styles: { code: true } },
        ]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].content[0].styles?.code).toBe(true);
    });

    it('combined styles (bold + italic)', () => {
      const original = createDoc([
        block('paragraph', [
          { type: 'text', text: 'important', styles: { bold: true, italic: true } },
        ]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      const styles = document.content[0].content[0].styles;
      expect(styles?.bold).toBe(true);
      expect(styles?.italic).toBe(true);
    });
  });

  describe('Complex documents', () => {
    it('mixed content document', () => {
      const original = createDoc([
        block('heading1', [{ type: 'text', text: 'Document Title', styles: {} }]),
        block('paragraph', [{ type: 'text', text: 'Introduction paragraph.', styles: {} }]),
        block('heading2', [{ type: 'text', text: 'Section 1', styles: {} }]),
        block('bulletList', [{ type: 'text', text: 'Point A', styles: {} }]),
        block('bulletList', [{ type: 'text', text: 'Point B', styles: {} }]),
        block('divider', []),
        block('quote', [{ type: 'text', text: 'A wise quote', styles: { italic: true } }]),
        block('callout', [{ type: 'text', text: 'Note to self', styles: {} }], { icon: '📝' }),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content).toHaveLength(8);
      expect(document.content.map(b => b.type)).toEqual([
        'heading1',
        'paragraph',
        'heading2',
        'bulletList',
        'bulletList',
        'divider',
        'quote',
        'callout',
      ]);
    });

    it('preserves block order', () => {
      const types: ClipperBlock['type'][] = [
        'paragraph', 'heading1', 'heading2', 'heading3',
        'bulletList', 'numberedList', 'todoList',
        'quote', 'callout', 'divider',
      ];

      const original = createDoc(
        types.map(type => block(type, [{ type: 'text', text: `Block: ${type}`, styles: {} }]))
      );

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content.map(b => b.type)).toEqual(types);
    });
  });

  describe('Edge cases', () => {
    it('empty document', () => {
      const original = createDoc([]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      // Should have at least one empty paragraph
      expect(document.content.length).toBeGreaterThanOrEqual(1);
    });

    it('empty paragraph', () => {
      const original = createDoc([
        block('paragraph', [{ type: 'text', text: '', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].type).toBe('paragraph');
    });

    it('paragraph with only whitespace', () => {
      const original = createDoc([
        block('paragraph', [{ type: 'text', text: '   ', styles: {} }]),
      ]);

      const { value } = clipperDocToPlate(original);
      const { document } = plateToClipperDoc(value);

      expect(document.content[0].content[0].text).toBe('   ');
    });
  });
});
