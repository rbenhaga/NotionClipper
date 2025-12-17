/**
 * Roundtrip Tests - ClipperDoc <-> PlateValue
 * 
 * These tests verify that:
 * 1. ClipperDoc -> PlateValue preserves structure (not mono-bloc)
 * 2. PlateValue -> ClipperDoc preserves structure
 * 3. Roundtrip ClipperDoc -> Plate -> ClipperDoc is stable
 * 4. IDs are preserved
 */

import { describe, it, expect } from 'vitest';
import { clipperDocToPlate } from '../convert/clipperDocToPlate';
import { plateToClipperDoc } from '../convert/plateToClipperDoc';
import type { ClipperDocument, ClipperBlock, PlateValue } from '../types';
import { createClipperDocument } from '@notion-clipper/notion-parser';

// Helper to create a test ClipperDocument
function createTestDoc(blocks: ClipperBlock[]): ClipperDocument {
  const doc = createClipperDocument({
    title: 'Test Document',
    source: { type: 'clipboard' },
  });
  doc.content = blocks;
  return doc;
}

// Helper to create a paragraph block
function createParagraph(id: string, text: string, styles: Record<string, boolean> = {}): ClipperBlock {
  return {
    id,
    type: 'paragraph',
    content: [{ type: 'text', text, styles }],
    props: { textColor: 'default', backgroundColor: 'default' },
    children: [],
    _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
  };
}

// Helper to create a heading block
function createHeading(id: string, level: 1 | 2 | 3, text: string): ClipperBlock {
  return {
    id,
    type: `heading${level}` as 'heading1' | 'heading2' | 'heading3',
    content: [{ type: 'text', text, styles: {} }],
    props: { textColor: 'default', backgroundColor: 'default', level, isToggleable: false },
    children: [],
    _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
  };
}

// Helper to create a list item block
function createListItem(id: string, type: 'bulletList' | 'numberedList' | 'todoList', text: string, checked = false): ClipperBlock {
  return {
    id,
    type,
    content: [{ type: 'text', text, styles: {} }],
    props: { textColor: 'default', backgroundColor: 'default', ...(type === 'todoList' ? { checked } : {}) },
    children: [],
    _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
  };
}

describe('ClipperDoc -> PlateValue', () => {
  it('should convert empty document to single empty paragraph', () => {
    const doc = createTestDoc([]);
    const { value } = clipperDocToPlate(doc);
    
    expect(value).toHaveLength(1);
    expect(value[0].type).toBe('p');
    expect(value[0].children).toHaveLength(1);
    expect((value[0].children[0] as any).text).toBe('');
  });

  it('should preserve multiple paragraphs (NOT mono-bloc)', () => {
    const doc = createTestDoc([
      createParagraph('p1', 'First paragraph'),
      createParagraph('p2', 'Second paragraph'),
      createParagraph('p3', 'Third paragraph'),
    ]);
    
    const { value } = clipperDocToPlate(doc);
    
    expect(value).toHaveLength(3);
    expect(value[0].type).toBe('p');
    expect(value[1].type).toBe('p');
    expect(value[2].type).toBe('p');
  });

  it('should convert headings with correct types', () => {
    const doc = createTestDoc([
      createHeading('h1', 1, 'Heading 1'),
      createHeading('h2', 2, 'Heading 2'),
      createHeading('h3', 3, 'Heading 3'),
    ]);
    
    const { value } = clipperDocToPlate(doc);
    
    expect(value).toHaveLength(3);
    expect(value[0].type).toBe('h1');
    expect(value[1].type).toBe('h2');
    expect(value[2].type).toBe('h3');
  });

  it('should preserve inline styles (bold, italic, code)', () => {
    const doc = createTestDoc([
      createParagraph('p1', 'Bold text', { bold: true }),
      createParagraph('p2', 'Italic text', { italic: true }),
      createParagraph('p3', 'Code text', { code: true }),
    ]);
    
    const { value } = clipperDocToPlate(doc);
    
    expect(value).toHaveLength(3);
    expect((value[0].children[0] as any).bold).toBe(true);
    expect((value[1].children[0] as any).italic).toBe(true);
    expect((value[2].children[0] as any).code).toBe(true);
  });

  it('should convert lists correctly', () => {
    const doc = createTestDoc([
      createListItem('li1', 'bulletList', 'Bullet item'),
      createListItem('li2', 'numberedList', 'Numbered item'),
      createListItem('li3', 'todoList', 'Todo item', true),
    ]);
    
    const { value } = clipperDocToPlate(doc);
    
    expect(value).toHaveLength(3);
    expect(value[0].type).toBe('ul');
    expect(value[1].type).toBe('ol');
    expect(value[2].type).toBe('action_item');
  });

  it('should preserve block IDs in mapping', () => {
    const doc = createTestDoc([
      createParagraph('unique-id-1', 'First'),
      createParagraph('unique-id-2', 'Second'),
    ]);
    
    const { value, idMapping } = clipperDocToPlate(doc);
    
    expect(idMapping.clipperToPlate.get('unique-id-1')).toBe('unique-id-1');
    expect(idMapping.clipperToPlate.get('unique-id-2')).toBe('unique-id-2');
    expect(value[0].id).toBe('unique-id-1');
    expect(value[1].id).toBe('unique-id-2');
  });
});

describe('PlateValue -> ClipperDoc', () => {
  it('should convert plate value back to ClipperDoc', () => {
    const plateValue: PlateValue = [
      { id: 'p1', type: 'p', children: [{ text: 'Hello' }] },
      { id: 'p2', type: 'p', children: [{ text: 'World' }] },
    ];
    
    const { document } = plateToClipperDoc(plateValue, {});
    
    expect(document.content).toHaveLength(2);
    expect(document.content[0].type).toBe('paragraph');
    expect(document.content[1].type).toBe('paragraph');
  });

  it('should preserve IDs when converting back', () => {
    const plateValue: PlateValue = [
      { id: 'my-id-1', type: 'p', children: [{ text: 'First' }] },
      { id: 'my-id-2', type: 'h1', children: [{ text: 'Second' }] },
    ];
    
    const { document } = plateToClipperDoc(plateValue, {});
    
    expect(document.content[0].id).toBe('my-id-1');
    expect(document.content[1].id).toBe('my-id-2');
  });

  it('should convert heading types correctly', () => {
    const plateValue: PlateValue = [
      { id: 'h1', type: 'h1', children: [{ text: 'H1' }] },
      { id: 'h2', type: 'h2', children: [{ text: 'H2' }] },
      { id: 'h3', type: 'h3', children: [{ text: 'H3' }] },
    ];
    
    const { document } = plateToClipperDoc(plateValue, {});
    
    expect(document.content[0].type).toBe('heading1');
    expect(document.content[1].type).toBe('heading2');
    expect(document.content[2].type).toBe('heading3');
  });

  it('should preserve inline marks', () => {
    const plateValue: PlateValue = [
      { id: 'p1', type: 'p', children: [{ text: 'Bold', bold: true }] },
      { id: 'p2', type: 'p', children: [{ text: 'Italic', italic: true }] },
    ];
    
    const { document } = plateToClipperDoc(plateValue, {});
    
    expect(document.content[0].content?.[0]).toMatchObject({
      type: 'text',
      text: 'Bold',
      styles: { bold: true },
    });
    expect(document.content[1].content?.[0]).toMatchObject({
      type: 'text',
      text: 'Italic',
      styles: { italic: true },
    });
  });
});

describe('Roundtrip: ClipperDoc -> Plate -> ClipperDoc', () => {
  it('should preserve paragraph structure on roundtrip', () => {
    const original = createTestDoc([
      createParagraph('p1', 'First paragraph'),
      createParagraph('p2', 'Second paragraph'),
      createParagraph('p3', 'Third paragraph'),
    ]);
    
    const { value } = clipperDocToPlate(original);
    const { document: result } = plateToClipperDoc(value, {});
    
    expect(result.content).toHaveLength(3);
    expect(result.content[0].type).toBe('paragraph');
    expect(result.content[1].type).toBe('paragraph');
    expect(result.content[2].type).toBe('paragraph');
  });

  it('should preserve heading types on roundtrip', () => {
    const original = createTestDoc([
      createHeading('h1', 1, 'Title'),
      createHeading('h2', 2, 'Subtitle'),
      createHeading('h3', 3, 'Section'),
    ]);
    
    const { value } = clipperDocToPlate(original);
    const { document: result } = plateToClipperDoc(value, {});
    
    expect(result.content[0].type).toBe('heading1');
    expect(result.content[1].type).toBe('heading2');
    expect(result.content[2].type).toBe('heading3');
  });

  it('should preserve IDs on roundtrip', () => {
    const original = createTestDoc([
      createParagraph('stable-id-1', 'First'),
      createParagraph('stable-id-2', 'Second'),
    ]);
    
    const { value, idMapping } = clipperDocToPlate(original);
    const { document: result } = plateToClipperDoc(value, { idMapping });
    
    expect(result.content[0].id).toBe('stable-id-1');
    expect(result.content[1].id).toBe('stable-id-2');
  });

  it('should preserve text content on roundtrip', () => {
    const original = createTestDoc([
      createParagraph('p1', 'Hello World'),
      createHeading('h1', 1, 'My Title'),
    ]);
    
    const { value } = clipperDocToPlate(original);
    const { document: result } = plateToClipperDoc(value, {});
    
    expect(result.content[0].content?.[0]).toMatchObject({
      type: 'text',
      text: 'Hello World',
    });
    expect(result.content[1].content?.[0]).toMatchObject({
      type: 'text',
      text: 'My Title',
    });
  });

  it('should preserve inline styles on roundtrip', () => {
    const original = createTestDoc([
      createParagraph('p1', 'Bold text', { bold: true }),
      createParagraph('p2', 'Italic text', { italic: true }),
      createParagraph('p3', 'Code text', { code: true }),
    ]);
    
    const { value } = clipperDocToPlate(original);
    const { document: result } = plateToClipperDoc(value, {});
    
    expect(result.content[0].content?.[0]).toMatchObject({
      styles: { bold: true },
    });
    expect(result.content[1].content?.[0]).toMatchObject({
      styles: { italic: true },
    });
    expect(result.content[2].content?.[0]).toMatchObject({
      styles: { code: true },
    });
  });

  it('should NOT collapse multiple blocks into one (anti-mono-bloc)', () => {
    const original = createTestDoc([
      createParagraph('p1', 'Line 1'),
      createParagraph('p2', 'Line 2'),
      createParagraph('p3', 'Line 3'),
      createParagraph('p4', 'Line 4'),
      createParagraph('p5', 'Line 5'),
    ]);
    
    const { value } = clipperDocToPlate(original);
    const { document: result } = plateToClipperDoc(value, {});
    
    // CRITICAL: Must have 5 blocks, not 1
    expect(result.content.length).toBe(5);
    expect(result.content.length).not.toBe(1);
  });

  it('should handle mixed content types', () => {
    const original = createTestDoc([
      createHeading('h1', 1, 'Title'),
      createParagraph('p1', 'Introduction'),
      createListItem('li1', 'bulletList', 'Item 1'),
      createListItem('li2', 'bulletList', 'Item 2'),
      createParagraph('p2', 'Conclusion'),
    ]);
    
    const { value } = clipperDocToPlate(original);
    const { document: result } = plateToClipperDoc(value, {});
    
    expect(result.content).toHaveLength(5);
    expect(result.content[0].type).toBe('heading1');
    expect(result.content[1].type).toBe('paragraph');
    expect(result.content[2].type).toBe('bulletList');
    expect(result.content[3].type).toBe('bulletList');
    expect(result.content[4].type).toBe('paragraph');
  });
});

describe('Edge cases', () => {
  it('should handle empty text nodes', () => {
    const doc = createTestDoc([
      createParagraph('p1', ''),
    ]);
    
    const { value } = clipperDocToPlate(doc);
    
    expect(value).toHaveLength(1);
    expect(value[0].children).toHaveLength(1);
    expect((value[0].children[0] as any).text).toBe('');
  });

  it('should handle special characters', () => {
    const doc = createTestDoc([
      createParagraph('p1', 'Special: <>&"\''),
    ]);
    
    const { value } = clipperDocToPlate(doc);
    const { document: result } = plateToClipperDoc(value, {});
    
    expect(result.content[0].content?.[0]).toMatchObject({
      text: 'Special: <>&"\'',
    });
  });

  it('should handle unicode characters', () => {
    const doc = createTestDoc([
      createParagraph('p1', 'Unicode: 你好 🎉 émoji'),
    ]);
    
    const { value } = clipperDocToPlate(doc);
    const { document: result } = plateToClipperDoc(value, {});
    
    expect(result.content[0].content?.[0]).toMatchObject({
      text: 'Unicode: 你好 🎉 émoji',
    });
  });
});
