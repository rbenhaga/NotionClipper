import { parseContent } from '../../../src/parseContent';
import type { ParseContentOptions } from '../../../src/parseContent';

// Types flexibles pour les tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TestBlock = {
  type: string;
  [key: string]: any;
};

describe('Content Parsing Integration', () => {
  describe('Basic Parsing', () => {
    it('should parse simple content successfully', () => {
      const content = 'Hello world';
      const result = parseContent(content);

      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('paragraph');
    });

    it('should handle empty content', () => {
      const result = parseContent('');

      expect(result.success).toBe(true);
      expect(result.blocks).toEqual([]);
    });

    it('should handle null content gracefully', () => {
      const result = parseContent(null as any);

      expect(result.success).toBe(true);
      expect(result.blocks).toEqual([]);
    });

    it('should handle undefined content gracefully', () => {
      const result = parseContent(undefined as any);

      expect(result.success).toBe(true);
      expect(result.blocks).toEqual([]);
    });
  });

  describe('Options Handling', () => {
    it('should merge options correctly', () => {
      const options: ParseContentOptions = {
        includeMetadata: true,
        includeValidation: true
      };

      const result = parseContent('test content', options);

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.validation).toBeDefined();
    });

    it('should include metadata when requested', () => {
      const result = parseContent('test', { includeMetadata: true });

      expect(result.metadata).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', () => {
      const malformedContent = '**unclosed bold *nested';
      const result = parseContent(malformedContent);

      expect(result.success).toBe(true);
      expect(result.blocks).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should include validation when requested', () => {
      const result = parseContent('test content', { includeValidation: true });

      expect(result.validation).toBeDefined();
    });

    it('should include basic validation by default', () => {
      const result = parseContent('test content');

      expect(result.validation).toBeDefined();
    });
  });

  describe('Metadata', () => {
    it('should include metadata when requested', () => {
      const result = parseContent('test content', { includeMetadata: true });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.detectedType).toBeDefined();
      expect(result.metadata?.blockCount).toBeGreaterThan(0);
      expect(result.metadata?.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should include basic metadata by default', () => {
      const result = parseContent('test content');

      expect(result.metadata).toBeDefined();
    });
  });
});