/**
 * Tests pour les convertisseurs BlockNote ↔ Notion
 * 
 * Ces tests vérifient le round-trip NON-LOSSY entre BlockNote et Notion
 * SANS passer par Markdown.
 */

import { notionToBlockNote, NotionToBlockNoteConverter } from '../converters/NotionToBlockNote';
import { blockNoteToNotion, BlockNoteToNotionConverter } from '../converters/BlockNoteToNotion';
import type { NotionBlock } from '../types/notion';

describe('NotionToBlockNote', () => {
  describe('Basic blocks', () => {
    it('should convert paragraph', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'Hello World' } }],
          color: 'default',
        },
      }];

      const { blocks, mapping } = notionToBlockNote(notionBlocks);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[0].content).toHaveLength(1);
      const firstContent = blocks[0].content![0];
      expect(firstContent.type).toBe('text');
      if (firstContent.type === 'text') {
        expect(firstContent.text).toBe('Hello World');
      }
    });

    it('should convert heading with level', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'My Heading' } }],
          color: 'default',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].type).toBe('heading');
      expect(blocks[0].props.level).toBe(2);
    });

    it('should convert toggle heading', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: 'Toggle Heading' } }],
          is_toggleable: true,
          color: 'default',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].props.isToggleable).toBe(true);
    });
  });


  describe('Rich text formatting', () => {
    it('should convert bold text', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Bold text' },
            annotations: { bold: true },
          }],
          color: 'default',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);
      const content = blocks[0].content![0];
      expect(content.type).toBe('text');
      if (content.type === 'text') {
        expect(content.styles?.bold).toBe(true);
      }
    });

    it('should convert multiple annotations', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Formatted' },
            annotations: { bold: true, italic: true, code: true },
          }],
          color: 'default',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);
      const content = blocks[0].content![0];
      expect(content.type).toBe('text');
      if (content.type === 'text') {
        expect(content.styles?.bold).toBe(true);
        expect(content.styles?.italic).toBe(true);
        expect(content.styles?.code).toBe(true);
      }
    });

    it('should convert links', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Click here', link: { url: 'https://example.com' } },
          }],
          color: 'default',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].content![0].type).toBe('link');
      expect((blocks[0].content![0] as any).href).toBe('https://example.com');
    });

    it('should convert colors', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Colored' },
            annotations: { color: 'red' },
          }],
          color: 'blue_background',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);
      const content = blocks[0].content![0];
      expect(content.type).toBe('text');
      if (content.type === 'text') {
        expect(content.styles?.textColor).toBe('red');
      }
      expect(blocks[0].props.backgroundColor).toBe('blue');
    });
  });

  describe('List items', () => {
    it('should convert bulleted list', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Item 1' } }],
          color: 'default',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].type).toBe('bulletListItem');
    });

    it('should convert numbered list', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Item 1' } }],
          color: 'default',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].type).toBe('numberedListItem');
    });

    it('should convert to-do with checked state', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'to_do',
        to_do: {
          rich_text: [{ type: 'text', text: { content: 'Task' } }],
          checked: true,
          color: 'default',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].type).toBe('checkListItem');
      expect(blocks[0].props.checked).toBe(true);
    });
  });

  describe('Special blocks', () => {
    it('should convert callout with icon', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'callout',
        callout: {
          rich_text: [{ type: 'text', text: { content: 'Note content' } }],
          icon: { type: 'emoji', emoji: '⚠️' },
          color: 'yellow_background',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].type).toBe('callout');
      expect(blocks[0].props.icon).toBe('⚠️');
    });

    it('should convert code block with language', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: 'const x = 1;' } }],
          language: 'typescript',
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].type).toBe('codeBlock');
      expect(blocks[0].props.language).toBe('typescript');
    });

    it('should convert image', () => {
      const notionBlocks: NotionBlock[] = [{
        type: 'image',
        image: {
          type: 'external',
          external: { url: 'https://example.com/image.png' },
          caption: [{ type: 'text', text: { content: 'My image' } }],
        },
      }];

      const { blocks } = notionToBlockNote(notionBlocks);

      expect(blocks[0].type).toBe('image');
      expect(blocks[0].props.url).toBe('https://example.com/image.png');
      expect(blocks[0].props.caption).toBe('My image');
    });
  });

  describe('Mapping', () => {
    it('should create mapping for each block', () => {
      const notionBlocks: NotionBlock[] = [
        { id: 'notion-1', type: 'paragraph', paragraph: { rich_text: [], color: 'default' } },
        { id: 'notion-2', type: 'paragraph', paragraph: { rich_text: [], color: 'default' } },
      ] as any;

      const { blocks, mapping } = notionToBlockNote(notionBlocks);

      expect(mapping).toHaveLength(2);
      expect(mapping[0].notionBlockId).toBe('notion-1');
      expect(mapping[0].blocknoteBlockId).toBe(blocks[0].id);
      expect(mapping[1].notionBlockId).toBe('notion-2');
    });
  });
});


describe('BlockNoteToNotion', () => {
  describe('Basic blocks', () => {
    it('should convert paragraph', () => {
      const blocknoteBlocks = [{
        id: 'bn-1',
        type: 'paragraph',
        props: { textColor: 'default', backgroundColor: 'default' },
        content: [{ type: 'text' as const, text: 'Hello World', styles: {} }],
        children: [],
      }];

      const notionBlocks = blockNoteToNotion(blocknoteBlocks);

      expect(notionBlocks).toHaveLength(1);
      expect(notionBlocks[0].type).toBe('paragraph');
      expect((notionBlocks[0] as any).paragraph.rich_text[0].text.content).toBe('Hello World');
    });

    it('should convert heading with level', () => {
      const blocknoteBlocks = [{
        id: 'bn-1',
        type: 'heading',
        props: { level: 2, textColor: 'default', backgroundColor: 'default' },
        content: [{ type: 'text' as const, text: 'My Heading', styles: {} }],
        children: [],
      }];

      const notionBlocks = blockNoteToNotion(blocknoteBlocks);

      expect(notionBlocks[0].type).toBe('heading_2');
    });
  });

  describe('Rich text formatting', () => {
    it('should convert bold text', () => {
      const blocknoteBlocks = [{
        id: 'bn-1',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text' as const, text: 'Bold', styles: { bold: true } }],
        children: [],
      }];

      const notionBlocks = blockNoteToNotion(blocknoteBlocks);
      const richText = (notionBlocks[0] as any).paragraph.rich_text[0];

      expect(richText.annotations.bold).toBe(true);
    });

    it('should convert links', () => {
      const blocknoteBlocks = [{
        id: 'bn-1',
        type: 'paragraph',
        props: {},
        content: [{
          type: 'link' as const,
          href: 'https://example.com',
          text: '',
          content: [{ type: 'text' as const, text: 'Click', styles: {} }],
        }],
        children: [],
      }];

      const notionBlocks = blockNoteToNotion(blocknoteBlocks);
      const richText = (notionBlocks[0] as any).paragraph.rich_text[0];

      expect(richText.text.link.url).toBe('https://example.com');
    });
  });

  describe('List items', () => {
    it('should convert bullet list item', () => {
      const blocknoteBlocks = [{
        id: 'bn-1',
        type: 'bulletListItem',
        props: {},
        content: [{ type: 'text' as const, text: 'Item', styles: {} }],
        children: [],
      }];

      const notionBlocks = blockNoteToNotion(blocknoteBlocks);

      expect(notionBlocks[0].type).toBe('bulleted_list_item');
    });

    it('should convert check list item with checked state', () => {
      const blocknoteBlocks = [{
        id: 'bn-1',
        type: 'checkListItem',
        props: { checked: true },
        content: [{ type: 'text' as const, text: 'Task', styles: {} }],
        children: [],
      }];

      const notionBlocks = blockNoteToNotion(blocknoteBlocks);

      expect(notionBlocks[0].type).toBe('to_do');
      expect((notionBlocks[0] as any).to_do.checked).toBe(true);
    });
  });

  describe('Special blocks', () => {
    it('should convert callout', () => {
      const blocknoteBlocks = [{
        id: 'bn-1',
        type: 'callout',
        props: { icon: '⚠️', backgroundColor: 'yellow' },
        content: [{ type: 'text' as const, text: 'Warning', styles: {} }],
        children: [],
      }];

      const notionBlocks = blockNoteToNotion(blocknoteBlocks);

      expect(notionBlocks[0].type).toBe('callout');
      expect((notionBlocks[0] as any).callout.icon.emoji).toBe('⚠️');
    });

    it('should convert code block', () => {
      const blocknoteBlocks = [{
        id: 'bn-1',
        type: 'codeBlock',
        props: { language: 'typescript' },
        content: [{ type: 'text' as const, text: 'const x = 1;', styles: {} }],
        children: [],
      }];

      const notionBlocks = blockNoteToNotion(blocknoteBlocks);

      expect(notionBlocks[0].type).toBe('code');
      expect((notionBlocks[0] as any).code.language).toBe('typescript');
    });
  });
});

describe('Round-trip (Non-lossy)', () => {
  it('should preserve paragraph content', () => {
    const original: NotionBlock[] = [{
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'Hello ' } },
          { type: 'text', text: { content: 'World' }, annotations: { bold: true } },
        ],
        color: 'default',
      },
    }];

    // Notion → BlockNote
    const { blocks } = notionToBlockNote(original);
    
    // BlockNote → Notion
    const reconstructed = blockNoteToNotion(blocks);

    expect(reconstructed[0].type).toBe('paragraph');
    expect((reconstructed[0] as any).paragraph.rich_text).toHaveLength(2);
    expect((reconstructed[0] as any).paragraph.rich_text[0].text.content).toBe('Hello ');
    expect((reconstructed[0] as any).paragraph.rich_text[1].text.content).toBe('World');
    expect((reconstructed[0] as any).paragraph.rich_text[1].annotations.bold).toBe(true);
  });

  it('should preserve heading level and toggleable state', () => {
    const original: NotionBlock[] = [{
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Toggle Heading' } }],
        is_toggleable: true,
        color: 'default',
      },
    }];

    const { blocks } = notionToBlockNote(original);
    const reconstructed = blockNoteToNotion(blocks);

    expect(reconstructed[0].type).toBe('heading_2');
    expect((reconstructed[0] as any).heading_2.is_toggleable).toBe(true);
  });

  it('should preserve callout icon and color', () => {
    const original: NotionBlock[] = [{
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: 'Important' } }],
        icon: { type: 'emoji', emoji: '🔥' },
        color: 'red_background',
      },
    }];

    const { blocks } = notionToBlockNote(original);
    const reconstructed = blockNoteToNotion(blocks);

    expect(reconstructed[0].type).toBe('callout');
    expect((reconstructed[0] as any).callout.icon.emoji).toBe('🔥');
  });

  it('should preserve to-do checked state', () => {
    const original: NotionBlock[] = [{
      type: 'to_do',
      to_do: {
        rich_text: [{ type: 'text', text: { content: 'Done task' } }],
        checked: true,
        color: 'default',
      },
    }];

    const { blocks } = notionToBlockNote(original);
    const reconstructed = blockNoteToNotion(blocks);

    expect((reconstructed[0] as any).to_do.checked).toBe(true);
  });
});
