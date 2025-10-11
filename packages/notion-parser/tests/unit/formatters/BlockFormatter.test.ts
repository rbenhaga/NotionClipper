/**
 * Tests unitaires pour BlockFormatter - Cahier des Charges v2.1
 * Couvre le formatage et l'optimisation des blocs Notion
 */

import { BlockFormatter } from '../../../src/formatters/BlockFormatter';
import type { NotionBlock } from '../../../src/types';

describe('BlockFormatter - Cahier des Charges v2.1', () => {
  let formatter: BlockFormatter;

  beforeEach(() => {
    formatter = new BlockFormatter();
  });

  describe('Empty Block Removal', () => {
    it('should remove empty paragraph blocks', () => {
      const blocks: NotionBlock[] = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: []
          }
        } as any,
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Valid content' },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: 'Valid content',
                href: null
              }
            ]
          }
        } as any
      ];

      const result = formatter.format(blocks, { removeEmptyBlocks: true });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('paragraph');
    });

    it('should remove empty heading blocks', () => {
      const blocks: NotionBlock[] = [
        {
          type: 'heading_1',
          heading_1: {
            rich_text: []
          }
        } as any,
        {
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Valid heading' },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: 'Valid heading',
                href: null
              }
            ]
          }
        } as any
      ];

      const result = formatter.format(blocks, { removeEmptyBlocks: true });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading_2');
    });

    it('should keep non-text blocks even if empty', () => {
      const blocks: NotionBlock[] = [
        {
          type: 'divider',
          divider: {}
        } as any,
        {
          type: 'image',
          image: {
            type: 'external',
            external: { url: 'https://example.com/image.jpg' }
          }
        } as any
      ];

      const result = formatter.format(blocks, { removeEmptyBlocks: true });

      expect(result).toHaveLength(2);
    });
  });

  describe('Whitespace Normalization', () => {
    it('should normalize whitespace in rich text', () => {
      const blocks: NotionBlock[] = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: '  Multiple   spaces   here  ' },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: '  Multiple   spaces   here  ',
                href: null
              }
            ]
          }
        } as any
      ];

      const result = formatter.format(blocks, { normalizeWhitespace: true });

      expect(result).toHaveLength(1);
      const richText = (result[0] as any).paragraph.rich_text[0];
      expect(richText.text.content).toBe('Multiple spaces here');
    });

    it('should preserve code block whitespace', () => {
      const blocks: NotionBlock[] = [
        {
          type: 'code',
          code: {
            rich_text: [
              {
                type: 'text',
                text: { content: '  function test() {\n    return true;\n  }' },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: '  function test() {\n    return true;\n  }',
                href: null
              }
            ],
            language: 'javascript'
          }
        } as any
      ];

      const result = formatter.format(blocks, { normalizeWhitespace: true });

      expect(result).toHaveLength(1);
      const richText = (result[0] as any).code.rich_text[0];
      // Code whitespace should be preserved
      expect(richText.text.content).toContain('  function');
    });
  });

  describe('Color Application', () => {
    it('should apply color to all blocks when requested', () => {
      const blocks: NotionBlock[] = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Test content' },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: 'Test content',
                href: null
              }
            ],
            color: 'default'
          }
        } as any,
        {
          type: 'heading_1',
          heading_1: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Heading' },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: 'Heading',
                href: null
              }
            ],
            color: 'default'
          }
        } as any
      ];

      const result = formatter.format(blocks, { 
        color: 'blue',
        applyColorToAll: true 
      });

      expect(result).toHaveLength(2);
      expect((result[0] as any).paragraph.color).toBe('blue');
      expect((result[1] as any).heading_1.color).toBe('blue');
    });
  });

  describe('Block Limits Enforcement', () => {
    it('should enforce Notion block limits', () => {
      const longContent = 'a'.repeat(3000); // Exceeds 2000 char limit
      
      const blocks: NotionBlock[] = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: longContent },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: longContent,
                href: null
              }
            ]
          }
        } as any
      ];

      const result = formatter.format(blocks, { enforceBlockLimits: true });

      expect(result).toHaveLength(1);
      const richText = (result[0] as any).paragraph.rich_text[0];
      expect(richText.text.content.length).toBeLessThanOrEqual(2000);
    });

    it('should limit table width to 5 columns', () => {
      const wideTable: NotionBlock = {
        type: 'table',
        table: {
          table_width: 8,
          children: []
        }
      } as any;

      const result = formatter.format([wideTable], { enforceBlockLimits: true });

      expect(result).toHaveLength(1);
      expect((result[0] as any).table.table_width).toBeLessThanOrEqual(5);
    });
  });

  describe('Structure Optimization', () => {
    it('should optimize nested block structure', () => {
      const blocks: NotionBlock[] = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Content' },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: 'Content',
                href: null
              }
            ]
          }
        } as any
      ];

      const result = formatter.format(blocks, { optimizeStructure: true });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('paragraph');
    });

    it('should handle deeply nested blocks', () => {
      const deeplyNested: NotionBlock = {
        type: 'toggle',
        toggle: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Toggle' },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default'
              },
              plain_text: 'Toggle',
              href: null
            }
          ]
        },
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: 'Nested content' },
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: 'default'
                  },
                  plain_text: 'Nested content',
                  href: null
                }
              ]
            }
          } as any
        ]
      } as any;

      const result = formatter.format([deeplyNested], { 
        optimizeStructure: true,
        maxBlockDepth: 3 
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('toggle');
    });
  });

  describe('Rich Text Trimming', () => {
    it('should trim rich text content', () => {
      const blocks: NotionBlock[] = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: '  Trimmed content  ' },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                },
                plain_text: '  Trimmed content  ',
                href: null
              }
            ]
          }
        } as any
      ];

      const result = formatter.format(blocks, { trimRichText: true });

      expect(result).toHaveLength(1);
      const richText = (result[0] as any).paragraph.rich_text[0];
      expect(richText.text.content).toBe('Trimmed content');
      expect(richText.plain_text).toBe('Trimmed content');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of blocks efficiently', () => {
      const manyBlocks = Array(1000).fill(0).map((_, i) => ({
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: `Paragraph ${i}` },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default'
              },
              plain_text: `Paragraph ${i}`,
              href: null
            }
          ]
        }
      })) as NotionBlock[];

      const startTime = Date.now();
      const result = formatter.format(manyBlocks, { 
        removeEmptyBlocks: true,
        normalizeWhitespace: true 
      });
      const duration = Date.now() - startTime;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle empty input', () => {
      const result = formatter.format([], { removeEmptyBlocks: true });
      expect(result).toEqual([]);
    });

    it('should handle null/undefined blocks gracefully', () => {
      const blocks = [null, undefined] as any;
      const result = formatter.format(blocks, { removeEmptyBlocks: true });
      expect(result).toEqual([]);
    });
  });
});