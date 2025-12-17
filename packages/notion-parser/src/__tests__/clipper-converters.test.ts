/**
 * Tests pour les convertisseurs ClipperDoc
 * 
 * Vérifie le round-trip: Notion → ClipperDoc → BlockNote → ClipperDoc
 */
import { notionToClipper } from '../converters/NotionToClipper';
import { clipperToBlockNote } from '../converters/ClipperToBlockNote';
import { blockNoteToClipper } from '../converters/BlockNoteToClipper';
import type { ClipperDocument, ClipperBlock } from '../types/clipper';

// ============================================================================
// FIXTURES - Blocs Notion simulés
// ============================================================================

const createNotionParagraph = (text: string, id = 'block-1') => ({
  id,
  type: 'paragraph',
  paragraph: {
    rich_text: [{ type: 'text', text: { content: text }, plain_text: text }],
    color: 'default',
  },
});

const createNotionHeading = (text: string, level: 1 | 2 | 3, id = 'block-h') => ({
  id,
  type: `heading_${level}`,
  [`heading_${level}`]: {
    rich_text: [{ type: 'text', text: { content: text }, plain_text: text }],
    color: 'default',
    is_toggleable: false,
  },
});

const createNotionBulletList = (text: string, id = 'block-bullet') => ({
  id,
  type: 'bulleted_list_item',
  bulleted_list_item: {
    rich_text: [{ type: 'text', text: { content: text }, plain_text: text }],
    color: 'default',
  },
});

const createNotionTodo = (text: string, checked: boolean, id = 'block-todo') => ({
  id,
  type: 'to_do',
  to_do: {
    rich_text: [{ type: 'text', text: { content: text }, plain_text: text }],
    checked,
    color: 'default',
  },
});

const createNotionCode = (code: string, language: string, id = 'block-code') => ({
  id,
  type: 'code',
  code: {
    rich_text: [{ type: 'text', text: { content: code }, plain_text: code }],
    language,
  },
});

const createNotionCallout = (text: string, icon: string, id = 'block-callout') => ({
  id,
  type: 'callout',
  callout: {
    rich_text: [{ type: 'text', text: { content: text }, plain_text: text }],
    icon: { type: 'emoji', emoji: icon },
    color: 'gray_background',
  },
});

const createNotionWithFormatting = (id = 'block-formatted') => ({
  id,
  type: 'paragraph',
  paragraph: {
    rich_text: [
      { 
        type: 'text', 
        text: { content: 'Bold' }, 
        plain_text: 'Bold',
        annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
      },
      { 
        type: 'text', 
        text: { content: ' and ' }, 
        plain_text: ' and ',
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
      },
      { 
        type: 'text', 
        text: { content: 'italic' }, 
        plain_text: 'italic',
        annotations: { bold: false, italic: true, strikethrough: false, underline: false, code: false, color: 'default' }
      },
    ],
    color: 'default',
  },
});

// ============================================================================
// TESTS
// ============================================================================

describe('NotionToClipper', () => {
  it('should convert a simple paragraph', () => {
    const notionBlocks = [createNotionParagraph('Hello World')];
    const { document, warnings } = notionToClipper(notionBlocks);

    expect(document.schemaVersion).toBe('1.0');
    expect(document.content).toHaveLength(1);
    expect(document.content[0].type).toBe('paragraph');
    expect(document.content[0].content).toHaveLength(1);
    expect((document.content[0].content![0] as any).text).toBe('Hello World');
    expect(warnings).toHaveLength(0);
  });

  it('should convert headings with correct levels', () => {
    const notionBlocks = [
      createNotionHeading('H1', 1, 'h1'),
      createNotionHeading('H2', 2, 'h2'),
      createNotionHeading('H3', 3, 'h3'),
    ];
    const { document } = notionToClipper(notionBlocks);

    expect(document.content).toHaveLength(3);
    expect(document.content[0].type).toBe('heading1');
    expect(document.content[1].type).toBe('heading2');
    expect(document.content[2].type).toBe('heading3');
  });

  it('should convert bullet list items', () => {
    const notionBlocks = [
      createNotionBulletList('Item 1', 'b1'),
      createNotionBulletList('Item 2', 'b2'),
    ];
    const { document } = notionToClipper(notionBlocks);

    expect(document.content).toHaveLength(2);
    expect(document.content[0].type).toBe('bulletList');
    expect(document.content[1].type).toBe('bulletList');
  });

  it('should convert todo items with checked state', () => {
    const notionBlocks = [
      createNotionTodo('Unchecked', false, 't1'),
      createNotionTodo('Checked', true, 't2'),
    ];
    const { document } = notionToClipper(notionBlocks);

    expect(document.content).toHaveLength(2);
    expect(document.content[0].type).toBe('todoList');
    expect((document.content[0].props as any).checked).toBe(false);
    expect((document.content[1].props as any).checked).toBe(true);
  });

  it('should convert code blocks with language', () => {
    const notionBlocks = [createNotionCode('const x = 1;', 'javascript')];
    const { document } = notionToClipper(notionBlocks);

    expect(document.content[0].type).toBe('code');
    expect((document.content[0].props as any).language).toBe('javascript');
    expect((document.content[0].content![0] as any).text).toBe('const x = 1;');
  });

  it('should convert callouts with icon', () => {
    const notionBlocks = [createNotionCallout('Important note', '⚠️')];
    const { document } = notionToClipper(notionBlocks);

    expect(document.content[0].type).toBe('callout');
    expect((document.content[0].props as any).icon).toBe('⚠️');
  });

  it('should preserve text formatting', () => {
    const notionBlocks = [createNotionWithFormatting()];
    const { document } = notionToClipper(notionBlocks);

    const content = document.content[0].content!;
    expect(content).toHaveLength(3);
    expect((content[0] as any).styles.bold).toBe(true);
    expect((content[2] as any).styles.italic).toBe(true);
  });

  it('should create notion mapping', () => {
    const notionBlocks = [
      createNotionParagraph('Para 1', 'notion-id-1'),
      createNotionParagraph('Para 2', 'notion-id-2'),
    ];
    const { document } = notionToClipper(notionBlocks, { pageId: 'page-123' });

    expect(document.notionMapping.pageId).toBe('page-123');
    expect(document.notionMapping.blockMappings).toHaveLength(2);
    expect(document.notionMapping.blockMappings[0].notionBlockId).toBe('notion-id-1');
    expect(document.notionMapping.blockMappings[1].notionBlockId).toBe('notion-id-2');
  });

  it('should warn on unsupported blocks', () => {
    const notionBlocks = [
      { id: 'unsup-1', type: 'child_page', child_page: { title: 'Page' } },
    ];
    const { document, warnings } = notionToClipper(notionBlocks);

    expect(document.content[0].type).toBe('unsupported');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].severity).toBe('error');
  });
});

describe('ClipperToBlockNote', () => {
  it('should convert ClipperDoc to BlockNote blocks', () => {
    const notionBlocks = [createNotionParagraph('Test')];
    const { document } = notionToClipper(notionBlocks);
    const { blocks, idMapping } = clipperToBlockNote(document);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(idMapping.size).toBe(1);
  });

  it('should preserve heading levels', () => {
    const notionBlocks = [createNotionHeading('Title', 2)];
    const { document } = notionToClipper(notionBlocks);
    const { blocks } = clipperToBlockNote(document);

    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].props.level).toBe(2);
  });

  it('should convert todo checked state', () => {
    const notionBlocks = [createNotionTodo('Task', true)];
    const { document } = notionToClipper(notionBlocks);
    const { blocks } = clipperToBlockNote(document);

    expect(blocks[0].type).toBe('checkListItem');
    expect(blocks[0].props.checked).toBe(true);
  });
});

describe('BlockNoteToClipper', () => {
  it('should convert BlockNote blocks back to ClipperDoc', () => {
    const notionBlocks = [createNotionParagraph('Original')];
    const { document } = notionToClipper(notionBlocks);
    const { blocks, idMapping } = clipperToBlockNote(document);
    
    // Simuler une modification
    blocks[0].content = [{ type: 'text', text: 'Modified', styles: {} }];
    
    const { document: updatedDoc, modifiedBlockIds } = blockNoteToClipper(blocks, {
      existingDocument: document,
      idMapping,
    });

    expect(updatedDoc.content).toHaveLength(1);
    expect((updatedDoc.content[0].content![0] as any).text).toBe('Modified');
    expect(modifiedBlockIds.length).toBeGreaterThan(0);
  });

  it('should detect new blocks', () => {
    const notionBlocks = [createNotionParagraph('Original')];
    const { document } = notionToClipper(notionBlocks);
    const { blocks, idMapping } = clipperToBlockNote(document);
    
    // Ajouter un nouveau bloc
    blocks.push({
      id: 'new-block-id',
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text: 'New paragraph', styles: {} }],
      children: [],
    });
    
    const { document: updatedDoc, newBlockIds } = blockNoteToClipper(blocks, {
      existingDocument: document,
      idMapping,
    });

    expect(updatedDoc.content).toHaveLength(2);
    expect(newBlockIds.length).toBeGreaterThan(0);
  });

  it('should detect deleted blocks', () => {
    const notionBlocks = [
      createNotionParagraph('Para 1', 'p1'),
      createNotionParagraph('Para 2', 'p2'),
    ];
    const { document } = notionToClipper(notionBlocks);
    const { blocks, idMapping } = clipperToBlockNote(document);
    
    // Supprimer le premier bloc
    blocks.shift();
    
    const { document: updatedDoc, deletedBlockIds } = blockNoteToClipper(blocks, {
      existingDocument: document,
      idMapping,
    });

    expect(updatedDoc.content).toHaveLength(1);
    expect(deletedBlockIds.length).toBe(1);
  });
});

describe('Round-trip: Notion → Clipper → BlockNote → Clipper', () => {
  it('should preserve text content through round-trip', () => {
    const originalText = 'Hello World with special chars: éàü 中文 🎉';
    const notionBlocks = [createNotionParagraph(originalText)];
    
    // Notion → Clipper
    const { document: clipperDoc } = notionToClipper(notionBlocks);
    
    // Clipper → BlockNote
    const { blocks, idMapping } = clipperToBlockNote(clipperDoc);
    
    // BlockNote → Clipper
    const { document: finalDoc } = blockNoteToClipper(blocks, {
      existingDocument: clipperDoc,
      idMapping,
    });

    const finalText = (finalDoc.content[0].content![0] as any).text;
    expect(finalText).toBe(originalText);
  });

  it('should preserve formatting through round-trip', () => {
    const notionBlocks = [createNotionWithFormatting()];
    
    const { document: clipperDoc } = notionToClipper(notionBlocks);
    const { blocks, idMapping } = clipperToBlockNote(clipperDoc);
    const { document: finalDoc } = blockNoteToClipper(blocks, {
      existingDocument: clipperDoc,
      idMapping,
    });

    const content = finalDoc.content[0].content!;
    expect((content[0] as any).styles.bold).toBe(true);
    expect((content[2] as any).styles.italic).toBe(true);
  });

  it('should preserve block IDs through round-trip', () => {
    const notionBlocks = [createNotionParagraph('Test', 'notion-123')];
    
    const { document: clipperDoc } = notionToClipper(notionBlocks);
    const originalClipperId = clipperDoc.content[0].id;
    
    const { blocks, idMapping } = clipperToBlockNote(clipperDoc);
    const { document: finalDoc } = blockNoteToClipper(blocks, {
      existingDocument: clipperDoc,
      idMapping,
    });

    expect(finalDoc.content[0].id).toBe(originalClipperId);
    expect(finalDoc.content[0]._meta.notionBlockId).toBe('notion-123');
  });

  it('should preserve nested structure through round-trip', () => {
    const notionBlocks = [{
      id: 'toggle-1',
      type: 'toggle',
      toggle: {
        rich_text: [{ type: 'text', text: { content: 'Toggle' }, plain_text: 'Toggle' }],
        color: 'default',
      },
      children: [
        createNotionParagraph('Child 1', 'child-1'),
        createNotionParagraph('Child 2', 'child-2'),
      ],
    }];
    
    const { document: clipperDoc } = notionToClipper(notionBlocks);
    expect(clipperDoc.content[0].children).toHaveLength(2);
    
    const { blocks, idMapping } = clipperToBlockNote(clipperDoc);
    expect(blocks[0].children).toHaveLength(2);
    
    const { document: finalDoc } = blockNoteToClipper(blocks, {
      existingDocument: clipperDoc,
      idMapping,
    });
    
    expect(finalDoc.content[0].children).toHaveLength(2);
    expect((finalDoc.content[0].children[0].content![0] as any).text).toBe('Child 1');
  });
});

describe('Document Stats', () => {
  it('should compute correct stats', () => {
    const notionBlocks = [
      createNotionParagraph('Hello World'),
      createNotionParagraph('Another paragraph'),
    ];
    
    const { document } = notionToClipper(notionBlocks);
    
    expect(document.metadata.stats.blockCount).toBe(2);
    expect(document.metadata.stats.wordCount).toBe(4); // Hello, World, Another, paragraph
    expect(document.metadata.stats.characterCount).toBe(28); // "Hello World" + "Another paragraph"
  });
});
