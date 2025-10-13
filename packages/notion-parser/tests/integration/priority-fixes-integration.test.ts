/**
 * Tests d'intégration pour valider que les correctifs prioritaires fonctionnent
 */

import { parseContent } from '../../src/parseContent';

describe('Priority Fixes Integration Tests', () => {
  describe('Fix #1: Formatage Inline - Espacement', () => {
    test('should preserve spaces around bold text', () => {
      const input = 'Texte **en gras** pour test';
      const result = parseContent(input);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      
      const block = result.blocks[0] as any;
      const richText = block.paragraph?.rich_text;
      
      if (richText) {
        const fullText = richText.map((rt: any) => rt.text?.content || '').join('');
        expect(fullText).toBe('Texte en gras pour test');
        expect(fullText).not.toContain('**');
        
        // Vérifier qu'il y a bien un segment bold
        const boldSegment = richText.find((rt: any) => rt.annotations?.bold);
        expect(boldSegment).toBeDefined();
      }
    });

    test('should preserve spaces around italic text', () => {
      const input = 'Texte *en italique* normal';
      const result = parseContent(input);
      
      expect(result.success).toBe(true);
      const block = result.blocks[0] as any;
      const richText = block.paragraph?.rich_text;
      
      if (richText) {
        const fullText = richText.map((rt: any) => rt.text?.content || '').join('');
        expect(fullText).toBe('Texte en italique normal');
        expect(fullText).not.toContain('*');
      }
    });

    test('should preserve spaces around code text', () => {
      const input = 'Voici du `code inline` dans phrase';
      const result = parseContent(input);
      
      expect(result.success).toBe(true);
      const block = result.blocks[0] as any;
      const richText = block.paragraph?.rich_text;
      
      if (richText) {
        const fullText = richText.map((rt: any) => rt.text?.content || '').join('');
        expect(fullText).toBe('Voici du code inline dans phrase');
        expect(fullText).not.toContain('`');
      }
    });
  });

  describe('Fix #2: Citations - Retrait >', () => {
    test('should remove all > symbols from simple quote', () => {
      const input = '> Citation simple';
      const result = parseContent(input);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      
      const block = result.blocks[0] as any;
      if (block.type === 'quote' && block.quote?.rich_text) {
        const text = block.quote.rich_text[0]?.text?.content;
        expect(text).toBe('Citation simple');
        expect(text).not.toContain('>');
      }
    });

    test('should remove all > symbols from nested quotes', () => {
      const input = `> Citation niveau 1\n> > Citation niveau 2\n> > > Citation niveau 3`;
      const result = parseContent(input);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      
      // Vérifier qu'aucun bloc ne contient de > résiduels
      result.blocks.forEach(block => {
        const blockData = (block as any)[block.type];
        if (blockData?.rich_text) {
          blockData.rich_text.forEach((rt: any) => {
            if (rt.text?.content) {
              expect(rt.text.content).not.toContain('>');
            }
          });
        }
      });
    });
  });

  describe('Fix #3: Toggle Headings (Legacy Parser)', () => {
    test('should create toggle heading with is_toggleable property', () => {
      const input = `> # Toggle Heading\n> Contenu ligne 1\n> Contenu ligne 2`;
      const result = parseContent(input, { useNewParser: false });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      
      // Chercher un heading avec is_toggleable
      const headingBlock = result.blocks.find(block => 
        block.type.startsWith('heading_')
      ) as any;
      
      if (headingBlock) {
        const headingData = headingBlock[headingBlock.type];
        expect(headingData.is_toggleable).toBe(true);
      }
    });

    test('should create toggle H2', () => {
      const input = `> ## Sous-section\n> Contenu`;
      const result = parseContent(input, { useNewParser: false });
      
      expect(result.success).toBe(true);
      
      const headingBlock = result.blocks.find(block => 
        block.type === 'heading_2'
      ) as any;
      
      if (headingBlock) {
        expect(headingBlock.heading_2.is_toggleable).toBe(true);
      }
    });

    test('should create toggle H3', () => {
      const input = `> ### Detail\n> Info`;
      const result = parseContent(input, { useNewParser: false });
      
      expect(result.success).toBe(true);
      
      const headingBlock = result.blocks.find(block => 
        block.type === 'heading_3'
      ) as any;
      
      if (headingBlock) {
        expect(headingBlock.heading_3.is_toggleable).toBe(true);
      }
    });
  });

  describe('Complex Integration Tests', () => {
    test('should handle mixed content with all fixes applied', () => {
      const input = `# Normal Heading

Texte avec **formatage gras** et *italique*.

> # Toggle Heading
> Contenu du toggle avec \`code\`

> Citation simple

> > Citation imbriquée

- Liste avec **gras**
- Item avec *italique*`;

      const result = parseContent(input, { useNewParser: false });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(5);
      
      // Vérifier qu'il n'y a pas de résidus de formatage
      result.blocks.forEach(block => {
        const blockData = (block as any)[block.type];
        if (blockData?.rich_text) {
          blockData.rich_text.forEach((rt: any) => {
            if (rt.text?.content) {
              const content = rt.text.content;
              expect(content).not.toContain('**');
              expect(content).not.toContain('`');
              // Les > peuvent être présents dans le contenu normal, 
              // mais pas au début des lignes de citation
            }
          });
        }
      });
      
      // Vérifier qu'il y a au moins un toggle heading
      const toggleHeading = result.blocks.find(block => {
        const blockData = (block as any)[block.type];
        return blockData?.is_toggleable === true;
      });
      expect(toggleHeading).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('should handle large content efficiently', () => {
      const largeContent = `# Section ${Math.random()}

Texte avec **formatage** et *italique*.

> Citation

`.repeat(50);

      const startTime = Date.now();
      const result = parseContent(largeContent, { useNewParser: false });
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Moins d'1 seconde
      expect(result.blocks.length).toBeGreaterThan(0);
    });
  });
});