/**
 * Tests unitaires pour MarkdownParser - Cahier des Charges v2.1
 * Couvre le parsing Markdown complet avec toutes les extensions
 */

import { parseContent } from '../../../src/parseContent';

describe('MarkdownParser - Cahier des Charges v2.1', () => {
  describe('Basic Markdown Parsing', () => {
    it('should parse headers', () => {
      const markdown = '# Header 1\n## Header 2\n### Header 3';
      const result = parseContent(markdown);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should parse paragraphs with formatting', () => {
      const markdown = 'This is **bold** and *italic* text.';
      const result = parseContent(markdown);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('paragraph');
    });

    it('should parse lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const result = parseContent(markdown);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should parse code blocks', () => {
      const markdown = '```javascript\nconst test = "hello";\n```';
      const result = parseContent(markdown);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('code');
    });

    it('should parse blockquotes', () => {
      const markdown = '> This is a quote';
      const result = parseContent(markdown);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('quote');
    });
  });

  describe('Advanced Markdown Features', () => {
    it('should parse tables', () => {
      const markdown = '| Name | Age |\n|------|-----|\n| John | 30  |';
      const result = parseContent(markdown);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should parse links', () => {
      const markdown = '[Link text](https://example.com)';
      const result = parseContent(markdown);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('paragraph');
    });

    it('should parse images', () => {
      const markdown = '![Alt text](https://example.com/image.jpg)';
      const result = parseContent(markdown);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should parse large markdown efficiently', () => {
      const largeMarkdown = Array(100).fill('# Header\n\nParagraph content.').join('\n\n');
      
      const startTime = Date.now();
      const result = parseContent(largeMarkdown);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000);
    });
  });
});