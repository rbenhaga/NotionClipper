import { 
  parseContent, 
  ModernParser, 
  RichTextBuilder, 
  ContentValidator,
  FEATURES,
  VERSION 
} from '../../src/index';

/**
 * Tests de validation de la nouvelle architecture
 * ✅ Vérification que tous les modules sont correctement exportés et fonctionnels
 */
describe('Architecture Validation', () => {
  describe('Exports and Imports', () => {
    test('All main exports are available', () => {
      expect(parseContent).toBeDefined();
      expect(ModernParser).toBeDefined();
      expect(RichTextBuilder).toBeDefined();
      expect(ContentValidator).toBeDefined();
      expect(FEATURES).toBeDefined();
      expect(VERSION).toBeDefined();
    });

    test('Feature flags are correctly set', () => {
      expect(FEATURES.MODERN_PARSER).toBe(true);
      expect(FEATURES.LEXER_TOKENIZATION).toBe(true);
      expect(FEATURES.RICH_TEXT_BUILDER).toBe(true);
      expect(FEATURES.CONTENT_VALIDATION).toBe(true);
      expect(FEATURES.PATCH_1_SPACING).toBe(true);
      expect(FEATURES.PATCH_2_QUOTES).toBe(true);
      expect(FEATURES.PATCH_3_TOGGLE_HEADINGS).toBe(true);
    });

    test('Version is set correctly', () => {
      expect(VERSION).toBe('2.0.0-modern');
    });
  });

  describe('Modern Parser Integration', () => {
    test('Can instantiate ModernParser', () => {
      const parser = new ModernParser();
      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    });

    test('Can parse simple content', () => {
      const parser = new ModernParser();
      const result = parser.parse('Hello **world**');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('Can get parsing stats', () => {
      const parser = new ModernParser();
      const stats = parser.getStats('Hello **world**');
      
      expect(stats).toBeDefined();
      expect(stats.lexer).toBeDefined();
      expect(stats.parsing).toBeDefined();
      expect(typeof stats.lexer.totalTokens).toBe('number');
      expect(typeof stats.parsing.totalNodes).toBe('number');
    });
  });

  describe('RichTextBuilder Integration', () => {
    test('Can create simple text', () => {
      const richText = RichTextBuilder.text('Hello world');
      
      expect(Array.isArray(richText)).toBe(true);
      expect(richText.length).toBe(1);
      expect(richText[0].type).toBe('text');
      expect(richText[0].text?.content).toBe('Hello world');
    });

    test('Can create formatted text', () => {
      const richText = RichTextBuilder.formatted('Bold text', { bold: true });
      
      expect(richText[0].annotations?.bold).toBe(true);
    });

    test('Can parse markdown', () => {
      const richText = RichTextBuilder.fromMarkdown('**Bold** text');
      
      expect(richText.length).toBeGreaterThan(1);
      const boldSegment = richText.find(rt => rt.annotations?.bold);
      expect(boldSegment).toBeDefined();
    });

    test('Builder pattern works', () => {
      const builder = new RichTextBuilder();
      const richText = builder
        .addText('Normal ')
        .addFormattedText('bold', { bold: true })
        .build();
      
      expect(richText.length).toBe(2);
      expect(richText[1].annotations?.bold).toBe(true);
    });
  });

  describe('ContentValidator Integration', () => {
    test('Can validate simple node', () => {
      const node = {
        type: 'paragraph',
        content: 'Hello world',
        metadata: {},
        children: []
      };
      
      const result = ContentValidator.validate(node);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('Can detect validation errors', () => {
      const invalidNode = {
        type: '', // Invalid empty type
        content: 'Hello world',
        metadata: {},
        children: []
      };
      
      const result = ContentValidator.validate(invalidNode);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('Can sanitize content', () => {
      const node = {
        type: 'paragraph',
        content: 'A'.repeat(3000), // Too long
        metadata: {},
        children: []
      };
      
      const sanitized = ContentValidator.sanitize(node);
      
      expect(sanitized.content?.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('parseContent Integration', () => {
    test('Can parse with modern parser', () => {
      const result = parseContent('Hello **world**', { useModernParser: true });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toBeDefined();
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    test('Can parse with legacy parser', () => {
      const result = parseContent('Hello **world**', { useModernParser: false });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toBeDefined();
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    test('Returns metadata', () => {
      const result = parseContent('Hello **world**', { useModernParser: true });
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.originalLength).toBe('Hello **world**'.length);
      expect(result.metadata?.blockCount).toBeGreaterThan(0);
      expect(typeof result.metadata?.processingTime).toBe('number');
    });
  });

  describe('End-to-End Workflow', () => {
    test('Complete parsing workflow', () => {
      const content = `
# Heading

This is a paragraph with **bold** and *italic* text.

> This is a quote

- List item 1
- List item 2

\`\`\`javascript
console.log('Hello world');
\`\`\`
      `.trim();

      const result = parseContent(content, { useModernParser: true });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(3);
      
      // Vérifier les types de blocs
      const blockTypes = result.blocks.map(b => b.type);
      expect(blockTypes).toContain('heading_1');
      expect(blockTypes).toContain('paragraph');
      expect(blockTypes).toContain('quote');
      expect(blockTypes).toContain('bulleted_list_item');
      expect(blockTypes).toContain('code');
    });

    test('Error handling', () => {
      const result = parseContent(null as any, { useModernParser: true });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.blocks).toHaveLength(0);
    });

    test('Empty content handling', () => {
      const result = parseContent('', { useModernParser: true });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(0);
    });
  });

  describe('Performance Validation', () => {
    test('Parsing performance is acceptable', () => {
      const largeContent = Array(100).fill('**Bold** *italic* `code`').join('\n');
      
      const startTime = Date.now();
      const result = parseContent(largeContent, { useModernParser: true });
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Moins d'1 seconde
    });

    test('Memory usage is reasonable', () => {
      const content = Array(50).fill('# Heading\n\nParagraph with **formatting**').join('\n\n');
      
      const result = parseContent(content, { useModernParser: true });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      // Le test passe s'il n'y a pas d'erreur de mémoire
    });
  });
});