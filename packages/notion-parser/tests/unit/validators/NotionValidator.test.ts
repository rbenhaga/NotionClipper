/**
 * Tests unitaires pour NotionValidator - Cahier des Charges v2.1
 * Couvre la validation exhaustive des blocs Notion
 */

import { parseContent } from '../../../src/parseContent';

describe('NotionValidator - Cahier des Charges v2.1', () => {
  describe('Block Structure Validation', () => {
    it('should validate valid paragraph block', () => {
      const result = parseContent('Valid content');

      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('paragraph');
    });

    it('should validate heading blocks', () => {
      const result = parseContent('# Heading');

      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('heading_1');
    });
  });

  describe('Rich Text Validation', () => {
    it('should validate rich text structure', () => {
      const result = parseContent('**Bold text**');

      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('paragraph');
    });
  });

  describe('URL Validation', () => {
    it('should validate valid URLs', () => {
      const result = parseContent('[Link](https://example.com)');

      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
    });
  });

  describe('Performance and Large Data', () => {
    it('should validate large number of blocks efficiently', () => {
      const manyParagraphs = Array(100).fill('Paragraph content').join('\n\n');

      const startTime = Date.now();
      const result = parseContent(manyParagraphs);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Integration with parseContent', () => {
    it('should validate parsed content', () => {
      const content = '# Heading\n\nThis is a paragraph with **bold** text.';
      const result = parseContent(content);

      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });
  });
});