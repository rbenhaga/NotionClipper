/**
 * Tests complets de détection automatique
 * Basé sur le test ultimate exhaustif - Phase 1
 */

import { parseContent } from '../../src/parseContent';

describe('Content Detection - Phase 1', () => {
  describe('Automatic Content Type Detection', () => {
    it('should detect URLs with high confidence (>0.90)', async () => {
      const content = 'https://www.notion.so';
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      expect(result.metadata?.detectedType).toBe('url');
      expect(result.metadata?.confidence).toBeGreaterThan(0.90);
    });

    it('should detect JavaScript code with good confidence (>0.70)', async () => {
      const content = `function hello() {
  console.log("Hello World");
  return true;
}`;
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      
      expect(result.metadata?.detectedType).toBe('code');
      expect(result.metadata?.confidence).toBeGreaterThan(0.70);
    });

    it('should detect CSV format with good confidence (>0.70)', async () => {
      const content = `Name,Age,City
John,30,Paris
Jane,25,London`;
      const result = parseContent(content, { includeMetadata: true });
      
      expect(['csv', 'table']).toContain(result.metadata?.detectedType);
      expect(result.metadata?.confidence).toBeGreaterThan(0.70);
    });

    it('should detect TSV format with good confidence (>0.70)', async () => {
      const content = `Name\tAge\tCity
John\t30\tParis
Jane\t25\tLondon`;
      const result = parseContent(content, { includeMetadata: true });
      
      expect(['tsv', 'table']).toContain(result.metadata?.detectedType);
      expect(result.metadata?.confidence).toBeGreaterThan(0.70);
    });

    it('should detect HTML with moderate confidence (>0.50)', async () => {
      const content = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <p>Content with <strong>bold</strong></p>
</body>
</html>`;
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      
      expect(result.metadata?.detectedType).toBe('html');
      expect(result.metadata?.confidence).toBeGreaterThan(0.50);
    });

    it('should detect LaTeX with moderate confidence (>0.50)', async () => {
      const content = `$
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
$`;
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      
      expect(result.metadata?.detectedType).toBe('latex');
      expect(result.metadata?.confidence).toBeGreaterThan(0.50);
    });

    it('should detect JSON with good confidence (>0.70)', async () => {
      const content = `{
  "name": "John",
  "age": 30,
  "city": "Paris"
}`;
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      
      expect(result.metadata?.detectedType).toBe('json');
      expect(result.metadata?.confidence).toBeGreaterThan(0.70);
    });

    it('should detect Markdown with moderate confidence (>0.40)', async () => {
      const content = `# Title
**Bold** and *italic*
- List item`;
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      
      expect(result.metadata?.detectedType).toBe('markdown');
      expect(result.metadata?.confidence).toBeGreaterThan(0.40);
    });

    it('should fallback to text with perfect confidence (1.0)', async () => {
      const content = 'Just plain text without any special formatting';
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      
      expect(result.metadata?.detectedType).toBe('text');
      expect(result.metadata?.confidence).toBe(1.0);
    });
  });

  describe('Detection Priority Order', () => {
    it('should prioritize URL detection over other types', async () => {
      const content = 'https://github.com/user/repo.git';
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      
      expect(result.metadata?.detectedType).toBe('url');
    });

    it('should prioritize code detection over markdown for code-like content', async () => {
      const content = `class Example {
  constructor() {
    this.value = 42;
  }
}`;
      const result = parseContent(content, { includeMetadata: true });
      
      expect(result.success).toBe(true);
      
      expect(result.metadata?.detectedType).toBe('code');
    });
  });

  describe('Edge Cases in Detection', () => {
    it('should handle mixed content appropriately', async () => {
      const content = `# Markdown Title
But also has function() { code(); }
And https://example.com URLs`;
      
      const result = parseContent(content, { includeMetadata: true });
      
      // Should detect as markdown due to header
      expect(['markdown', 'text']).toContain(result.metadata?.detectedType);
    });

    it('should handle empty content gracefully', async () => {
      const result = parseContent('', { includeMetadata: true });
      
      expect(result.success).toBe(true);
      expect(result.success).toBe(true);
      expect(result.blocks).toEqual([]);
    });

    it('should handle whitespace-only content', async () => {
      const result = parseContent('   \n\t  \n  ', { includeMetadata: true });
      
      expect(result.success).toBe(true);
      expect(result.success).toBe(true);
      expect(result.blocks).toEqual([]);
    });
  });
});