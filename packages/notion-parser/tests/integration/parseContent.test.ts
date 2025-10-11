/**
 * Tests d'intégration pour parseContent
 * Tests end-to-end du flux complet de parsing
 */

import { parseContent } from '../../src/parseContent';

describe('parseContent Integration Tests', () => {
  describe('End-to-End Parsing Flow', () => {
    it('should parse markdown document completely', () => {
      const markdown = `# Main Title

This is a paragraph with **bold** and *italic* text.

## Subsection

- List item 1
- List item 2 with [link](https://example.com)
- List item 3

### Code Example

\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\`

> This is a blockquote

| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
| Jane | 25  | LA   |
`;
      
      const result = parseContent(markdown, {
        contentType: 'markdown',
        includeMetadata: true
      });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toBeDefined();
      expect(result.blocks.length).toBeGreaterThan(5);
      expect(result.metadata?.detectedType).toBe('markdown');
      
      // Vérifier les types de blocs
      const blockTypes = result.blocks.map(b => b.type);
      expect(blockTypes).toContain('heading_1');
      expect(blockTypes).toContain('heading_2');
      expect(blockTypes).toContain('heading_3');
      expect(blockTypes).toContain('paragraph');
      expect(blockTypes).toContain('bulleted_list_item');
      expect(blockTypes).toContain('code');
      expect(blockTypes).toContain('quote');
      expect(blockTypes).toContain('table');
    });

    it('should handle CSV data with headers', () => {
      const csv = `Name,Age,City,Country
John,30,Paris,France
Jane,25,London,UK
Bob,35,Berlin,Germany`;
      
      const result = parseContent(csv, {
        contentType: 'csv',
        includeMetadata: true
      });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('table');
      expect(result.metadata?.detectedType).toBe('csv');
    });

    it('should detect and parse code automatically', () => {
      const code = `function complexFunction(param1, param2) {
  const result = param1 + param2;
  console.log(\`Result: \${result}\`);
  return result;
}

// Usage
const value = complexFunction(10, 20);`;
      
      const result = parseContent(code, {
        includeMetadata: true
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata?.detectedType).toBe('code');
      expect(result.blocks[0].type).toBe('code');
    });

    it('should handle mixed content with auto-detection', () => {
      const mixedContent = `# Documentation

Here's some code:

\`\`\`python
def hello():
    print("Hello World")
\`\`\`

And here's a table:

| Feature | Status |
|---------|--------|
| Parser  | ✅ Done |
| Tests   | 🔄 WIP |`;
      
      const result = parseContent(mixedContent);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(3);
      
      const blockTypes = result.blocks.map(b => b.type);
      expect(blockTypes).toContain('heading_1');
      expect(blockTypes).toContain('paragraph');
      expect(blockTypes).toContain('code');
      expect(blockTypes).toContain('table');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed content gracefully', () => {
      const malformed = `# Unclosed header
**Unclosed bold
[Unclosed link(https://example.com
| Malformed | table
|-----------|
| Missing | cell`;
      
      const result = parseContent(malformed, {
        errorHandling: { onError: 'return' }
      });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toBeDefined();
    });

    it('should handle empty and null inputs', () => {
      const emptyResult = parseContent('');
      expect(emptyResult.success).toBe(true);
      expect(emptyResult.blocks).toEqual([]);
      
      const nullResult = parseContent(null as any);
      expect(nullResult.success).toBe(true);
      expect(nullResult.blocks).toEqual([]);
      
      const undefinedResult = parseContent(undefined as any);
      expect(undefinedResult.success).toBe(true);
      expect(undefinedResult.blocks).toEqual([]);
    });
  });

  describe('Options Integration', () => {
    it('should respect all parsing options together', () => {
      const content = `# Test Document

This has **formatting** and [links](https://example.com).

\`\`\`javascript
console.log("code");
\`\`\``;
      
      const result = parseContent(content, {
        contentType: 'markdown',
        includeMetadata: true,
        includeValidation: true,
        conversion: {
          preserveFormatting: true,
          convertLinks: true,
          convertCode: true
        },
        detection: {
          enableCodeDetection: true,
          enableMarkdownDetection: true
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.blocks.length).toBeGreaterThan(2);
    });
  });

  describe('Performance Integration', () => {
    it('should handle large content efficiently', () => {
      const largeContent = Array(100).fill(`# Section
Content with **formatting** and [links](https://example.com).

- List item 1
- List item 2

\`\`\`javascript
function test() { return true; }
\`\`\``).join('\n\n');
      
      const startTime = Date.now();
      const result = parseContent(largeContent, {
        contentType: 'markdown'
      });
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(100);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});