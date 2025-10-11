/**
 * Tests de formatage et optimisation - CDC §5
 */

import { BlockFormatter } from '../../src/formatters/BlockFormatter';

describe('3. Formatage et optimisation', () => {
  const formatter = new BlockFormatter();

  test('Suppression blocs vides', () => {
    const blocks = [
      { type: 'paragraph', paragraph: { rich_text: [] } },
      { type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'Keep' } }] } }
    ] as any[];

    const result = formatter.format(blocks, { removeEmptyBlocks: true });
    expect(result).toHaveLength(1);
    const block = result[0] as any;
    expect(block.paragraph.rich_text[0].text.content).toBe('Keep');
  });

  test('Normalisation espaces', () => {
    const blocks = [{
      type: 'paragraph',
      paragraph: { 
        rich_text: [{ type: 'text', text: { content: '  Multiple   spaces  ' } }]
      }
    }] as any[];

    const result = formatter.format(blocks, { normalizeWhitespace: true });
    const block = result[0] as any;
    expect(block.paragraph.rich_text[0].text.content).toBe('Multiple spaces');
  });

  test('Application couleur', () => {
    const blocks = [
      { type: 'paragraph', paragraph: { rich_text: [], color: 'default' } },
      { type: 'heading_1', heading_1: { rich_text: [], color: 'default' } }
    ] as any[];

    const result = formatter.format(blocks, { 
      color: 'blue',
      applyColorToAll: true 
    });
    
    const block1 = result[0] as any;
    const block2 = result[1] as any;
    expect(block1.paragraph.color).toBe('blue');
    expect(block2.heading_1.color).toBe('blue');
  });

  test('Limites Notion respectées', () => {
    const blocks = [
      // Texte trop long
      {
        type: 'paragraph',
        paragraph: { 
          rich_text: [{ type: 'text', text: { content: 'a'.repeat(3000) } }]
        }
      },
      // Table trop large
      {
        type: 'table',
        table: { table_width: 10, children: [] }
      }
    ] as any[];

    const result = formatter.format(blocks, { enforceBlockLimits: true });
    
    // Texte limité à 2000
    const block1 = result[0] as any;
    const text = block1.paragraph.rich_text[0].text.content;
    expect(text.length).toBeLessThanOrEqual(2000);
    
    // Table limitée à 5 colonnes
    const block2 = result[1] as any;
    expect(block2.table.table_width).toBeLessThanOrEqual(5);
  });
});