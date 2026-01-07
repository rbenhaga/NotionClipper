/**
 * Tests pour les convertisseurs ClipperDoc
 * 
 * Vérifie la conversion: Notion → ClipperDoc
 */
import { notionToClipper } from '../converters/NotionToClipper';

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
