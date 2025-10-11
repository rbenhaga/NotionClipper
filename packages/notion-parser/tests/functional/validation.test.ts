/**
 * Tests de validation Notion API - CDC §6
 */

import { NotionValidator } from '../../src/validators/NotionValidator';

describe('4. Validation Notion API', () => {
  const validator = new NotionValidator();

  test('Validation structure des blocs', () => {
    const validBlock = {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ 
          type: 'text',
          text: { content: 'Valid' }
        }],
        color: 'default'
      }
    };

    const result = validator.validate([validBlock]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('Détection erreurs de structure', () => {
    const invalidBlocks = [
      // Texte trop long
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [{ 
            type: 'text',
            text: { content: 'a'.repeat(2001) }
          }]
        }
      },
      // Table trop large
      {
        type: 'table',
        table: { table_width: 10 }
      }
    ];

    invalidBlocks.forEach(block => {
      const result = validator.validate([block], { 
        validateRichText: true,
        strictMode: true 
      });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  test('Validation tous les types de blocs', () => {
    const blockTypes = [
      'paragraph', 'heading_1', 'heading_2', 'heading_3',
      'bulleted_list_item', 'numbered_list_item', 'to_do',
      'code', 'quote', 'callout', 'divider',
      'table', 'image', 'video', 'audio', 'file', 'pdf',
      'bookmark', 'equation', 'toggle'
    ];

    blockTypes.forEach(type => {
      const block = { type };
      const result = validator.validate([block]);
      // Ne doit pas crasher
      expect(result).toBeDefined();
    });
  });
});